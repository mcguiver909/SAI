import React from 'react';
import {View,Text,ScrollView,Pressable,Modal,StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import type {Profile,Match} from '../shared/matching';
import type {BridgeTopic} from '../shared/bridge-topics';
import {interestScore} from '../shared/grouping';

export default function TopicDetail({topic,people,onClose,Avatar}:{topic:Match|BridgeTopic|null;people:Profile[];onClose:()=>void;Avatar:React.ComponentType<{p:Profile;size?:number}>}){
 const bridge=!!topic&&!('kind' in topic),score=topic?(bridge?Math.round((topic.similarity||0)*100):interestScore(topic as Match,people)):0;
 return <Modal visible={!!topic} animationType="slide" onRequestClose={onClose}><SafeAreaView style={s.safe}><View style={s.shell}><View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="추천 결과로 돌아가기" onPress={onClose} style={s.back}><Ionicons name="arrow-back" size={22}/><Text>뒤로</Text></Pressable><Text style={s.meta}>추천 근거</Text></View><ScrollView contentContainerStyle={s.body}>
 <Text style={s.eyebrow}>{bridge?'연결 주제':'공통 관심사'}</Text><Text style={s.title}>{topic?.label}</Text>
 <View style={s.summary}><View style={s.row}><Text style={s.label}>{bridge?'주제 관련성':'추천 점수'}</Text><Text style={s.score}>{score}<Text style={s.meta}> 점</Text></Text></View><Text style={s.description}>{topic?.reason}</Text><Text style={s.meta}>{topic?.members.length}/{people.length}명에게 연결되는 주제</Text></View>
 <Text style={s.section}>사람별 연결 근거</Text>
 {topic?.evidence.map((e,i)=>{const p=people.find(p=>p.id===e.profile);if(!p)return null;return <View key={e.profile+'-'+i} style={s.card}><View style={[s.row,{justifyContent:"flex-start"}]}><Avatar p={p} size={38}/><Text style={s.label}>{p.name}</Text></View><View style={s.tag}><Text style={s.tagText}>{e.label}</Text></View>{'connection' in e&&<Text style={s.description}>{String(e.connection)}</Text>}{'relevance' in e&&<><View style={s.track}><View style={[s.bar,{width:`${Math.round((Number(e.relevance)||0)*100)}%`}]}/></View><Text style={s.meta}>주제 관련성 {Math.round((Number(e.relevance)||0)*100)}점</Text></>}</View>;})}
 <Text style={s.meta}>{bridge?'함께 이야기해볼 대화 제안이에요. 이미 좋아하는 취향으로 확정한 것은 아니에요.':(topic as Match)?.kind==='exact'?'동일한 대상의 다른 표기는 통일했어요.':'서로 관련된 관심사를 연결한 후보예요.'} 점수는 관계가 잘될 확률이 아니에요.</Text>
 </ScrollView></View></SafeAreaView></Modal>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'white'},shell:{flex:1,maxWidth:600,width:'100%',alignSelf:'center'},header:{height:64,paddingHorizontal:24,borderBottomWidth:1,borderColor:'#E9E9EC',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{flexDirection:'row',gap:8,alignItems:'center',paddingVertical:12},body:{padding:24,gap:18,paddingBottom:40},eyebrow:{fontSize:11,color:'#71717A',fontWeight:'700'},title:{fontSize:29,lineHeight:39,fontWeight:'700',color:'#18181B'},summary:{padding:22,borderRadius:19,backgroundColor:'#F6F6F7',gap:16},row:{flexDirection:'row',alignItems:'center',gap:12,justifyContent:'space-between'},label:{fontSize:15,fontWeight:'600',color:'#18181B'},score:{fontSize:34,fontWeight:'700',color:'#18181B'},description:{fontSize:14,lineHeight:23,color:'#71717A'},meta:{fontSize:12,lineHeight:19,color:'#71717A'},section:{fontSize:18,fontWeight:'700',marginTop:14},card:{padding:20,borderRadius:19,borderWidth:1,borderColor:'#E9E9EC',gap:16},tag:{backgroundColor:'#F0F0F2',paddingHorizontal:10,paddingVertical:7,borderRadius:8,alignSelf:'flex-start'},tagText:{fontSize:13,color:'#5B5B65'},track:{height:4,backgroundColor:'#EEEEF0',borderRadius:3},bar:{height:4,backgroundColor:'#18181B',borderRadius:3}});
