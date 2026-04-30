import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';

import Footer from '@/components/footer/Footer';
import BannerImage from '@/components/homePage/BannerImage';
import NavBar from '@/components/navBar/NavBar';
import { routing } from '@/i18n/routing';
import '../../lib/fontawesome';

import Providers from './providers';

export const metadata: Metadata = {
  title: 'Memoriaali',
  description: 'Memoriaali',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  let messages;
  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch {
    notFound();
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        <NavBar />
        <BannerImage />
        {children}
        <Footer />
      </Providers>
    </NextIntlClientProvider>
  );
}
