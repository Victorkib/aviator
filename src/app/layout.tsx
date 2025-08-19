import type React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Navigation } from '@/components/layout/navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Aviator - Real-time Crash Game',
  description:
    'Experience the thrill of the ultimate crash game. Provably fair, real-time multiplayer betting.',
  keywords: 'crash game, aviator, betting, multiplayer, provably fair',
  authors: [{ name: 'Aviator Team' }],
  openGraph: {
    title: 'Aviator - Real-time Crash Game',
    description:
      'Experience the thrill of the ultimate crash game. Provably fair, real-time multiplayer betting.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aviator - Real-time Crash Game',
    description:
      'Experience the thrill of the ultimate crash game. Provably fair, real-time multiplayer betting.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <Navigation />
            <main>{children}</main>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
