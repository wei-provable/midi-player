'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { WalletProvider } from '@/components/WalletProvider';
import { WalletConnectButton } from '@/components/WalletConnectButton';

// Dynamically import the MIDI player component to avoid SSR issues
const MidiPlayer = dynamic(() => import('@/components/MidiPlayer'), {
  ssr: false,
});

export default function Home() {
  return (
    <WalletProvider>
      <main className="min-h-screen p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Retro Beats</h1>
          <WalletConnectButton />
        </div>
        <MidiPlayer />
      </main>
    </WalletProvider>
  );
} 