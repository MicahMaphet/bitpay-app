import {Wallet} from '../../wallet.models';
import {FormatAmountStr} from '../amount/amount';
import {BwcProvider} from '../../../../lib/bwc';
import uniqBy from 'lodash.uniqby';
import {IsZceCompatible} from '../../utils/wallet';
import {
  DEFAULT_RBF_SEQ_NUMBER,
  SAFE_CONFIRMATIONS,
  SOFT_CONFIRMATION_LIMIT,
} from '../../../../constants/wallet';
import {GetChain, IsUtxoCoin} from '../../utils/currency';
import {ToAddress, ToCashAddress, ToLtcAddress} from '../address/address';
import {Effect} from '../../../index';
import {
  setUpdateTransactionHistoryStatus,
  updateTransactionHistory,
} from '../../wallet.actions';
import {IsDateInCurrentMonth, WithinSameMonth} from '../../utils/time';
import moment from 'moment';

const BWC = BwcProvider.getInstance();

const Errors = BWC.getErrors();

const FIRST_LIMIT = 5;
const LIMIT = 100;

// Ratio low amount warning (fee/amount) in incoming TX
const LOW_AMOUNT_RATIO: number = 0.15;

interface TransactionsHistoryInterface {
  limitTx?: string;
  lowAmount?: number;
  force?: boolean;
}

const GetStoredTransactionHistory = (wallet: Wallet) => {
  let _transactionHistory: any[] = [];

  const {transactionHistory} = wallet;
  if (!transactionHistory?.length) {
    return _transactionHistory;
  }

  _transactionHistory = transactionHistory.filter(txs => txs);
  return _transactionHistory;
};

const FixTransactionsUnit = (
  currencyAbbreviation: string,
  txs: any[],
): any[] => {
  if (!txs?.length || !txs[0].amountStr) {
    return [];
  }

  const cacheCoin: string = txs[0].amountStr.split(' ')[1];

  if (cacheCoin == 'bits') {
    console.debug('Fixing Tx Cache Unit to: ' + currencyAbbreviation);
    txs.forEach(tx => {
      tx.amountStr = FormatAmountStr(currencyAbbreviation, tx.amount);
      tx.feeStr = FormatAmountStr(currencyAbbreviation, tx.fees);
    });
  }

  return txs;
};

const RemoveEscrowReclaimTransactions = (wallet: Wallet, txs: any[]): any[] => {
  if (!IsZceCompatible(wallet)) {
    return txs;
  }

  return txs.filter(tx => {
    if (tx.action !== 'moved') {
      return true;
    }
    const sendTxAtSameTimeAsMove = txs.find(
      tx2 => tx2.action === 'sent' && Math.abs(tx.time - tx2.time) < 100,
    );
    return !sendTxAtSameTimeAsMove;
  });
};

const RemoveAndMarkSoftConfirmedTx = (txs: any[]): any[] => {
  return txs.filter((tx: any) => {
    if (tx.confirmations >= SOFT_CONFIRMATION_LIMIT) {
      return tx;
    }
    tx.recent = true;
  });
};

const GetCoinsForTx = (wallet: Wallet, txId: string): Promise<any> => {
  const {
    credentials: {coin, network},
  } = wallet;
  return new Promise((resolve, reject) => {
    wallet.getCoinsForTx(
      {
        coin,
        network,
        txId,
      },
      (err: Error, response: any) => {
        if (err) {
          return reject(err);
        }
        return resolve(response);
      },
    );
  });
};

const ProcessTx = (currencyAbbreviation: string, tx: any) => {
  if (!tx || tx.action == 'invalid') {
    return tx;
  }

  // New transaction output format. Fill tx.amount and tx.toAmount for
  // backward compatibility.
  if (tx.outputs?.length) {
    const outputsNr = tx.outputs.length;

    if (tx.action != 'received') {
      if (outputsNr > 1) {
        tx.recipientCount = outputsNr;
        tx.hasMultiplesOutputs = true;
      }
      tx.amount = tx.outputs.reduce((total: number, o: any) => {
        o.amountStr = FormatAmountStr(currencyAbbreviation, o.amount);
        //TODO: get Alternative amount str
        // o.alternativeAmountStr = FormatAlternativeStr(o.amount, currencyAbbreviation);
        return total + o.amount;
      }, 0);
    }
    tx.toAddress = tx.outputs[0].toAddress;

    // translate legacy addresses
    if (tx.addressTo && currencyAbbreviation == 'ltc') {
      for (let o of tx.outputs) {
        o.address = o.addressToShow = ToLtcAddress(tx.addressTo);
      }
    }

    if (tx.toAddress) {
      tx.toAddress = ToAddress(tx.toAddress, currencyAbbreviation);
    }
  }

  // Old tx format. Fill .output, for forward compatibility
  if (!tx.outputs) {
    tx.outputs = [
      {
        address: tx.toAddress,
        amount: tx.amount,
      },
    ];
  }

  tx.amountStr = FormatAmountStr(currencyAbbreviation, tx.amount);
  //TODO: alternative amount str
  // tx.alternativeAmountStr = FormatAlternativeStr(tx.amount, currencyAbbreviation);

  const chain = GetChain(currencyAbbreviation).toLowerCase();

  tx.feeStr = tx.fee
    ? FormatAmountStr(chain, tx.fee)
    : tx.fees
    ? FormatAmountStr(chain, tx.fees)
    : 'N/A';

  if (tx.amountStr) {
    tx.amountValueStr = tx.amountStr.split(' ')[0];
    tx.amountUnitStr = tx.amountStr.split(' ')[1];
  }

  if (tx.size && (tx.fee || tx.fees) && tx.amountUnitStr) {
    tx.feeRate = `${((tx.fee || tx.fees) / tx.size).toFixed(0)} sat/byte`;
  }

  if (tx.addressTo) {
    tx.addressTo = ToAddress(tx.addressTo, currencyAbbreviation);
  }

  return tx;
};

