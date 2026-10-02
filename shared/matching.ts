export type Interest={id:string;label:string;category:string;shared:boolean};
export type Profile={id:string;name:string;bio:string;color:string;interests:Interest[]};
export type Match={id:string;label:string;category:string;kind:'exact'|'related'|'ai';members:string[];evidence:{profile:string;label:string}[];reason:string};
export const categories=['전체','음악','게임','여행','운동','콘텐츠','음식','공부·일','기타'];
const aliases:Record<string,string>={'데이식스':'day6','데식':'day6','day6':'day6','하데스':'hades','hades':'hades','인공지능':'ai','ai/ml':'ai','머신러닝':'machinelearning','기계학습':'machinelearning','넷플릭스':'netflix'};
export function canonical(s:string){const k=s.toLowerCase().replace(/[\s·_\-]/g,'');return aliases[k]||k;}
const concepts=[{label:'일본 여행',category:'여행',words:['일본','교토','오사카','도쿄','후쿠오카']},{label:'데이터·AI',category:'공부·일',words:['인공지능','머신러닝','기계학습','데이터','machinelearning']},{label:'야외 활동',category:'운동',words:['러닝','등산','하이킹','트레킹']}];
export function findMatches(profiles:Profile[]):Match[]{
 const map=new Map<string,Match>();
 for(const p of profiles)for(const t of p.interests.filter(t=>t.shared)){
  const key=canonical(t.label);if(!key)continue;
  let m=map.get(key);if(!m){m={id:'exact-'+key,label:key==='day6'?'DAY6':t.label,category:t.category,kind:'exact',members:[],evidence:[],reason:'같은 관심사를 선택했어요.'};map.set(key,m);}
  if(!m.members.includes(p.id)){m.members.push(p.id);m.evidence.push({profile:p.id,label:t.label});}
 }
 const result=[...map.values()].filter(x=>x.members.length>=2);
 for(const c of concepts){const evidence=profiles.flatMap(p=>{const t=p.interests.find(t=>t.shared&&c.words.some(w=>canonical(t.label).includes(canonical(w))));return t?[{profile:p.id,label:t.label}]:[];});
  if(evidence.length<2||new Set(evidence.map(x=>canonical(x.label))).size<2)continue;
  result.push({id:'related-'+c.label,label:c.label,category:c.category,kind:'related',members:evidence.map(x=>x.profile),evidence,reason:'서로 다른 항목을 같은 관심 분야로 묶었어요.'});}
 return result.sort((a,b)=>b.members.length-a.members.length||(a.kind==='exact'?0:1)-(b.kind==='exact'?0:1)||a.label.localeCompare(b.label));
}
export function contactOrSensitive(s:string){return /(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}|\d{6}[- ]?[1-4]\d{6}|https?:\/\/|비밀번호|비번|주민등록)/i.test(s);}
export const demo:Profile[]=[
 {id:'demo-a',name:'혜진',bio:'음악, 게임, 가끔은 여행',color:'#3154F5',interests:[['DAY6','음악'],['하데스','게임'],['교토 여행','여행'],['머신러닝','공부·일'],['러닝','운동']].map(([label,category],i)=>({id:'a'+i,label,category,shared:true}))},
 {id:'demo-b',name:'지우',bio:'좋아하는 건 오래 좋아해요',color:'#E54B31',interests:[['데이식스','음악'],['일본 여행','여행'],['데이터 분석','공부·일'],['클라이밍','운동'],['커피','음식']].map(([label,category],i)=>({id:'b'+i,label,category,shared:true}))},
 {id:'demo-c',name:'민서',bio:'플레이리스트 수집 중',color:'#9B53DC',interests:[['DAY6','음악'],['오사카 여행','여행'],['러닝','운동'],['영화','콘텐츠'],['커피','음식']].map(([label,category],i)=>({id:'c'+i,label,category,shared:true}))},
 {id:'demo-d',name:'준호',bio:'함께 게임할 사람 찾는 중',color:'#19876E',interests:[['하데스','게임'],['일본 여행','여행'],['클라이밍','운동'],['영화','콘텐츠'],['사진','기타']].map(([label,category],i)=>({id:'d'+i,label,category,shared:true}))}
];
