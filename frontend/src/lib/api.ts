export type DemoUser = { id: string; displayName: string };
export type Template = { id: string; title: string; category: string; description: string; coverUrl: string; requiredImageCount: number; acceptedMimeTypes: string[]; maxFileSizeBytes: number };
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function api<T>(path: string, options: { userId?: string; signal?: AbortSignal } = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { signal: options.signal, headers: options.userId ? { "X-Demo-User": options.userId } : {} });
  if (!response.ok) { const data = await response.json().catch(() => null); throw new ApiError(response.status, data?.message || "请求失败，请稍后重试"); }
  return response.json();
}
