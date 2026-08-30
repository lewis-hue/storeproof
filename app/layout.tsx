import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StoreProof — is your music actually on the stores?',
  description: 'The per-store list of missing songs your distributor cannot generate for you.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
