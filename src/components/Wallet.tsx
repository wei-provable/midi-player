import React, { FC, useMemo, useCallback, useEffect } from 'react';
import { WalletProvider } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletModalProvider, WalletModal, useWalletModal } from '@demox-labs/aleo-wallet-adapter-reactui';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { WalletNotConnectedError } from '@demox-labs/aleo-wallet-adapter-base';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { createPortal } from 'react-dom';

// Default styles that can be overridden by your app
require('@demox-labs/aleo-wallet-adapter-reactui/styles.css');

function shortenAddress(address: string) {
  return address.slice(0, 6) + '...' + address.slice(-4);
}

const WalletButton: FC = () => {
  const { publicKey, disconnect } = useWallet();
  const { visible, setVisible } = useWalletModal();

  // Auto-close modal when wallet is connected
  useEffect(() => {
    if (publicKey && visible) {
      setVisible(false);
    }
  }, [publicKey, visible, setVisible]);

  const onClick = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  return (
    <>
      <button
        onClick={onClick}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-mono flex items-center gap-2"
      >
        {publicKey ? (
          <>
            {shortenAddress(publicKey)}
            <button
              onClick={e => {
                e.stopPropagation();
                disconnect();
              }}
              className="ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
              title="Disconnect"
              type="button"
            >
              Disconnect
            </button>
          </>
        ) : (
          'Connect Wallet'
        )}
      </button>
      {visible && <WalletModalPortal />}
    </>
  );
};

const WalletModalPortal: FC = () => {
  if (typeof window === 'undefined') return null;
  return createPortal(
    <WalletModal />, // No extra wrappers!
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