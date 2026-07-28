export function normalizeApiPath(path: string | string[] | undefined): string {
  if (Array.isArray(path)) return `/${path.join('/')}`
  return `/${path ?? ''}`
}
