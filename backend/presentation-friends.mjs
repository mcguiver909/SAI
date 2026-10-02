import {exampleOwnerPrefix} from './example-friends.mjs';

// Fictional profiles belong only to the recording account; they cannot log in.
const names=['서윤','지훈','민재','하은','수빈','도윤','예린','준서','채원','시우','서연','현우','유나','지민','태민','소연','정우','다은','은우','혜원','승민','나연','건우','예진','지안','성민','수아','유진','하준'];
const themes=[
 [['재즈','음악'],['K-pop','음악'],['카페 탐방','음식']],
 [['러닝','운동'],['클라이밍','운동'],['등산','운동']],
 [['일본 여행','여행'],['사진','콘텐츠'],['맛집 탐방','음식']],
 [['영화','콘텐츠'],['독서','콘텐츠'],['전시 관람','콘텐츠']],
 [['인공지능','공부·일'],['프로그래밍','공부·일'],['스타트업','공부·일']],
 [['보드게임','게임'],['협동 게임','게임'],['베이킹','음식']],
];
export function presentationProfiles(me){
 const anchors=me.interests.filter(t=>t.shared&&t.preference!=='avoid').slice(0,2);
 return names.map((name,i)=>{const theme=i<4?0:1+Math.floor((i-4)/5);const labels=themes[theme];
 const interests=labels.map(([label,category],j)=>({id:`presentation-${i}-${j}`,label,category,shared:true,preference:'like'}));
 if(i<4)interests.push(...anchors.map((t,j)=>({...t,id:`presentation-anchor-${i}-${j}`,shared:true})));
 // Different secondary preferences leave realistic variation within each circle.
 interests.push({id:`presentation-extra-${i}`,label:['산책','도예','드로잉','홈트','요리'][i%5],category:i%5===3?'운동':'기타',shared:true,preference:i%3===0?'explore':'like'});
 return {id:`presentation-${String(i).padStart(2,'0')}`,name,bio:'새로운 사람들과 취향 이야기를 나누고 싶어요.',color:['#3154F5','#F18A62','#965FD4','#479B82'][i%4],interests:[...new Map(interests.map(t=>[t.category+':'+t.label,t])).values()]};
 });
}
export async function addPresentationFriends(db,owner,me){
 const people=presentationProfiles({...me,interests:JSON.parse(me.interests)}),now=new Date().toISOString(),statements=[];
 for(const [i,p] of people.entries()){
 const sampleOwner=exampleOwnerPrefix(owner)+'presentation-'+i;
 const previous=await db.prepare('SELECT id FROM profiles WHERE owner=?').bind(sampleOwner).first(),id=previous?.id||crypto.randomUUID();
 statements.push(db.prepare('INSERT OR IGNORE INTO profiles(id,owner,name,bio,interests,color,created) VALUES(?,?,?,?,?,?,?)').bind(id,sampleOwner,p.name,'촬영용 가상 프로필입니다. 관심사는 시연 데이터입니다.',JSON.stringify(p.interests),p.color,now));
 statements.push(db.prepare("INSERT INTO friendships(sender,recipient,status) VALUES(?,?,'accepted') ON CONFLICT(sender,recipient) DO NOTHING").bind(me.id,id));
 }
 await db.batch(statements);return {count:people.length};
}
