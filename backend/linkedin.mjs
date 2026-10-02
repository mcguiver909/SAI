import {normalizeLinkedIn,contactOrSensitive} from '../shared/matching.ts';
const error=(s,status=400)=>Object.assign(new Error(s),{status});
const text=s=>String(s||'').replace(/<[^>]*>/g,' ').trim();
function values(v){if(typeof v==='string')return text(v);if(Array.isArray(v))return v.map(values).filter(Boolean).join(' · ');if(v&&typeof v==='object')return ['title','name','degree','field_of_study','field','school','university','description','subtitle','school_name','degree_name'].map(k=>values(v[k])).filter(Boolean).join(' · ');return '';}
export function linkedinRecords(profile,url){
 const sections=[['전공·학력',profile.education||profile.educations_details],['소개',profile.about],['관심사',profile.interests],['전문 분야',profile.skills],['경험',profile.experience],['수강·자격',profile.courses||profile.certifications],['프로젝트',profile.projects]];
 return sections.flatMap(([title,value])=>{const t=values(value);if(!t||contactOrSensitive(t))return [];return Array.from({length:Math.min(12,Math.ceil(t.length/1600))},(_,i)=>({id:`linkedin-${title}-${i}`,title,text:t.slice(i*1600,(i+1)*1600),url}));});
}
export async function brightRequest(env,path,body){if(!env.BRIGHT_DATA_API_KEY)throw error('LinkedIn 링크 가져오기는 연결 설정 후 사용할 수 있어요.',503);const r=await (env.BRIGHT_FETCH||fetch)('https://api.brightdata.com/datasets/v3/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+env.BRIGHT_DATA_API_KEY,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw error('LinkedIn 정보를 가져오지 못했어요. 잠시 후 다시 시도해주세요.',502);return r.json();}
export async function startLinkedin(env,owner,b){
 if(b.isMine!==true||b.consent!==true)throw error('내 공개 프로필을 Bright Data로 가져오는 데 동의해주세요.');const handle=normalizeLinkedIn(String(b.url||''));if(!handle)throw error('내 LinkedIn 프로필 링크를 입력해주세요.');const url='https://www.linkedin.com/in/'+encodeURIComponent(handle)+'/';
 const prior=await env.DB.prepare("SELECT summary FROM imported_sources WHERE owner=? AND provider='linkedin-job'").bind(owner).first();if(prior&&Date.now()-JSON.parse(prior.summary).started<3600000)throw error('한 시간에 한 번 가져올 수 있어요. 기존 결과를 확인해주세요.',429);
 const day=new Date().toISOString().slice(0,10);for(const [key,limit] of [[day+':bright-global',25],[day+':bright-'+owner,3]]){const used=await env.DB.prepare('INSERT INTO ai_usage(key,used) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET used=used+1 WHERE used<? RETURNING used').bind(key,limit).first();if(!used)throw error('오늘의 LinkedIn 가져오기 한도에 도달했어요.',429);}
 const r=await brightRequest(env,'trigger?dataset_id=gd_l1viktl72bvl7bjuj0&format=json',[{url}]);if(!/^s_[\w-]+$/.test(r.snapshot_id||''))throw error('가져오기 요청을 확인하지 못했어요.',502);
 await env.DB.prepare("INSERT INTO imported_sources(owner,provider,records,summary,updated) VALUES(?,'linkedin-job','[]',?,?) ON CONFLICT(owner,provider) DO UPDATE SET summary=excluded.summary,updated=excluded.updated").bind(owner,JSON.stringify({snapshot:r.snapshot_id,url,started:Date.now()}),new Date().toISOString()).run();return {status:'running'};
}
export async function resultLinkedin(env,owner){
 const row=await env.DB.prepare("SELECT summary FROM imported_sources WHERE owner=? AND provider='linkedin-job'").bind(owner).first();if(!row)throw error('먼저 내 프로필 가져오기를 시작해주세요.');const job=JSON.parse(row.summary);if(Date.now()-job.started>86400000)throw error('가져오기 요청이 만료됐어요. 다시 시작해주세요.');
 const p=await brightRequest(env,'progress/'+encodeURIComponent(job.snapshot));if(['failed','canceled'].includes(p.status))throw error('공개 프로필을 찾지 못했어요. 소개·전공을 직접 입력할 수도 있어요.',502);if(p.status!=='ready')return {status:'running'};
 const data=await brightRequest(env,'snapshot/'+encodeURIComponent(job.snapshot)+'?format=json');if(!Array.isArray(data)||data.length!==1||data[0].error)throw error('공개 프로필 내용을 찾지 못했어요.',502);
 const returned=data[0].input_url||data[0].url;if(returned&&normalizeLinkedIn(String(returned)).toLowerCase()!==normalizeLinkedIn(job.url).toLowerCase())throw error('가져온 프로필 주소가 맞지 않아요.',502);const records=linkedinRecords(data[0],job.url);if(!records.length)throw error('공개된 전공·관심사 내용이 없어요. 직접 입력으로 추가해주세요.');return {status:'ready',records};
}
