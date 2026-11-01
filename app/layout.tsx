import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/ui/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'ReconCopilot — Settlement & GST Reconciliation for Razorpay Merchants',
  description: 'AI-powered reconciliation tool for Indian micro-merchants. Auto-match Razorpay settlements, bank credits, and GST invoices. Built for the Razorpay ecosystem.',
  keywords: 'GST reconciliation, Razorpay settlement, e-invoicing, Indian small business, fintech',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="min-h-screen" style={{ background: 'var(--bg-page)', color: 'var(--text-primary)', transition: 'background-color 0.15s ease, color 0.15s ease' }}>
            <Navbar />
            <main>{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
