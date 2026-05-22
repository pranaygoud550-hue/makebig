import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Make Big - Build Big Ideas Together',
  description: 'Connect developers, filmmakers, writers, musicians & creators to build amazing projects together',
  generator: 'Next.js',
  applicationName: 'Make Big',
  referrer: 'strict-origin-when-cross-origin',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>{children}</body>
    </html>
  );
}
