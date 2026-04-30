/**
 * Development login shortcuts exported from seeds
 *
 * These values mirror the development seed users in this package so the
 * frontend can provide dev-only quick login buttons. Do not import this
 * module in production builds.
 */

export interface DevLoginShortcut {
  label: string;
  identifier: string; // username or email accepted by backend
  password: string; // plaintext dev password matching seed hashing logic
  role: 'ADMIN' | 'MODERATOR' | 'USER';
  accountType?: 'PRIVATE' | 'COMPANY';
}

/**
 * Quick login users for local development only.
 * Keep these in sync with packages/database/seeds/data/users.ts (development and essential users).
 */
export const devLoginShortcuts: DevLoginShortcut[] = [
  {
    label: 'Admin',
    identifier: 'admin', // or admin@memoriaali.fi
    password: 'Admin123!',
    role: 'ADMIN',
    accountType: 'PRIVATE',
  },
  {
    label: 'Moderator (Sarah Wilson)',
    identifier: 'sarahwilson', // email: sarah.wilson@example.com
    password: 'Placeholder123!',
    role: 'MODERATOR',
    accountType: 'PRIVATE',
  },
  {
    label: 'User (Alex Johnson)',
    identifier: 'alexjohnson', // email: alex.johnson@example.com
    password: 'Placeholder123!',
    role: 'USER',
    accountType: 'PRIVATE',
  },
  {
    label: 'Company User (Tech Solutions)',
    identifier: 'techsolutions', // email: tech.solutions@example.com
    password: 'Placeholder123!',
    role: 'USER',
    accountType: 'COMPANY',
  },
  {
    label: 'Developer',
    identifier: 'developer', // email: developer@memoriaali.fi
    password: 'Password123!',
    role: 'USER',
    accountType: 'COMPANY',
  },
];
