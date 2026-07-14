const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface ApiError { code: string; message: string; details?: Array<{ field: string; message: string }> }
interface Envelope<T> { data: T; error: ApiError | null; meta: Record<string, unknown> }

export class ApiClientError extends Error {
  constructor(public code: string, message: string, public status: number, public details?: ApiError["details"]) { super(message) }
}

function csrfToken() {
  if (typeof document === "undefined") return undefined;
  return document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("origin_session_csrf="))?.split("=")[1];
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const csrf = csrfToken();
  if (csrf && !["GET", "HEAD"].includes(init.method ?? "GET")) headers.set("x-csrf-token", decodeURIComponent(csrf));
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  const envelope = await response.json() as Envelope<T>;
  if (!response.ok || envelope.error) throw new ApiClientError(envelope.error?.code ?? "REQUEST_FAILED", envelope.error?.message ?? "Request failed", response.status, envelope.error?.details);
  return envelope.data;
}

export const jsonBody = (value: unknown) => JSON.stringify(value);
