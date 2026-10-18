import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { AppError } from "./helpers/AppError";
import { ok } from "./helpers/respond";
import { errorHandler } from "./middlewares/errorHandler";
import authRouter from "./modules/auth/auth.router";
import patientsRouter from "./modules/patients/patients.router";
import usersRouter from "./modules/users/users.router";
import visitsRouter from "./modules/visits/visits.router";

const app = express();

// Di belakang reverse proxy (nginx dsb) agar `req.ip` & rate limit akurat.
if (env.trustProxy) {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req: Request, res: Response): void => {
  ok(res, "Service is healthy", { status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/patients", patientsRouter);
app.use("/api/visits", visitsRouter);

app.use((req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route ${req.method} ${req.path} not found`, 404));
});

app.use(errorHandler);

export default app;
