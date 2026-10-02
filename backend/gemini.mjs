import {validateTasteInput,parseTasteOutput,extractionPrompt} from '../shared/taste-extraction.ts';
export const aiError=(message,status=400)=>Object.assign(new Error(message),{status});
export async function aiQuota(env,owner,units=1){
 const day=new Date().toISOString().slice(0,10);
 for(const [key,limit] of [[day+':global',250],[day+':'+owner,35]]){
  const row=await env.DB.prepare('INSERT INTO ai_usage(key,used) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET used=used+excluded.used WHERE used+excluded.used<=? RETURNING used').bind(key,units,limit).first();
  if(!row)throw aiError('오늘의 AI 사용 한도에 도달했어요. 직접 입력은 계속 사용할 수 있어요.',429);
 }
}
export async function geminiCall(env,model,operation,body){
 if(!env.GEMINI_API_KEY)throw aiError('AI 연결 설정을 확인하고 있어요. 직접 입력은 사용할 수 있어요.',503);
 if(!/^[a-z0-9.-]+$/.test(model))throw aiError('AI 모델 설정을 확인해주세요.',503);
 const r=await (env.AI_FETCH||fetch)(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${operation}`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
 if(!r.ok)throw aiError(r.status===429?'AI 무료 사용 한도에 도달했어요. 잠시 후 다시 시도해주세요.':'AI 요청을 완료하지 못했어요. 직접 입력은 계속 사용할 수 있어요.',r.status===429?429:502);
 return r.json();
}
export async function extractGemini(env,owner,text,preference){
 validateTasteInput(text);if(!env.GEMINI_API_KEY)throw aiError('AI 연결 설정을 확인하고 있어요.',503);await aiQuota(env,owner);
 const messages=extractionPrompt(text,preference);
 const b=await geminiCall(env,env.GEMINI_MODEL||'gemini-3.1-flash-lite','generateContent',{systemInstruction:{parts:[{text:messages[0].content}]},contents:messages.slice(1).map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),generationConfig:{temperature:0,maxOutputTokens:1200,responseMimeType:'application/json'}});
 const raw=b.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('')||'';return parseTasteOutput(raw,text,preference);
}
