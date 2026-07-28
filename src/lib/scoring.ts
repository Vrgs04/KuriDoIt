export type PickStatus='PENDING'|'WON'|'LOST'|'VOID'
export function calculatePoints(status:PickStatus,oddsSnapshot:number){return status==='WON'?oddsSnapshot:0}

export type PredictionResult='CORRECT'|'INCORRECT'|'PENDING'|'VOID'
export function calculatePredictionPoints(status:PredictionResult,pointsValue:number){
  if(status==='CORRECT')return pointsValue
  if(status==='INCORRECT')return -pointsValue
  return 0
}
