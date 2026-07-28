import { describe, expect, it } from 'vitest'
import { normalizeApiPath } from './apiPath'

describe('normalizeApiPath', () => {
  it('removes the Pages API mount point', () => {
    expect(normalizeApiPath('/api/matches/current')).toBe('/matches/current')
  })

  it('normalizes the API root', () => {
    expect(normalizeApiPath('/api')).toBe('/')
  })
})
