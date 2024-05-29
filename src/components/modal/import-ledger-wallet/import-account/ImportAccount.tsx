import Transport from '@ledgerhq/hw-transport';
import React, {useState} from 'react';
import {SelectWalletsToImport} from './SelectWalletsToImport';
import {AddByDerivationPath} from './AddByDerivationPath';
import {SelectLedgerCurrency} from './SelectLedgerCurrency';

interface ImportAccountProps {
  transport: Transport;
  setHardwareWalletTransport: React.Dispatch<
    React.SetStateAction<Transport | null>
  >;
  setScannedWalletsIds: React.Dispatch<
    React.SetStateAction<string[] | undefined>
  >;
  scannedWalletsIds: string[] | undefined;

  onDisconnect: () => Promise<void>;
  onComplete: () => void;
}

export const ImportAccount: React.FC<ImportAccountProps> = props => {
  const [showSelectWalletsToImport, setShowSelectWalletsToImport] =
    useState<boolean>(false);
  const [addByDerivationPath, setAddByDerivationPath] =
    useState<boolean>(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('btc');

  const onScannedCompleted = (
    selectedCurrency: string,
    scannedWalletsIds?: string[],
  ) => {
    setShowSelectWalletsToImport(true);
    setSelectedCurrency(selectedCurrency);
    props.setScannedWalletsIds(scannedWalletsIds);
  };

  const onAddByDerivationPathSelected = () => {
    setAddByDerivationPath(!addByDerivationPath);
  };

  return showSelectWalletsToImport ? (
    !addByDerivationPath ? (
      <SelectWalletsToImport
        onComplete={props.onComplete}
        onAddByDerivationPathSelected={onAddByDerivationPathSelected}
        scannedWalletsIds={props.scannedWalletsIds}
      />
    ) : (
      <AddByDerivationPath
        transport={props.transport}
        setHardwareWalletTransport={props.setHardwareWalletTransport}
        onDisconnect={props.onDisconnect}
        onComplete={props.onComplete}
        onAddByDerivationPathSelected={onAddByDerivationPathSelected}
        selectedCurrency={selectedCurrency}
        scannedWalletsIds={props.scannedWalletsIds}
      />
    )
  ) : addByDerivationPath ? (
    <AddByDerivationPath
      transport={props.transport}
      setHardwareWalletTransport={props.setHardwareWalletTransport}
      onDisconnect={props.onDisconnect}
      onComplete={props.onComplete}
      onAddByDerivationPathSelected={onAddByDerivationPathSelected}
      selectedCurrency={selectedCurrency}
      scannedWalletsIds={props.scannedWalletsIds}
    />
  ) : (
    <SelectLedgerCurrency
      transport={props.transport}
      setHardwareWalletTransport={props.setHardwareWalletTransport}
      onDisconnect={props.onDisconnect}
      onScannedCompleted={onScannedCompleted}
      onAddByDerivationPathSelected={onAddByDerivationPathSelected}
    />
  );
};
