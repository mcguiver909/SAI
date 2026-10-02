import {startLinkedin,resultLinkedin} from './linkedin.mjs';
const json=(b,status=200,headers={})=>Response.json(b,{status,headers:{'Cache-Control':'no-store',...headers}});
const fail=(s,status=400)=>{const e=new Error(s);e.status=status;throw e;};
const base64=bytes=>btoa(String.fromCharCode(...bytes));const un64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const random=()=>base64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export const digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
async function key(env){try{const raw=un64(env.TOKEN_ENCRYPTION_KEY||'');if(raw.length!==32)throw Error();return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);}catch{fail('계정 연결 설정을 확인해주세요.',503);}}
export async function seal(value,env,owner){const iv=crypto.getRandomValues(new Uint8Array(12));const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(owner)},await key(env),new TextEncoder().encode(JSON.stringify(value)));return JSON.stringify({iv:base64(iv),data:base64(new Uint8Array(bytes))});}
export async function unseal(value,env,owner){const p=JSON.parse(value);return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(p.iv),additionalData:new TextEncoder().encode(owner)},await key(env),un64(p.data))));}
const origin=env=>{const s=env.INTEGRATION_ORIGIN||'https://common-ground-hyejin.mcguiver909.chatgpt.site';const u=new URL(s);if(u.origin!==s||!(u.protocol==='https:'||(u.hostname==='localhost'&&u.protocol==='http:')))fail('연결 주소 설정을 확인해주세요.',503);return s;};
const configured=env=>!!(env.YOUTUBE_CLIENT_ID&&env.YOUTUBE_CLIENT_SECRET&&env.TOKEN_ENCRYPTION_KEY);
async function remote(url,init={},env){const r=await (env.INTEGRATION_FETCH||fetch)(url,{...init,signal:AbortSignal.timeout(20000)});let b;try{b=await r.json();}catch{fail('외부 서비스 응답을 읽지 못했어요.',502);}if(!r.ok||b.error){if(r.status===401||b.error==='invalid_grant')fail('YouTube 연결이 만료되었어요. 다시 연결해주세요.',401);if(r.status===403||r.status===429)fail('YouTube 권한 또는 사용 한도를 확인해주세요.',403);fail('YouTube 요청을 완료하지 못했어요.',502);}return b;}
async function tokens(env,owner){const r=await env.DB.prepare("SELECT payload FROM connected_accounts WHERE owner=? AND provider='youtube'").bind(owner).first();if(!r)fail('먼저 YouTube를 연결해주세요.',401);let t=await unseal(r.payload,env,owner);if(t.expires>Date.now()+60000)return t.access; if(!t.refresh)fail('YouTube를 다시 연결해주세요.',401);const b=await remote('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'refresh_token',refresh_token:t.refresh,client_id:env.YOUTUBE_CLIENT_ID,client_secret:env.YOUTUBE_CLIENT_SECRET})},env);if(!b.access_token||!Number(b.expires_in))fail('YouTube 연결을 갱신하지 못했어요.',502);t={...t,access:b.access_token,expires:Date.now()+Number(b.expires_in)*1000,...(b.refresh_token?{refresh:b.refresh_token}:{})};const updated=await env.DB.prepare("UPDATE connected_accounts SET payload=?,updated=? WHERE owner=? AND provider='youtube' AND payload=? RETURNING owner").bind(await seal(t,env,owner),new Date().toISOString(),owner,r.payload).first();if(!updated)fail('연결 상태가 바뀌었어요. 다시 시도해주세요.',409);return t.access;}
async function saveToken(env,owner,t){await env.DB.prepare("INSERT INTO connected_accounts(owner,provider,payload,updated) VALUES(?,'youtube',?,?) ON CONFLICT(owner,provider) DO UPDATE SET payload=excluded.payload,updated=excluded.updated").bind(owner,await seal(t,env,owner),new Date().toISOString()).run();}
async function yt(resource,params,token,env){const u=new URL('https://www.googleapis.com/youtube/v3/'+resource);for(const[k,v]of Object.entries(params))if(v!==undefined)u.searchParams.set(k,String(v));return remote(u,{headers:{Authorization:'Bearer '+token}},env);}
async function pages(resource,params,limit,token,env){let items=[],next;do{const b=await yt(resource,{...params,maxResults:Math.min(50,limit-items.length),pageToken:next},token,env);items.push(...(b.items||[]));next=b.nextPageToken;}while(next&&items.length<limit);return {items,truncated:!!next};}
const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/[\u0000-\u0008]/g,'').trim();
export function cleanRecords(records){if(!Array.isArray(records)||!records.length||records.length>150)fail('가져올 자료는 1~150개로 나눠주세요.');const result=records.map((r,i)=>{const title=clean(r.title).slice(0,250),text=clean(r.text).slice(0,1800);if(!title&&!text)fail('내용이 없는 자료가 있어요.');let url;if(r.url){const u=new URL(r.url);if(u.protocol!=='https:'||!['www.youtube.com','youtube.com','www.linkedin.com','linkedin.com'].includes(u.hostname))fail('출처 링크를 확인해주세요.');url=u.href;}return {id:String(r.id||i).slice(0,150),title,text,...(url?{url}:{})};});if(JSON.stringify(result).length>240000)fail('자료를 나눠서 가져와주세요.');return result;}
async function saveImport(env,owner,provider,records,summary){await env.DB.prepare('INSERT INTO imported_sources(owner,provider,records,summary,updated) VALUES(?,?,?,?,?) ON CONFLICT(owner,provider) DO UPDATE SET records=excluded.records,summary=excluded.summary,updated=excluded.updated').bind(owner,provider,JSON.stringify(records),JSON.stringify(summary),new Date().toISOString()).run();}
export async function integrationRoute(req,env,{owner,sessionHash}){
 const u=new URL(req.url),path=u.pathname;try{
 if(path==='/api/integrations/youtube/callback'&&req.method==='GET'){
  const state=u.searchParams.get('state')||'',cookie=req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('sai-oauth='))?.slice(10)||'';
  const row=await env.DB.prepare('SELECT * FROM oauth_states WHERE hash=?').bind(await digest(state)).first();
  const pendingValid=row&&row.expires>Date.now()&&row.cookie_hash===await digest(cookie)&&state&&cookie;
  if(!pendingValid)fail('연결 요청이 만료되었어요. 앱에서 다시 시작해주세요.',401);
  const used=await env.DB.prepare('DELETE FROM oauth_states WHERE hash=? RETURNING hash').bind(row.hash).first();if(!used)fail('이미 처리한 연결 요청이에요.',401);
  const active=await env.DB.prepare('SELECT owner FROM sessions WHERE token_hash=? AND created>?').bind(row.session_hash,new Date(Date.now()-30*86400000).toISOString()).first();if(!active||active.owner!==row.owner)fail('사이에 다시 로그인한 뒤 연결해주세요.',401);
  const redirect=origin(env)+'/api/integrations/youtube/callback';if(u.origin+u.pathname!==redirect)fail('연결 주소가 맞지 않아요.');
  if(u.searchParams.has('error'))return new Response(null,{status:303,headers:{Location:'/?integration=youtube&status=cancelled','Set-Cookie':'sai-oauth=; HttpOnly; SameSite=Lax; Path=/api/integrations/youtube; Max-Age=0; Secure','Cache-Control':'no-store'}});
  const code=u.searchParams.get('code');if(!code)fail('연결 코드를 받지 못했어요.');const pending=await unseal(row.payload,env,row.owner);
  const b=await remote('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'authorization_code',code,client_id:env.YOUTUBE_CLIENT_ID,client_secret:env.YOUTUBE_CLIENT_SECRET,redirect_uri:redirect,code_verifier:pending.verifier})},env);
  if(!b.access_token||!b.expires_in||!b.scope?.split(' ').includes('https://www.googleapis.com/auth/youtube.readonly'))fail('YouTube 읽기 권한을 승인해주세요.');
  // A new consent may select a different Google account: never reuse another account's refresh token.
  if(!b.refresh_token)fail('연결 유지 권한을 받지 못했어요. Google 설정에서 사이 연결을 해제한 뒤 다시 승인해주세요.');
  await saveToken(env,row.owner,{access:b.access_token,refresh:b.refresh_token,expires:Date.now()+Number(b.expires_in)*1000});
  return new Response(null,{status:303,headers:{Location:'/?integration=youtube&status=connected','Set-Cookie':'sai-oauth=; HttpOnly; SameSite=Lax; Path=/api/integrations/youtube; Max-Age=0; Secure','Cache-Control':'no-store'}});
 }
 if(!owner)return json({error:'로그인 후 사용할 수 있어요.'},401);
 if(req.method==='GET'){
  if(path==='/api/integrations/state'){const token=await env.DB.prepare("SELECT owner FROM connected_accounts WHERE owner=? AND provider='youtube'").bind(owner).first();const imports=(await env.DB.prepare('SELECT provider,records,summary,updated FROM imported_sources WHERE owner=?').bind(owner).all()).results;return json({linkedin:{configured:!!env.BRIGHT_DATA_API_KEY},youtube:{configured:configured(env),connected:!!token},imports:Object.fromEntries(imports.map(r=>[r.provider,{records:JSON.parse(r.records),summary:JSON.parse(r.summary),updated:r.updated}]))});}
  if(path==='/api/integrations/youtube/playlists'){const token=await tokens(env,owner);const result=await pages('playlists',{part:'snippet,contentDetails',mine:true},50,token,env);return json({playlists:result.items.map(p=>({id:p.id,title:p.snippet?.title||'재생목록',count:p.contentDetails?.itemCount||0})),truncated:result.truncated});}
  return json({error:'요청한 기능을 찾을 수 없어요.'},404);
 }
 if(req.method!=='POST')return json({error:'지원하지 않는 요청이에요.'},405);
 const raw=await req.text();if(raw.length>260000)fail('자료를 나눠서 가져와주세요.',413);let b;try{b=JSON.parse(raw);}catch{fail('요청 형식을 확인해주세요.');}if(!b||typeof b!=='object'||Array.isArray(b))fail('요청 형식을 확인해주세요.');
 if(path==='/api/integrations/youtube/start'){
  if(!configured(env))fail('YouTube 연결을 활성화하려면 서비스 설정이 필요해요.',503);
  const state=random(),cookie=random(),verifier=random(),challenge=base64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  await env.DB.batch([env.DB.prepare('DELETE FROM oauth_states WHERE expires<? OR owner=?').bind(Date.now(),owner),env.DB.prepare('INSERT INTO oauth_states(hash,owner,session_hash,cookie_hash,payload,expires) VALUES(?,?,?,?,?,?)').bind(await digest(state),owner,sessionHash,await digest(cookie),await seal({verifier},env,owner),Date.now()+600000)]);
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');for(const[k,v]of Object.entries({client_id:env.YOUTUBE_CLIENT_ID,redirect_uri:origin(env)+'/api/integrations/youtube/callback',response_type:'code',scope:'https://www.googleapis.com/auth/youtube.readonly',state,access_type:'offline',prompt:'consent',code_challenge:challenge,code_challenge_method:'S256'}))url.searchParams.set(k,v);
  return json({url:url.href},200,{'Set-Cookie':`sai-oauth=${cookie}; HttpOnly; SameSite=Lax; Path=/api/integrations/youtube; Max-Age=600${origin(env).startsWith('https:')?'; Secure':''}`});
 }
 if(path==='/api/integrations/youtube/import'){
  const token=await tokens(env,owner);if(!Array.isArray(b.playlistIds)||b.playlistIds.length>10||b.playlistIds.some(id=>typeof id!=='string'||!/^[\w-]{1,100}$/.test(id)))fail('재생목록을 최대 10개 선택해주세요.');
  const own=await pages('playlists',{part:'snippet',mine:true},50,token,env);if(b.playlistIds.some(id=>!own.items.some(p=>p.id===id)))fail('내 계정의 재생목록을 선택해주세요.');
  if(!b.playlistIds.length&&!b.includeSubscriptions)fail('재생목록 또는 구독 채널을 선택해주세요.');
  const records=[],seen=new Set();let truncated=false;
  for(const id of [...new Set(b.playlistIds)]){if(records.length>=100){truncated=true;break;}const r=await pages('playlistItems',{part:'snippet,contentDetails',playlistId:id},100-records.length,token,env);truncated||=r.truncated;for(const p of r.items){const vid=p.contentDetails?.videoId||p.snippet?.resourceId?.videoId;if(!vid||seen.has(vid)||['Private video','Deleted video'].includes(p.snippet?.title))continue;seen.add(vid);records.push({id:vid,title:clean(p.snippet?.title),text:clean(p.snippet?.description).slice(0,1500),url:'https://www.youtube.com/watch?v='+encodeURIComponent(vid)});}}
  if(b.includeSubscriptions){const r=await pages('subscriptions',{part:'snippet',mine:true},50,token,env);truncated||=r.truncated;for(const p of r.items){const cid=p.snippet?.resourceId?.channelId;if(cid)records.push({id:cid,title:clean(p.snippet?.title),text:clean(p.snippet?.description).slice(0,1500),url:'https://www.youtube.com/channel/'+encodeURIComponent(cid)});}}
  if(!records.length)fail('분석할 영상이나 채널 정보를 찾지 못했어요.');const cleaned=cleanRecords(records);await saveImport(env,owner,'youtube',cleaned,{records:cleaned.length,playlists:b.playlistIds.length,truncated});return json({records:cleaned.length,truncated});
 }
 if(path==='/api/integrations/linkedin/start')return json(await startLinkedin(env,owner,b));
 if(path==='/api/integrations/linkedin/result'){const r=await resultLinkedin(env,owner);if(r.status==='ready')await saveImport(env,owner,'linkedin',cleanRecords(r.records),{records:r.records.length,method:'public-profile'});return json({status:r.status});}
 if(path==='/api/integrations/linkedin/import'){const records=cleanRecords(b.records);await saveImport(env,owner,'linkedin',records,{records:records.length,fileName:clean(b.fileName).slice(0,100)});return json({records:records.length});}
 if(path==='/api/integrations/disconnect'){
  if(!['youtube','linkedin'].includes(b.provider))fail('서비스를 확인해주세요.');
  const token=await env.DB.prepare('SELECT payload FROM connected_accounts WHERE owner=? AND provider=?').bind(owner,b.provider).first();if(token){const t=await unseal(token.payload,env,owner);const r=await (env.INTEGRATION_FETCH||fetch)('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:t.refresh||t.access}),signal:AbortSignal.timeout(15000)});if(!r.ok&&r.status!==400)fail('연결 해제를 완료하지 못했어요. 다시 시도해주세요.',502);}
  await env.DB.batch([env.DB.prepare('DELETE FROM connected_accounts WHERE owner=? AND provider=?').bind(owner,b.provider),env.DB.prepare('DELETE FROM imported_sources WHERE owner=? AND provider=?').bind(owner,b.provider),env.DB.prepare('DELETE FROM oauth_states WHERE owner=?').bind(owner),env.DB.prepare("DELETE FROM imported_sources WHERE owner=? AND provider='linkedin-job' AND ?='linkedin'").bind(owner,b.provider)]);return json({ok:true});
 }
 return json({error:'요청한 기능을 찾을 수 없어요.'},404);
 }catch(e){if(path.endsWith('/callback'))return new Response(null,{status:303,headers:{Location:'/?integration=youtube&status=failed','Cache-Control':'no-store','Set-Cookie':'sai-oauth=; HttpOnly; SameSite=Lax; Path=/api/integrations/youtube; Max-Age=0; Secure'}});return json({error:e.status?e.message:'요청을 완료하지 못했어요. 다시 시도해주세요.'},e.status||500);}
}
