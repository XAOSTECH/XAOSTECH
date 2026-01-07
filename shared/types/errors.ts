export function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function jsonErrorDebug(status: number, message: string, err: any) {
  if (process && (process.env && process.env.NODE_ENV === 'development')) {
    try { console.debug('[errors] debug:', err); } catch (e) { /* ignore */ }
  }
  return jsonError(status, message);
}
