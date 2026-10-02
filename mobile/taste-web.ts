import {validateTasteInput,type TasteCandidate} from '../shared/taste-extraction';
import type {Preference} from '../shared/matching';
export async function browserTaste(text:string,preference:Preference,onProgress:(message:string)=>void,signal?:AbortSignal):Promise<TasteCandidate[]>{
 validateTasteInput(text);onProgress('AI가 취향을 정리하고 있어요');const token=globalThis.localStorage?.getItem('sai-session');
 const r=await fetch('/api/app',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'parseText',text,preference,aiConsent:true}),signal});const b=await r.json();if(!r.ok)throw new Error(b.error||'취향을 정리하지 못했어요.');return b.candidates;
}
