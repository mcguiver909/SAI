import {canonical} from '../shared/matching.ts';
let ready;const cache=new Map();
export async function semanticPairs(people){
 const {pipeline,env}=await import('@huggingface/transformers');env.cacheDir='.data/models';
 ready??=pipeline('feature-extraction','Xenova/multilingual-e5-small',{dtype:'q8'});const extractor=await ready;
 const tags=people.flatMap(p=>p.interests.filter(t=>t.shared).map(t=>({profile:p.id,...t})));
 const texts=tags.map(t=>'query: '+t.category+' 관심사: '+t.label);const missing=[...new Set(texts.filter(t=>!cache.has(t)))];
 if(missing.length){const output=await extractor(missing,{pooling:'mean',normalize:true});output.tolist().forEach((v,i)=>cache.set(missing[i],v));}
 const pairs=[];
 for(let i=0;i<tags.length;i++)for(let j=i+1;j<tags.length;j++){
  const a=tags[i],b=tags[j];if(a.profile===b.profile||a.category!==b.category||canonical(a.label)===canonical(b.label))continue;
  const va=cache.get(texts[i]),vb=cache.get(texts[j]);const score=va.reduce((n,v,k)=>n+v*vb[k],0);
  // Experimental candidate threshold, not a calibrated probability of shared taste.
  if(score>=Number(process.env.E5_MIN_SIMILARITY||.86))pairs.push({a,b,score});
 }
 if(cache.size>1500)cache.clear();return pairs.sort((a,b)=>b.score-a.score).slice(0,12).map((p,i)=>({id:'e5-'+i,label:p.a.label+' · '+p.b.label,category:p.a.category,kind:'related',members:[p.a.profile,p.b.profile],evidence:[{profile:p.a.profile,label:p.a.label},{profile:p.b.profile,label:p.b.label}],reason:'공개 다국어 임베딩 모델이 가까운 의미로 찾은 후보예요. 같은 취향으로 확정한 것은 아니에요.',similarity:p.score}));
}
