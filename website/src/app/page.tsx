'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the MIDI player component to avoid SSR issues
const MidiPlayer = dynamic(() => import('@/components/MidiPlayer'), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Retro Beats</h1>
      <MidiPlayer />
    </main>
  );
} 