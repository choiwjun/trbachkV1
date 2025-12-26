import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'TrbaChk | Premium Resell Calculator',
  description: 'Calculate resell profits, taxes, and fees instantly.',
  manifest: '/manifest.json',
  themeColor: '#09090b',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/static/pretendard.css" />
        <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
      </head>
      <body className="bg-zinc-950 text-white font-sans antialiased min-h-screen">
        <Providers>
          <div className="mx-auto max-w-md min-h-screen bg-zinc-950 shadow-2xl shadow-black relative overflow-hidden">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}