import React, { FC, useMemo } from 'react';
import { WalletProvider as AleoWalletProvider } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletModalProvider } from '@demox-labs/aleo-wallet-adapter-reactui';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { DecryptPermission, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';

// Default styles that can be overridden by your app
require('@demox-labs/aleo-wallet-adapter-reactui/styles.css');

export const WalletProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({
        appName: 'RetroBeats',
      }),
    ],
    []
  );

  const onError = (error: Error) => {
    console.error('Wallet error:', error);
  };

  return (
    <AleoWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.NoDecrypt}
      network={WalletAdapterNetwork.TestnetBeta}
      autoConnect={false}
      onError={onError}
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </AleoWalletProvider>
  );
}; 