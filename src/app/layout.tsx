import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import WalletProviders from '@/components/WalletProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Retro Beats',
  description: 'A retro-style MIDI player built with Next.js and SpessaSynth',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProviders>
          {children}
        </WalletProviders>
      </body>
    </html>
  );
} 