export function normalizeApiPath(pathname: string): string {
  return pathname.replace(/^\/api(?=\/|$)/, '') || '/'
}
