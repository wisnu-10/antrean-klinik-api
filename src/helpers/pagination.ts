import type { Paginated } from "../types/api";

export function pageSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function paginated<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return { items, total, page, limit };
}