// src/app/utils/error.utils.ts
export function parseApiError(err: any): string {
  const msg = err?.error?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return 'Error inesperado';
}
