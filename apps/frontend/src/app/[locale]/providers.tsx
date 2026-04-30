'use client';

import { AuthProvider } from '@/hooks/useAuth';
import React from 'react';

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
