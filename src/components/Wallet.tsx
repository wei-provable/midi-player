import React, { FC, useMemo, useCallback, useState } from 'react';
import { WalletProvider } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletModalProvider, WalletModal, useWalletModal } from '@demox-labs/aleo-wallet-adapter-reactui';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { WalletNotConnectedError } from '@demox-labs/aleo-wallet-adapter-base';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { createPortal } from 'react-dom';

// Default styles that can be overridden by your app
require('@demox-labs/aleo-wallet-adapter-reactui/styles.css');

const WalletButton: FC = () => {
  const { publicKey, requestRecords } = useWallet();
  const { setVisible } = useWalletModal();
  const [showModal, setShowModal] = useState(false);

  const onClick = useCallback(async () => {
    try {
      if (!publicKey) {
        setShowModal(true);
        setVisible(true);
      } else if (requestRecords) {
        const records = await requestRecords('credits.aleo');
        console.log('Records:', records);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, [publicKey, requestRecords, setVisible]);

  return (
    <>
      <button
        onClick={onClick}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        {publicKey ? 'Check Balance' : 'Connect Wallet'}
      </button>
      {showModal && <WalletModalPortal />}
    </>
  );
};

const WalletModalPortal: FC = () => {
  if (typeof window === 'undefined') return null;
  return createPortal(
    <WalletModal />,
    document.body
  );
};

export const Wallet: FC = () => {
  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({
        appName: 'MIDI Player',
      }),
    ],
    []
  );

  return (
    <WalletProvider
      wallets={wallets}
      autoConnect
    >
      <WalletModalProvider>
        <WalletButton />
      </WalletModalProvider>
    </WalletProvider>
  );
}; 