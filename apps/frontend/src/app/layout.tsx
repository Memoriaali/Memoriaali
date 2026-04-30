import { AuthProvider } from '@/hooks/useAuth';
import { ServerVariantProvider } from '@/lib/variant';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './styles/themes.scss';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata = {
  title: 'Memoriaali',
  description: 'Digital Archive Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='fi' suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <ServerVariantProvider>
          <AuthProvider>{children}</AuthProvider>
        </ServerVariantProvider>
      </body>
    </html>
  );
}
