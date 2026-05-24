import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Casanova — Automations Agent',
  description: 'Make.com scenario manager and ClickUp task orchestrator for Lioness AI Systems',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[#0A0F1E] text-white`}>
        {children}
      </body>
    </html>
  );
}
