export type ApiError = Error & { status: number };

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", ...options });
  const result = await response.json().catch(() => ({})) as Record<string, unknown>;

  if (!response.ok) {
    const error = new Error(String(result.error ?? result.message ?? "Permintaan gagal.")) as ApiError;
    error.status = response.status;
    throw error;
  }

  return result as T;
}
