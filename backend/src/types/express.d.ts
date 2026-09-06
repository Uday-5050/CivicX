// Type augmentations for Express
// Separated from source files to avoid ESLint namespace errors

declare namespace Express {
  interface Request {
    id: string;
  }
}

// Extend Error to include `type` for body-parser errors
interface Error {
  type?: string;
}
