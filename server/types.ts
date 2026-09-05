declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
          email: string | null;
        role: string;
      };
      correlationId?: string;
    }
  }
}

export {};
