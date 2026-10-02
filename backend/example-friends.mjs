const members=[
 ['아이브','안유진',['K-pop','러닝','일본 여행']],['아이브','가을',['K-pop','댄스','사진']],['아이브','레이',['K-pop','그림','일본 여행']],['아이브','장원영',['K-pop','카페 탐방','사진']],['아이브','리즈',['재즈','K-pop','카페 탐방']],['아이브','이서',['K-pop','댄스','영화']],
 ['리센느','원이',['재즈','러닝','카페 탐방']],['리센느','리브',['러닝','클라이밍','일본 여행']],['리센느','미나미',['K-pop','일본 여행','그림']],['리센느','메이',['재즈','사진','영화']],['리센느','제나',['K-pop','댄스','클라이밍']],
];
const category=label=>['K-pop','재즈'].includes(label)?'음악':['러닝','댄스','클라이밍'].includes(label)?'운동':label==='일본 여행'?'여행':label==='카페 탐방'?'음식':['그림','사진','영화'].includes(label)?'콘텐츠':'기타';
export const exampleOwnerPrefix=owner=>'example:'+owner+':';
export async function addExampleFriends(db,owner,me){
 const now=new Date().toISOString(),colors=['#3154F5','#F18A62','#965FD4','#479B82'];
 const shared=JSON.parse(me.interests).filter(t=>t.shared&&t.preference!=='avoid').slice(0,2);
 const statements=[];
 for(let i=0;i<members.length;i++){
  const [group,name,labels]=members[i],sampleOwner=exampleOwnerPrefix(owner)+i;
  const previous=await db.prepare('SELECT id FROM profiles WHERE owner=?').bind(sampleOwner).first(),id=previous?.id||crypto.randomUUID();
  const interests=[...labels.map((label,j)=>({id:`example-${i}-${j}`,label,category:category(label),shared:true,preference:'like'})),...shared.map((t,j)=>({...t,id:`example-shared-${i}-${j}`,shared:true}))];
  const unique=[...new Map(interests.map(t=>[t.category+':'+t.label,t])).values()];
  statements.push(db.prepare('INSERT OR IGNORE INTO profiles(id,owner,name,bio,interests,color,created) VALUES(?,?,?,?,?,?,?)').bind(id,sampleOwner,`${name} · 예시`,`${group} 멤버 이름을 참고한 가상 프로필입니다. 취향은 예시 데이터이며 실제 인물의 취향이 아닙니다.`,JSON.stringify(unique),colors[i%4],now));
  statements.push(db.prepare("INSERT INTO friendships(sender,recipient,status) VALUES(?,?,'accepted') ON CONFLICT(sender,recipient) DO UPDATE SET status='accepted'").bind(me.id,id));
 }
 await db.batch(statements);return {ok:true,count:members.length};
}
