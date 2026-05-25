import './globals.css';
import { Inter, Cormorant_Garamond } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata = {
  title: 'Legal Matters – The Operating System for SA Legal Practice',
  description:
    'Manage matters, clients, documents, deadlines, POPIA consent, audit trails, and legal workflows from one secure platform. Built for South African law firms.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`scroll-smooth ${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-screen antialiased" style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}>
        {children}
      </body>
    </html>
  );
}
