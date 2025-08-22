import type { DefaultSession, DefaultUser } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      externalId: string;
      provider: string;
      username?: string;
      balance?: number;
      status?: string;
      displayName?: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    externalId?: string;
    username?: string;
    balance?: number;
    status?: string;
    displayName?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId: string;
    externalId: string;
    provider: string;
  }
}
