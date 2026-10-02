import {canonical,contactOrSensitive,positiveInterests,preferenceOf,type Profile} from './matching.ts';

export type BridgeTopic={id:string;label:string;reason:string;members:string[];evidence:{profile:string;interest:string;label:string;category:string;connection:string;relevance?:number}[];similarity?:number};
const broad=new Set(['문화','취미','엔터테인먼트','여행','음악','콘텐츠','공부','운동','일상','대화','culture','hobbies','entertainment']);
export function bridgeProfiles(people:Profile[]){return people.map(p=>({id:p.id,interests:positiveInterests(p).slice(0,12).map(t=>({id:t.id,label:t.label,category:t.category})),avoid:p.interests.filter(t=>t.shared&&preferenceOf(t)==='avoid').map(t=>t.label).slice(0,12)}));}
export function parseBridgeTopics(raw:string,people:Profile[],directLabels:string[]=[]):BridgeTopic[]{
 let data;try{data=JSON.parse(raw);}catch{throw new Error('연결 주제를 정리하지 못했어요. 다시 시도해주세요.');}
 if(!Array.isArray(data?.topics))throw new Error('연결 주제 응답을 확인하지 못했어요. 다시 시도해주세요.');
 const seen=new Set(directLabels.map(canonical));const topics:BridgeTopic[]=[];
 for(const c of data.topics.slice(0,3)){
  if(typeof c?.label!=='string'||!c.label.trim()||c.label.length>60||typeof c.reason!=='string'||!c.reason.trim()||c.reason.length>240||!Array.isArray(c.links))continue;
  const label=c.label.trim(),key=canonical(label);if(seen.has(key)||broad.has(key)||contactOrSensitive(label+' '+c.reason))continue;
  const evidence:BridgeTopic['evidence']=[];let invalid=false;
  for(const p of people){
   const links=c.links.filter((r:any)=>r?.profile===p.id);
   if(links.length!==1){invalid=true;break;}
   const link=links[0],t=positiveInterests(p).slice(0,12).find(t=>t.id===link.interest);
   if(!t||typeof link.connection!=='string'||!link.connection.trim()||link.connection.length>180||contactOrSensitive(link.connection)){invalid=true;break;}
   const avoid=p.interests.filter(t=>t.shared&&preferenceOf(t)==='avoid');
   if(avoid.some(t=>key.includes(canonical(t.label))||canonical(t.label)===canonical(label))){invalid=true;break;}
   evidence.push({profile:p.id,interest:t.id,label:t.label,category:t.category,connection:link.connection});
  }
  if(invalid||c.links.length!==people.length||evidence.length<2)continue;
  seen.add(key);topics.push({id:'bridge-'+key,label,reason:c.reason,members:people.map(p=>p.id),evidence});
 }
 return topics;
}
export function bridgeTexts(topics:BridgeTopic[]){return topics.flatMap(t=>['관심사: '+t.label,...t.evidence.map(e=>'관심사: '+e.label)]);}
// Initial relevance thresholds, not calibrated probabilities of shared preference.
export function validateBridgeVectors(topics:BridgeTopic[],vectors:number[][],minimum=.35,consensusMinimum=.45):BridgeTopic[]{
 if(vectors.length!==bridgeTexts(topics).length)throw new Error('연결 주제와 벡터 수가 다릅니다.');
 let offset=0;
 return topics.flatMap(t=>{
  const topic=vectors[offset++];const evidence=t.evidence.map(e=>{const interest=vectors[offset++];const relevance=topic.length===interest.length?topic.reduce((sum,v,i)=>sum+v*interest[i],0):NaN;return {...e,relevance:Math.max(0,Math.min(1,relevance))};});
  if(evidence.some(e=>!Number.isFinite(e.relevance)||e.relevance<minimum))return [];
  const similarity=evidence.length/evidence.reduce((sum,e)=>sum+1/e.relevance,0);
  return similarity>=consensusMinimum?[{...t,evidence,similarity}]:[];
 }).sort((a,b)=>b.similarity!-a.similarity!);
}
