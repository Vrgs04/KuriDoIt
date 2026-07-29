export async function api<T>(path:string, init?:RequestInit):Promise<T>{
  if(!navigator.onLine && init?.method && init.method!=='GET') throw new Error('Necesitas conexión a Internet para guardar cambios.')
  const r=await fetch(`/api${path}`,{...init,headers:{'Content-Type':'application/json',...init?.headers}})
  const data=await r.json() as T&{error?:string};
  if(!r.ok){
    if(data.error==='Sesión de usuario inválida'){
      localStorage.removeItem('kuri_user')
      sessionStorage.setItem('kuri_login_error','Usuario no válido')
      location.assign('/welcome?invalid=1')
    }
    throw new Error(data.error==='Sesión de usuario inválida'?'Usuario no válido':data.error||'No pudimos completar la solicitud')
  }
  return data
}
export type Match={id:string;opponent:string;kuriyama_side:'HOME'|'AWAY';kickoff_at:string;picks_close_at:string;status:string;kuriyama_score:number|null;opponent_score:number|null}
export type MarketRow={id:string;title:string;market_type:string;line:number|null;option_id:string;option_label:string;decimal_odds:number}
export type Pick={id:string;opponent:string;market_title:string;option_label:string;odds_snapshot:number;created_at:string;status:string;points_awarded:number}
export type QuestionOption={id:string;question_id:string;value_key:string;label:string;points_value:number;sort_order:number}
export type QuestionType='CUSTOM'|'TOTAL_GOALS'|'FIRST_HALF_GOALS'|'GOAL_SCORER'|'EXACT_SCORE'
export type Question={id:string;match_id:string;prompt:string;points_value:number;status:string;question_type:QuestionType;kickoff_at:string;picks_close_at:string;options:QuestionOption[];prediction_answers?:string[];prediction_answer?:string;prediction_status?:string;points_awarded?:number}
export type Prediction={id:string;user_id:string;match_id:string;question_id:string;answer:string;answer_label?:string;points_snapshot:number;status:'PENDING'|'CORRECT'|'INCORRECT'|'VOID';points_awarded:number;prompt:string;opponent:string;kickoff_at:string}
