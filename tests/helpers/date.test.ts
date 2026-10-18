import { describe, expect, it } from "vitest";
import { AppError } from "../../src/helpers/AppError";
import {
  formatDateOnly,
  isDateOnly,
  parseDateOnly,
  wibCompactDate,
  wibDateOnly,
  wibDateString,
} from "../../src/helpers/date";

describe("wibDateString", () => {
  it("mengembalikan tanggal WIB (UTC+7) yang benar", () => {
    expect(wibDateString(new Date("2026-01-01T16:30:00.000Z"))).toBe("2026-01-01");
  });

  it("berganti hari setelah tengah malam WIB", () => {
    expect(wibDateString(new Date("2026-01-01T17:30:00.000Z"))).toBe("2026-01-02");
  });
});

describe("wibCompactDate", () => {
  it("menghapus pemisah tanda hubung", () => {
    expect(wibCompactDate(new Date("2026-10-16T03:00:00.000Z"))).toBe("20261016");
  });
});

describe("isDateOnly", () => {
  it("menerima format YYYY-MM-DD", () => {
    expect(isDateOnly("2026-10-16")).toBe(true);
  });

  it("menolak format lain", () => {
    expect(isDateOnly("16-10-2026")).toBe(false);
    expect(isDateOnly("2026/10/16")).toBe(false);
  });
});

describe("parseDateOnly", () => {
  it("mengembalikan Date UTC midnight", () => {
    const date = parseDateOnly("2026-10-16");
    expect(date.toISOString()).toBe("2026-10-16T00:00:00.000Z");
  });

  it("melempar AppError 400 untuk format salah", () => {
    expect(() => parseDateOnly("16-10-2026")).toThrow(AppError);
  });
});

describe("wibDateOnly", () => {
  it("mengembalikan tanggal WIB sebagai Date UTC midnight", () => {
    expect(wibDateOnly(new Date("2026-01-01T18:00:00.000Z")).toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });
});

describe("formatDateOnly", () => {
  it("memformat Date menjadi YYYY-MM-DD", () => {
    expect(formatDateOnly(new Date("2026-10-16T00:00:00.000Z"))).toBe("2026-10-16");
  });
});
