import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MediSense AI - Clinical Intelligence & Health Management',
  description: 'AI-assisted medical report parsing, longitudinal analytics, and patient-doctor appointment management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
