export function readSetCookies(headers: unknown): string[] {
  if (typeof headers !== "object" || headers === null) {
    return [];
  }
  const raw: unknown = (headers as Record<string, unknown>)["set-cookie"];
  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === "string");
  }
  if (typeof raw === "string") {
    return [raw];
  }
  return [];
}

export interface DataEnvelope<TData> {
  success: boolean;
  message: string;
  data: TData;
}

export interface UserBody {
  id: string;
  username: string;
  nama: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}
