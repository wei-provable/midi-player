'use client';
import React, { useMemo } from 'react';
import { WalletProvider } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletModalProvider } from '@demox-labs/aleo-wallet-adapter-reactui';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';

export default function WalletProviders({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({
        appName: 'MIDI Player',
      }),
    ],
    []
  );
  return (
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </WalletProvider>
  );
} 