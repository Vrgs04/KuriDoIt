export async function api<T>(path:string, init?:RequestInit):Promise<T>{
  if(!navigator.onLine && init?.method && init.method!=='GET') throw new Error('Necesitas conexión a Internet para guardar cambios.')
  const r=await fetch(`/api${path}`,{...init,headers:{'Content-Type':'application/json',...init?.headers}})
  const data=await r.json() as T&{error?:string}; if(!r.ok)throw new Error(data.error||'No pudimos completar la solicitud');return data
}
export type Match={id:string;opponent:string;kuriyama_side:'HOME'|'AWAY';kickoff_at:string;picks_close_at:string;status:string}
export type MarketRow={id:string;title:string;market_type:string;line:number|null;option_id:string;option_label:string;decimal_odds:number}
export type Pick={id:string;opponent:string;market_title:string;option_label:string;odds_snapshot:number;created_at:string;status:string;points_awarded:number}
export type Question={id:string;match_id:string;prompt:string;points_value:number;status:string;kickoff_at:string;picks_close_at:string;prediction_answer?:'YES'|'NO';prediction_status?:string;points_awarded?:number}
export type Prediction={id:string;user_id:string;match_id:string;question_id:string;answer:'YES'|'NO';points_snapshot:number;status:'PENDING'|'CORRECT'|'INCORRECT'|'VOID';points_awarded:number;prompt:string;opponent:string;kickoff_at:string}
