-- Ganti unique index global dengan partial unique index (WHERE deleted_at IS NULL)
-- agar baris kunjungan yang sudah di-soft-delete tidak memblokir nomor antrean baru.
-- Prisma belum mendukung partial index di schema, jadi index ini dibuat lewat SQL manual.
DROP INDEX "visits_visit_date_queue_number_key";

CREATE UNIQUE INDEX "visits_visit_date_queue_number_active_key"
  ON "visits" ("visit_date", "queue_number")
  WHERE "deleted_at" IS NULL;
