import "dotenv/config";
import bcrypt from "bcrypt";
import { parseDateOnly } from "../src/helpers/date";
import { createPatientInTransaction } from "../src/modules/patients/patients.shared";
import { prisma } from "../src/prisma";

interface PatientSeed {
  name: string;
  placeBirth: string;
  dateBirth: string;
  address: string;
}

// 30 pasien contoh. Sengaja TIDAK membuat kunjungan/antrean (tanpa pendaftaran).
// Semua tanggal lahir <= hari ini agar lolos aturan validasi.
const PATIENT_SEEDS: PatientSeed[] = [
  { name: "Budi Santoso", placeBirth: "Bandung", dateBirth: "1990-05-10", address: "Jl. Merdeka No. 12, Bandung" },
  { name: "Siti Aminah", placeBirth: "Jakarta", dateBirth: "1985-03-20", address: "Jl. Sudirman No. 45, Jakarta" },
  { name: "Ahmad Fauzi", placeBirth: "Surabaya", dateBirth: "1978-11-02", address: "Jl. Diponegoro No. 8, Surabaya" },
  { name: "Dewi Lestari", placeBirth: "Yogyakarta", dateBirth: "1995-07-15", address: "Jl. Malioboro No. 21, Yogyakarta" },
  { name: "Rina Marlina", placeBirth: "Semarang", dateBirth: "1988-01-25", address: "Jl. Pandanaran No. 5, Semarang" },
  { name: "Agus Setiawan", placeBirth: "Medan", dateBirth: "1972-09-30", address: "Jl. Gatot Subroto No. 77, Medan" },
  { name: "Nurul Hidayah", placeBirth: "Malang", dateBirth: "1999-12-08", address: "Jl. Ijen No. 33, Malang" },
  { name: "Hendra Wijaya", placeBirth: "Palembang", dateBirth: "1965-04-17", address: "Jl. Sudirman No. 9, Palembang" },
  { name: "Maya Sari", placeBirth: "Denpasar", dateBirth: "1993-06-21", address: "Jl. Teuku Umar No. 40, Denpasar" },
  { name: "Rizky Ramadhan", placeBirth: "Makassar", dateBirth: "2000-02-14", address: "Jl. Pettarani No. 18, Makassar" },
  { name: "Fitri Handayani", placeBirth: "Bandung", dateBirth: "1982-10-05", address: "Jl. Asia Afrika No. 6, Bandung" },
  { name: "Joko Susilo", placeBirth: "Solo", dateBirth: "1968-08-19", address: "Jl. Slamet Riyadi No. 90, Solo" },
  { name: "Lina Kusuma", placeBirth: "Bogor", dateBirth: "1991-03-03", address: "Jl. Pajajaran No. 15, Bogor" },
  { name: "Bayu Pratama", placeBirth: "Bekasi", dateBirth: "1996-11-27", address: "Jl. Ahmad Yani No. 27, Bekasi" },
  { name: "Wulan Sari", placeBirth: "Tangerang", dateBirth: "1987-05-09", address: "Jl. Daan Mogot No. 4, Tangerang" },
  { name: "Eko Prasetyo", placeBirth: "Malang", dateBirth: "1975-01-12", address: "Jl. Soekarno Hatta No. 11, Malang" },
  { name: "Ani Rahmawati", placeBirth: "Cirebon", dateBirth: "1980-07-07", address: "Jl. Siliwangi No. 52, Cirebon" },
  { name: "Dodi Hermawan", placeBirth: "Tasikmalaya", dateBirth: "1994-09-16", address: "Jl. Sutisna Senjaya No. 3, Tasikmalaya" },
  { name: "Sri Wahyuni", placeBirth: "Semarang", dateBirth: "1969-12-01", address: "Jl. Pemuda No. 88, Semarang" },
  { name: "Fajar Nugroho", placeBirth: "Yogyakarta", dateBirth: "1998-04-23", address: "Jl. Kaliurang Km 5, Yogyakarta" },
  { name: "Indah Permata", placeBirth: "Padang", dateBirth: "1992-08-28", address: "Jl. Imam Bonjol No. 19, Padang" },
  { name: "Yusuf Maulana", placeBirth: "Banda Aceh", dateBirth: "1976-06-11", address: "Jl. Teuku Umar No. 23, Banda Aceh" },
  { name: "Kartika Dewi", placeBirth: "Gianyar", dateBirth: "2013-02-19", address: "Jl. Raya Ubud No. 7, Gianyar" },
  { name: "Bambang Sutrisno", placeBirth: "Surabaya", dateBirth: "1963-03-15", address: "Jl. Rungkut Asri No. 10, Surabaya" },
  { name: "Ratna Sari", placeBirth: "Bandung", dateBirth: "1989-10-30", address: "Jl. Setiabudi No. 62, Bandung" },
  { name: "Dimas Aditya", placeBirth: "Magelang", dateBirth: "2015-05-05", address: "Jl. Sudirman No. 14, Magelang" },
  { name: "Novi Anggraini", placeBirth: "Pekanbaru", dateBirth: "1984-12-24", address: "Jl. Jenderal Sudirman No. 31, Pekanbaru" },
  { name: "Arif Budiman", placeBirth: "Balikpapan", dateBirth: "1971-07-13", address: "Jl. MT Haryono No. 26, Balikpapan" },
  { name: "Sari Puspita", placeBirth: "Pontianak", dateBirth: "1990-01-08", address: "Jl. Gajah Mada No. 17, Pontianak" },
  { name: "Tri Handoko", placeBirth: "Samarinda", dateBirth: "1966-09-22", address: "Jl. Pahlawan No. 2, Samarinda" },
];

