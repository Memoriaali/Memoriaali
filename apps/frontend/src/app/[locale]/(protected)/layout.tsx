'use client';

import { useAuth } from '@/hooks/useAuth'; // adjust path
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo } from 'react';
import Spinner from 'react-bootstrap/Spinner';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useParams<{ locale: string }>();

  const nextUrl = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(`/${locale}/login?next=${encodeURIComponent(nextUrl)}`);
    }
  }, [isAuthenticated, isLoading, locale, nextUrl, router]);

  if (isLoading) {
    return (
      <div className='d-flex justify-content-center align-items-center p-4'>
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Avoid rendering protected content briefly before redirect
    return null;
  }

  return <>{children}</>;
}
