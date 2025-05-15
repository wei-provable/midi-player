import React, { FC } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';

export const WalletConnectButton: FC = () => {
  const { publicKey } = useWallet();

  return (
    <div className="flex items-center gap-4">
      <WalletMultiButton className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded" />
      {publicKey && (
        <span className="text-sm text-gray-600">
          Connected: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </span>
      )}
    </div>
  );
}; 