async function seedSuperadmin(): Promise<void> {
  const passwordHash = await bcrypt.hash("Admin123!", 12);
  const user = await prisma.user.upsert({
    where: { username: "superadmin" },
    update: {},
    create: {
      username: "superadmin",
      nama: "Superadmin",
      role: "superadmin",
      isActive: true,
      passwordHash,
    },
  });
  process.stdout.write(`Seeded superadmin user: ${user.username}\n`);
}

/**
 * Membuat 30 pasien contoh tanpa kunjungan. Idempoten: nama yang sudah ada
 * (termasuk yang soft-deleted) dilewati, sehingga aman dijalankan berulang.
 * Nomor RM dialokasikan lewat helper yang sama dengan aplikasi
 * (`RM-YYYYMMDD-NNNN`, urut per hari dan tidak dipakai ulang).
 */
async function seedPatients(): Promise<number> {
  const names = PATIENT_SEEDS.map((seed) => seed.name);
  const existingCount = await prisma.patient.count({ where: { name: { in: names } } });
  if (existingCount >= PATIENT_SEEDS.length) {
    return 0;
  }

  return prisma.$transaction(
    async (tx) => {
      let created = 0;
      for (const seed of PATIENT_SEEDS) {
        const existing = await tx.patient.findFirst({
          where: { name: seed.name },
          select: { id: true },
        });
        if (existing !== null) {
          continue;
        }
        await createPatientInTransaction(tx, {
          name: seed.name,
          placeBirth: seed.placeBirth,
          dateBirth: parseDateOnly(seed.dateBirth),
          address: seed.address,
        });
        created += 1;
      }
      return created;
    },
    { timeout: 20_000 },
  );
}

async function main(): Promise<void> {
  await seedSuperadmin();
  const createdPatients = await seedPatients();
  process.stdout.write(`Seeded ${createdPatients.toString()} pasien (tanpa kunjungan/antrean).\n`);
}

main()
  .catch((err: unknown) => {
    if (err instanceof Error) {
      process.stderr.write(`${err.message}\n`);
    } else {
      process.stderr.write("Seed failed with unknown error\n");
    }
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
