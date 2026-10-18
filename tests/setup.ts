process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-please-change";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-please-change";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.TZ = "Asia/Jakarta";
// Batas rate limit login dipatok agar tes deterministik (lihat tests/rate-limit.test.ts).
process.env.RATE_LIMIT_LOGIN_MAX = "5";
process.env.RATE_LIMIT_LOGIN_WINDOW_MS = "60000";
