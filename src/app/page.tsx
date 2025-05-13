'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the MIDI player component to avoid SSR issues
const MidiPlayer = dynamic(() => import('@/components/MidiPlayer'), {
  ssr: false,
});

// Dynamically import the Wallet component to avoid SSR issues
const Wallet = dynamic(() => import('@/components/Wallet').then(mod => mod.Wallet), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Retro Beats</h1>
        <Wallet />
      </div>
      <MidiPlayer />
    </main>
  );
} 