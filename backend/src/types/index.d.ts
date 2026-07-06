import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        username: string;
        role: UserRole;
      };
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    user: {
      id: string;
      name: string;
      username: string;
      role: UserRole;
    };
  }
}
