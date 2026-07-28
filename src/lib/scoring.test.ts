import {describe,expect,it} from 'vitest'
import {calculatePoints} from './scoring'
describe('calculatePoints',()=>{it('awards frozen decimal odds to winners',()=>expect(calculatePoints('WON',2.3)).toBe(2.3));it.each(['LOST','VOID','PENDING'] as const)('awards zero to %s picks',s=>expect(calculatePoints(s,3.5)).toBe(0))})
