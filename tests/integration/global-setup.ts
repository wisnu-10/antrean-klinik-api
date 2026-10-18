import "dotenv/config";
import { execSync } from "node:child_process";

export default function globalSetup(): void {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.trim() === "") {
    process.stdout.write("[integration] DATABASE_URL tidak di-set - migrasi dilewati, tes DB akan di-skip.\n");
    return;
  }

  process.stdout.write("[integration] Menerapkan migrasi ke database uji...\n");
  try {
    const output = execSync("npx prisma migrate deploy", {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: url },
      stdio: "pipe",
      encoding: "utf8",
    });
    process.stdout.write(output);
  } catch (error) {
    if (error instanceof Error) {
      process.stderr.write(`${error.message}\n`);
    }
    throw error;
  }
}