const ProcessNewTxs = async (wallet: Wallet, txs: any[]): Promise<any> => {
  const now = Math.floor(Date.now() / 1000);
  const txHistoryUnique: any = {};
  const ret = [];
  const {currencyAbbreviation} = wallet;

  for (let tx of txs) {
    tx = ProcessTx(currencyAbbreviation, tx);

    // no future transactions...
    if (tx.time > now) {
      tx.time = now;
    }

    if (tx.confirmations === 0 && currencyAbbreviation === 'btc') {
      const {inputs} = await GetCoinsForTx(wallet, tx.txid);
      tx.isRBF = inputs.some(
        (input: any) =>
          input.sequenceNumber &&
          input.sequenceNumber < DEFAULT_RBF_SEQ_NUMBER - 1,
      );
      tx.hasUnconfirmedInputs = inputs.some(
        (input: any) => input.mintHeight < 0,
      );
    }

    if (tx.confirmations >= SAFE_CONFIRMATIONS) {
      tx.safeConfirmed = SAFE_CONFIRMATIONS + '+';
    } else {
      tx.safeConfirmed = false;
    }

    if (tx.note) {
      delete tx.note.encryptedEditedByName;
      delete tx.note.encryptedBody;
    }

    if (!txHistoryUnique[tx.txid]) {
      ret.push(tx);
      txHistoryUnique[tx.txid] = true;
    } else {
      // this.logger.debug('Ignoring duplicate TX in history: ' + tx.txid);
    }
  }
  return Promise.resolve(ret);
};

// Approx utxo amount, from which the uxto is economically redeemable
const GetLowAmount = (wallet: Wallet): Promise<any> => {
  return new Promise((resolve, reject) => {
    //TODO: Get min fee rates
    resolve(1);
  });
};

const GetNewTransactions = (
  newTxs: any[],
  skip: number,
  wallet: Wallet,
  requestLimit: number,
  lastTransactionId: string,
  tries: number = 0,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    GetTransactionHistoryFromServer(
      wallet,
      skip,
      lastTransactionId,
      requestLimit,
    )
      .then(async result => {
        const {transactions, loadMore = false} = result;

        const _transactions = transactions.filter(txs => txs);
        const _newTxs = await ProcessNewTxs(wallet, _transactions);
        newTxs = newTxs.concat(_newTxs);
        skip = skip + requestLimit;

        console.debug(
          `Syncing TXs for: ${wallet.id}. Got: ${newTxs.length} Skip: ${skip} lastTransactionId: ${lastTransactionId} Continue: ${loadMore}`,
        );

        if (!loadMore) {
          console.debug(
            'Finished Sync: New / soft confirmed Txs: ' + newTxs.length,
          );
          return resolve(newTxs);
        }

        requestLimit = LIMIT;
        return GetNewTransactions(
          newTxs,
          skip,
          wallet,
          requestLimit,
          lastTransactionId,
        ).then(txs => {
          resolve(txs);
        });
      })
      .catch(err => {
        if (
          err instanceof Errors.CONNECTION_ERROR ||
          (err.message && err.message.match(/5../))
        ) {
          if (tries > 1) {
            return reject(err);
          }

          return setTimeout(() => {
            return resolve(
              GetNewTransactions(
                newTxs,
                skip,
                wallet,
                requestLimit,
                lastTransactionId,
                ++tries,
              ),
            );
          }, 2000 + 3000 * tries);
        } else {
          return reject(err);
        }
      });
  });
};

const UpdateLowAmount = (
  transactions: any[] = [],
  opts: TransactionsHistoryInterface = {},
) => {
  if (!opts.lowAmount) {
    return;
  }

  transactions.forEach(tx => {
    // @ts-ignore
    tx.lowAmount = tx.amount < opts.lowAmount;
  });

  return transactions;
};

const UpdateNotes = (
  wallet: Wallet,
  transactions: any[] = [],
  lastTransactionTime: any,
): Promise<any> => {
  return new Promise((res, rej) => {
    if (!lastTransactionTime) {
      return res(transactions);
    }

    wallet.getTxNotes(
      {
        minTs: lastTransactionTime,
      },
      (err: Error, notes: any) => {
        if (err) {
          console.warn('Could not get TxNotes: ', err);
          return rej(err);
        }

        notes.forEach((note: any) => {
          transactions.forEach((tx: any) => {
            if (tx.txid == note.txid) {
              tx.note = note;
            }
          });
        });
        return res(transactions);
      },
    );
  });
};

