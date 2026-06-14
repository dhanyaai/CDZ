declare global {
  namespace Express {
    interface Request {
      userId: number;
      companyId: number;
    }
  }
}

export {};
