# Backend — Aplikasi Antrean Klinik

REST API (Express 5 + TypeScript + Prisma 7 + PostgreSQL) untuk data pasien, kunjungan/antrean, autentikasi, dan manajemen akun petugas.

## Tech Stack

- Node.js, TypeScript 5.9
- Express 5, Helmet, CORS, cookie-parser
- Prisma 7 + `@prisma/adapter-pg` + PostgreSQL
- Zod (validasi strict), JWT (jsonwebtoken), bcrypt
- Vitest (+ Supertest), ESLint

## Struktur Folder

```
backend/
  src/
    app.ts                  # mounting route & middleware global
    index.ts                # entrypoint
    config/                 # env, auth cookie names
    helpers/                # AppError, respond, date, password, token, cookies, request
    middlewares/            # auth (jwtVerify/roleverify), validate, rateLimit, errorHandler
    modules/
      auth/                 # login, logout, refresh, me, change password
      users/                # manajemen akun (superadmin)
      patients/             # CRUD pasien + pencarian
      visits/               # antrean & kunjungan
    types/                  # Api paginated, auth roles
  prisma/
    schema.prisma
    seed.ts
    migrations/
  generated/prisma/         # Prisma client output
```

## Prasyarat

- Node.js 20+ (disarankan sesuai environment)
- PostgreSQL (lokal atau remote)
- (Opsional) `TZ=Asia/Jakarta` agar aturan hari/kunjungan konsisten WIB

## Instalasi

```bash
cd backend
cp .env.example .env
# isi .env: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, DATABASE_URL, (opsional) TEST_DATABASE_URL
npm install
npx prisma generate
npx prisma migrate deploy   # atau migrate dev untuk development
npm run db:seed            # superadmin + 30 pasien contoh
npm run dev                # http://localhost:5000
```

## Environment Variables

| Key | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | Ya | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Ya | Secret access token |
| `JWT_REFRESH_SECRET` | Ya | Secret refresh token |
| `PORT` | Tidak | default 5000 |
| `FRONTEND_URL` | Tidak | default `http://localhost:3000` (CORS origin) |
| `AUTH_COOKIE_DOMAIN` | Tidak | Domain cookie saat FE/BE beda subdomain |
| `NODE_ENV` | Tidak | development/production (cookie secure menyesuaikan) |
| `RATE_LIMIT_LOGIN_WINDOW_MS` | Tidak | default 900000 (15 menit) |
| `RATE_LIMIT_LOGIN_MAX` | Tidak | default 5 percobaan gagal |
| `TRUST_PROXY` | Tidak | `true` bila di belakang reverse proxy |
| `TZ` | Tidak | Disarankan `Asia/Jakarta` |

## Autentikasi & Otorisasi

- Login via `POST /api/auth/login` set cookie httpOnly: `accessToken` (15m), `refreshToken` (7d), `role` (7d).
- Semua endpoint data dijaga `jwtVerify` + `roleverify`.
  - `superadmin`: manajemen akun petugas (`/api/users`).
  - `admin`: pasien & kunjungan/antrean.
- FE harus mengirim `credentials: include`.
- Endpoint refresh: `POST /api/auth/refresh` (silent).
- Rate limit login: 5 percobaan gagal / 15 menit per IP -> `429`.

## Format Respons

Sukses:

```json
{ "success": true, "message": "...", "data": { ... } }
```

Gagal:

```json
{ "success": false, "message": "...", "data": null }
```

Validasi:

```json
{ "success": false, "message": "Data yang dikirim tidak valid", "data": null, "errors": [{ "field": "name", "message": "Wajib diisi" }] }
```

Semua request body/query Zod `strict`: key tak dikenal ditolak (umumnya 422).
Soft delete berbasis `deletedAt`; data terhapus tidak muncul di list/detail.

## Endpoint

Base URL: `http://localhost:5000`

### Health

| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/api/health` | Publik | `{ status: "ok" }` |

### Auth (`/api/auth`)

| Method | Path | Akses | Request Body | Respons `data` |
| --- | --- | --- | --- | --- |
| POST | `/login` | Publik (+rate limit) | `{ "username": "str", "password": "str" }` | `{ "user": User }` (+set cookie) |
| POST | `/logout` | Publik | - | `null` (+clear cookie) |
| POST | `/refresh` | Publik (cookie refresh) | - | `{ "user": User }` (+set access cookie) |
| GET | `/me` | Login | - | `{ "user": User }` |
| PATCH | `/password` | Login | `{ "currentPassword": "str", "newPassword": "str (min 8)" }` | `null` |

`User = { id, username, nama, role, isActive, createdAt }`

### Users (`/api/users`) - superadmin only

| Method | Path | Request Body | Respons `data` |
| --- | --- | --- | --- |
| GET | `/` | - | `User[]` |
| POST | `/` | `{ "username": "str(3-50)", "nama": "str", "password": "str(min 8)" }` | `User` (201, role selalu `admin`) |
| PATCH | `/:id` | `{ "username"?, "nama"?, "isActive"? }` (minimal 1) | `User` |
| POST | `/:id/reset-password` | `{ "newPassword": "str(min 8)" }` | `null` |
| DELETE | `/:id` | - | `null` (deactivate; tidak bisa menonaktifkan diri sendiri) |

### Patients (`/api/patients`) - admin only

**Query list:** `q`, `rm`, `name`, `dob` (`YYYY-MM-DD`), `page` (default 1), `limit` (default 20, max 100).
Filter kombinasi = AND; soft-deleted disembunyikan.

| Method | Path | Request | Respons `data` |
| --- | --- | --- | --- |
| GET | `/` | query di atas | `{ items: Patient[], total, page, limit }` |
| POST | `/` | `{ "name","placeBirth","dateBirth" (YYYY-MM-DD),"address","complaint"? }` | `Patient` (201; jika `complaint` ada, sekaligus buat kunjungan pertama hari ini) |
| GET | `/:identifier` | path: UUID atau slug (`nama-rm-YYYYMMDD-NNNN` / `RM-...`) | `Patient` |
| PATCH | `/:id` | `{ "name"?,"placeBirth"?,"dateBirth"?,"address"? }` (minimal 1) | `Patient` |
| DELETE | `/:id` | - | `null` (soft delete) |

`Patient = { id, medicalRecord (RM-YYYYMMDD-NNNN), name, placeBirth, dateBirth, address, createdAt }`
Usia dihitung di frontend dari `dateBirth`.

### Visits / Antrean (`/api/visits`) - admin only

**Query list:** `date` (`YYYY-MM-DD`, default hari ini WIB), `status` (`belum_dilayani`/`sudah_dilayani`), `patientId` (UUID), `page` (default 1), `limit` (default 50, max 100).

| Method | Path | Request | Respons `data` |
| --- | --- | --- | --- |
| GET | `/` | query di atas | `{ items: Visit[], total, page, limit }` |
| POST | `/` | `{ "patientId"? , "newPatient"? (obj pasien baru), "complaint" }` - tepat salah satu | `Visit` (201; nomor antrean otomatis) |
| GET | `/:id` | - | `Visit` |
| PATCH | `/:id` | `{ "status"? , "complaint"? }` (minimal 1) | `Visit` (status `sudah_dilayani` set `servedAt=now`; sebaliknya `null`) |
| DELETE | `/:id` | - | `null` (soft delete) |

`Visit = { id, patientId, queueNumber, visitDate (YYYY-MM-DD), complaint, status, servedAt (ISO|null), createdAt (ISO), registeredBy, patient: { id, medicalRecord, name } }`
Aturan: `queueNumber` unik & berurutan per `visit_date` (FIFO), direset tiap hari, termasuk baris soft-deleted tidak dipakai ulang.

## Script

| Script | Keterangan |
| --- | --- |
| `npm run dev` | tsx watch |
| `npm run build` / `npm start` | compile & run |
| `npm run typecheck` / `npm run lint` | cek TS/ESLint |
| `npm test` | unit test |
| `npm run test:integration` | integration PG (memakai `DATABASE_URL` yang dikonfigurasi) |
| `npm run prisma:generate` | generate client |
| `npm run db:seed` | seed |
