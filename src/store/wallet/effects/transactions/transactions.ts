import {Wallet} from '../../wallet.models';
import {FormatAmountStr} from '../amount/amount';
import {BwcProvider} from '../../../../lib/bwc';
import uniqBy from 'lodash.uniqby';
import {
  DEFAULT_RBF_SEQ_NUMBER,
  SAFE_CONFIRMATIONS,
} from '../../../../constants/wallet';
import {GetChain, IsCustomERCToken, IsUtxoCoin} from '../../utils/currency';
import {ToAddress, ToLtcAddress} from '../address/address';
import {
  IsDateInCurrentMonth,
  WithinPastDay,
  WithinSameMonth,
} from '../../utils/time';
import moment from 'moment';
import {TransactionIcons} from '../../../../constants/TransactionIcons';

const BWC = BwcProvider.getInstance();
const Errors = BWC.getErrors();

const LIMIT = 15;

interface TransactionsHistoryInterface {
  limitTx?: string;
  lowAmount?: number;
  force?: boolean;
}

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
  if (!tx || tx.action === 'invalid') {
    return tx;
  }

  // New transaction output format. Fill tx.amount and tx.toAmount for
  // backward compatibility.
  if (tx.outputs?.length) {
    const outputsNr = tx.outputs.length;

    if (tx.action !== 'received') {
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
    if (tx.addressTo && currencyAbbreviation === 'ltc') {
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
      console.log('Ignoring duplicate TX in history: ' + tx.txid);
    }
  }
  return Promise.resolve(ret);
};

// Approx utxo amount, from which the uxto is economically redeemable
const GetLowAmount = (wallet: Wallet): Promise<any> => {
  return new Promise((resolve, reject) => {
    //TODO: Get min fee rates. used in transaction details
    resolve(1);
  });
};

