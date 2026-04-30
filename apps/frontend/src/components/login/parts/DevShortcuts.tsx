'use client';

import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/api/generated/types.gen';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';

interface DevLoginShortcut {
  label: string;
  identifier: string;
  password: string;
  role: UserRole;
  accountType?: 'PRIVATE' | 'COMPANY';
}

/**
 * Developer shortcuts for local development. For a rapid ui
 * testing, this will give a quick way to login as different
 * mock user accounts and see different ui states.
 *
 * This code is not used in staging or production.
 *
 * @returns React component
 */
const DevShortcuts: React.FC = () => {
  const isDev = process.env.NODE_ENV === 'development';
  const { login } = useAuth();
  const router = useRouter();
  const { locale } = useParams();
  const [shortcuts, setShortcuts] = useState<DevLoginShortcut[]>([]);

  useEffect(() => {
    if (!isDev) return;
    let mounted = true;
    (async () => {
      const mod = await import('@seeds/exports');
      if (mounted) {
        setShortcuts(
          (mod as unknown as { devLoginShortcuts: DevLoginShortcut[] }).devLoginShortcuts,
        );
      }
    })().catch(console.error);
    return () => {
      mounted = false;
    };
  }, [isDev]);

  const handleQuickLogin = async (identifier: string, password: string) => {
    try {
      await login(identifier, password);
      await router.push(`/${locale}`);
      router.refresh();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className='mt-3'>
      <div className='mb-2' style={{ fontSize: 14, color: '#666' }}>
        Developer shortcuts
      </div>
      <div className='d-flex flex-wrap gap-2'>
        {shortcuts.map((s) => (
          <Button
            key={s.identifier}
            size='sm'
            variant='secondary'
            onClick={() => handleQuickLogin(s.identifier, s.password).catch(console.error)}
          >
            {s.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default DevShortcuts;
