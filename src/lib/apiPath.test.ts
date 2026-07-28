import { describe, expect, it } from 'vitest'
import { normalizeApiPath } from './apiPath'

describe('normalizeApiPath', () => {
  it('joins Cloudflare catch-all path segments', () => {
    expect(normalizeApiPath(['matches', 'current'])).toBe('/matches/current')
  })

  it('keeps single string paths compatible', () => {
    expect(normalizeApiPath('users')).toBe('/users')
  })
})