const GetNewTransactions = (
  newTxs: any[],
  skip: number,
  wallet: Wallet,
  requestLimit: number,
  lastTransactionId: string | null,
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

        let _transactions = transactions.filter(txs => txs);
        const _newTxs = await ProcessNewTxs(wallet, _transactions);
        newTxs = newTxs.concat(_newTxs);
        skip = skip + requestLimit;

        console.log(
          `Merging TXs for: ${wallet.id}. Got: ${newTxs.length} Skip: ${skip} lastTransactionId: ${lastTransactionId} Load more: ${loadMore}`,
        );

        return resolve({
          transactions: newTxs,
          loadMore,
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
          return resolve(result);
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
  return history
    .reduce((groups, tx, txInd) => {
      IsFirstInGroup(txInd, history)
        ? groups.push([tx])
        : groups[groups.length - 1].push(tx);
      return groups;
    }, [])
    .map((group: any[]) => {
      const time = group[0].time * 1000;
      const title = IsDateInCurrentMonth(time)
        ? 'Recent'
        : moment(time).format('MMMM');
      return {title, data: group};
    });
};

export const GetTransactionHistory = ({
  wallet,
  transactionsHistory = [],
  limit = LIMIT,
  opts = {},
  contactsList = [],
}: {
  wallet: Wallet;
  transactionsHistory: any[];
  limit: number;
  opts?: TransactionsHistoryInterface;
  contactsList?: any[];
}): Promise<{transactions: any[]; loadMore: boolean}> => {
  return new Promise(async (resolve, reject) => {
    let requestLimit = limit;

    const {walletId, coin} = wallet.credentials;

    if (!walletId || !wallet.isComplete()) {
      return resolve({transactions: [], loadMore: false});
    }

    const lastTransactionId = transactionsHistory[0]
      ? transactionsHistory[0].txid
      : null;
    const skip = transactionsHistory.length;

    try {
      let {transactions, loadMore} = await GetNewTransactions(
        [],
        skip,
        wallet,
        requestLimit,
        lastTransactionId,
      );

      if (IsUtxoCoin(coin)) {
        const _lowAmount = await GetLowAmount(wallet);
        opts.lowAmount = _lowAmount;
        transactions = UpdateLowAmount(transactions, opts);
      }

      // To get transaction list details: icon, description, amount and date
      transactions = BuildUiFriendlyList(
        transactions,
        wallet.currencyAbbreviation,
        contactsList,
      );

      const array = transactionsHistory
        .concat(transactions)
        .filter((txs: any) => txs);

      const newHistory = uniqBy(array, x => {
        return (x as any).txid;
      });

      return resolve({transactions: newHistory, loadMore});
    } catch (err) {
      console.log(
        '!! Could not update transaction history for ',
        wallet.id,
        err,
      );
      return reject(err);
    }
  });
};

/////////////////////// Transaction list /////////////////////////////////////

const getContactName = (address: string | undefined) => {
  //   TODO: Get name from contacts list
  return;
};

const getFormattedDate = (time: number): string => {
  return WithinPastDay(time)
    ? moment(time).fromNow()
    : moment(time).format('MMM D, YYYY');
};

export const BuildUiFriendlyList = (
  transactionList: any[] = [],
  currencyAbbreviation: string,
  contactsList: any[] = [],
): any[] => {
  return transactionList.map(transaction => {
    const {
      confirmations,
      error,
      customData,
      action,
      time,
      amount,
      amountStr,
      feeStr,
      outputs,
      note,
      message,
    } = transaction || {};
    const {service: customDataService, toWalletName} = customData || {};
    const {body: noteBody} = note || {};

    const notZeroAmountEth = !(amount === 0 && currencyAbbreviation === 'eth');
    const hasContactName = !!(
      contactsList?.length &&
      outputs?.length &&
      getContactName(outputs[0]?.address)
    );

    const isSent = action === 'sent';
    const isMoved = action === 'moved';
    const isReceived = action === 'received';
    const isInvalid = action === 'invalid';

    if (confirmations <= 0) {
      transaction.uiIcon = TransactionIcons.confirming;

      if (notZeroAmountEth) {
        if (hasContactName) {
          if (isSent || isMoved) {
            transaction.uiDescription = getContactName(outputs[0]?.address);
          }
        } else {
          if (isSent) {
            transaction.uiDescription = 'Sending';
          }

          if (isMoved) {
            transaction.uiDescription = 'Moving';
          }
        }

        if (isReceived) {
          transaction.uiDescription = 'Receiving';
        }
      }
    }

    if (confirmations > 0) {
      if (
        (currencyAbbreviation === 'eth' ||
          IsCustomERCToken(currencyAbbreviation)) &&
        error
      ) {
        transaction.uiIcon = TransactionIcons.error;
      } else {
        if (isSent) {
          // TODO: Get giftCard images
          transaction.uiIcon = customDataService
            ? TransactionIcons[customDataService]
            : TransactionIcons.sent;

          if (notZeroAmountEth) {
            if (noteBody) {
              transaction.uiDescription = noteBody;
            } else if (message) {
              transaction.uiDescription = message;
            } else if (hasContactName) {
              transaction.uiDescription = getContactName(outputs[0]?.address);
            } else if (toWalletName) {
              transaction.uiDescription = `Sent to ${toWalletName}`;
            } else {
              transaction.uiDescription = 'Sent';
            }
          }
        }

        if (isReceived) {
          transaction.uiIcon = TransactionIcons.received;

          if (noteBody) {
            transaction.uiDescription = noteBody;
          } else if (hasContactName) {
            transaction.uiDescription = getContactName(outputs[0]?.address);
          } else {
            transaction.uiDescription = 'Received';
          }
        }

        if (isMoved) {
          transaction.uiIcon = TransactionIcons.moved;

          if (noteBody) {
            transaction.uiDescription = noteBody;
          } else if (message) {
            transaction.uiDescription = message;
          } else {
            transaction.uiDescription = 'Sent to self';
          }
        }

        if (isInvalid) {
          transaction.uiIcon = TransactionIcons.error;

          transaction.uiDescription = 'Invalid';
        }
      }
    }

    if (!notZeroAmountEth) {
      const {uiDescription} = transaction;

      transaction.uiDescription = uiDescription
        ? `Interaction with contract ${uiDescription}`
        : 'Interaction with contract';
      transaction.uiValue = feeStr;
    }

    if (isInvalid) {
      transaction.uiValue = '(possible double spend)';
    } else {
      if (notZeroAmountEth) {
        transaction.uiValue = amountStr;
      }
    }

    transaction.uiTime = getFormattedDate(time * 1000);

    return transaction;
  });
};