export type PickStatus='PENDING'|'WON'|'LOST'|'VOID'
export function calculatePoints(status:PickStatus,oddsSnapshot:number){return status==='WON'?oddsSnapshot:0}
