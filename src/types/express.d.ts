import type { AuthUser } from "./auth";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
    // Diisi oleh middleware `validate` setelah query lolos Zod (req.query sendiri
    // adalah getter di Express 5 sehingga tidak bisa ditimpa langsung).
    validatedQuery?: unknown;
  }
}
