export function rupturApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_RUPTUR_API_BASE_URL?.trim() || "http://127.0.0.1:8000";
}