// export const GetTransactionsHistory =

const IsHistoryCached = (wallet: Wallet): boolean => {
  return !!wallet.transactionHistory && !!wallet.isTransactionHistoryValid;
};

export const UpdateTransactionsHistory =
  ({
    wallet,
    opts = {},
  }: {
    wallet: Wallet;
    opts?: TransactionsHistoryInterface;
  }): Effect =>
  async (dispatch, getState): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      let requestLimit = FIRST_LIMIT;
      const {walletId, coin} = wallet.credentials;

      if (!walletId || !wallet.isComplete()) {
        resolve([]);
      }

      if (wallet.transactionHistoryOnProgress) {
        console.debug(
          '!! History update already on progress for: ' + wallet.id,
        );
        return reject('HISTORY_IN_PROGRESS');
      }

      if (IsHistoryCached(wallet) && !opts.force) {
        console.debug('Returning cached history for ' + wallet.id);
        return resolve(wallet.transactionHistory);
      }

      console.debug(
        'Updating Transaction History for ' + wallet.credentials.walletName,
      );

      let storedTransactionHistory: any[] = GetStoredTransactionHistory(wallet);
      storedTransactionHistory = FixTransactionsUnit(
        coin,
        storedTransactionHistory,
      );
      const nonEscrowReclaimTxs = RemoveEscrowReclaimTransactions(
        wallet,
        storedTransactionHistory,
      );
      const confirmedTxs = RemoveAndMarkSoftConfirmedTx(nonEscrowReclaimTxs);
      const lastTransactionId = confirmedTxs[0] ? confirmedTxs[0].txid : null;
      const lastTransactionTime = confirmedTxs[0] ? confirmedTxs[0].time : null;

      dispatch(setUpdateTransactionHistoryStatus({wallet, status: true}));

      try {
        let transactions = await GetNewTransactions(
          [],
          0,
          wallet,
          requestLimit,
          lastTransactionId,
        );

        if (IsUtxoCoin(coin)) {
          const _lowAmount = await GetLowAmount(wallet);
          opts.lowAmount = _lowAmount;
          transactions = UpdateLowAmount(transactions, opts);
        }

        const array = transactions
          .concat(confirmedTxs)
          .filter((txs: any) => txs);
        const newHistory = uniqBy(array, x => {
          return (x as any).txid;
        });

        transactions = await UpdateNotes(
          wallet,
          newHistory,
          lastTransactionTime,
        );
        transactions.forEach((txs: any) => {
          txs.recent = true;
        });

        // Update Store
        if (walletId == wallet.credentials.walletId) {
          dispatch(
            updateTransactionHistory({
              wallet: wallet,
              transactions: newHistory,
            }),
          );

          console.debug(
            `Transaction History sync & saved for ${wallet.id} TransactionLength: ${newHistory.length}`,
          );
        }

        resolve(newHistory);
      } catch (err) {
        console.warn(
          '!! Could not update transaction history for ',
          wallet.id,
          err,
        );
        dispatch(setUpdateTransactionHistoryStatus({wallet, status: false}));
        return reject(err);
      }
    });
  };

export const GetTransactionHistoryFromServer = (
  wallet: Wallet,
  skip: number,
  lastTransactionId: string | null,
  limit: number,
): Promise<{transactions: any[]; loadMore: boolean}> => {
  return new Promise((resolve, reject) => {
    let transactions: any[] = [];
    const result = {
      transactions,
      loadMore: transactions.length >= limit,
    };

    const {token, multisigEthInfo} = wallet.credentials;
    wallet.getTxHistory(
      {
        skip,
        limit,
        tokenAddress: token ? token.address : '',
        multisigContractAddress: multisigEthInfo
          ? multisigEthInfo.multisigContractAddress
          : '',
      },
      (err: Error, _transactions: any) => {
        if (err) {
          return reject(err);
        }

        if (!_transactions?.length) {
          resolve(result);
        }

        _transactions.some((tx: any) => {
          if (tx.txid !== lastTransactionId) {
            transactions.push(tx);
          }
          return tx.txid === lastTransactionId;
        });

        result.transactions = transactions;
        result.loadMore = transactions.length >= limit;

        return resolve(result);
      },
    );
  });
};

const IsFirstInGroup = (index: number, history: any[]) => {
  if (index === 0) {
    return true;
  }
  const curTx = history[index];
  const prevTx = history[index - 1];
  return !WithinSameMonth(curTx.time * 1000, prevTx.time * 1000);
};

export const GroupTransactionHistory = (history: any[]) => {
  let groups = history.reduce((groups, tx, txInd) => {
    IsFirstInGroup(txInd, history)
      ? groups.push([tx])
      : groups[groups.length - 1].push(tx);
    return groups;
  }, []);

  groups = groups.map((group: any[]) => {
    const time = group[0].time * 1000;
    const title = IsDateInCurrentMonth(time)
      ? 'Recent'
      : moment(time).format('MMMM');
    return {title, data: group};
  });

  return groups;
};
