import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Uber for Nurses Ghana — Operations & Clinical Console',
  description: 'Operations console for real-time dispatch, nurse verification, and clinical safety.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

