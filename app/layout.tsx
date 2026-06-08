import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProviders } from './providers';
import { themeInitScript } from '@/lib/themeInitScript';
import { SITE_URL } from '@/lib/site';
import { OnboardingTourRoot } from '@/components/onboarding/OnboardingTourRoot';

export const metadata: Metadata = {
  title: {
    default: 'Make Big — Build Big Ideas Together',
    template: '%s | Make Big',
  },
  description:
    "Find co-founders, join student startup teams, and build real products. India's platform for student founders.",
  generator: 'Next.js',
  applicationName: 'Make Big',
  referrer: 'strict-origin-when-cross-origin',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: 'Make Big — Build Big Ideas Together',
    description:
      "Find co-founders, join student startup teams, and build real products. India's platform for student founders.",
    url: SITE_URL,
    siteName: 'Make Big',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Make Big' }],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Make Big — Build Big Ideas Together',
    description:
      "Find co-founders, join student startup teams, and build real products. India's platform for student founders.",
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-[#f3f2ef] text-[#1d2226] dark:bg-gray-900 dark:text-white transition-colors">
        <AppProviders>
          {children}
          <OnboardingTourRoot />
        </AppProviders>
      </body>
    </html>
  );
}
