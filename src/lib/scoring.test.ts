import {describe,expect,it} from 'vitest'
import {calculatePoints,calculatePredictionPoints} from './scoring'
describe('calculatePoints',()=>{it('awards frozen decimal odds to winners',()=>expect(calculatePoints('WON',2.3)).toBe(2.3));it.each(['LOST','VOID','PENDING'] as const)('awards zero to %s picks',s=>expect(calculatePoints(s,3.5)).toBe(0))})
describe('calculatePredictionPoints',()=>{it('adds points for a correct answer',()=>expect(calculatePredictionPoints('CORRECT',4)).toBe(4));it('subtracts the same value for an incorrect answer',()=>expect(calculatePredictionPoints('INCORRECT',4)).toBe(-4));it.each(['PENDING','VOID'] as const)('awards zero to %s predictions',s=>expect(calculatePredictionPoints(s,4)).toBe(0))})
