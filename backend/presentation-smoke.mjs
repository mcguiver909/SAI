import {ensureProfileColumns} from './profile-migration.mjs';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {api} from './api.mjs';
import {findMatches,normalizeInstagram,normalizeLinkedIn} from '../shared/matching.ts';
import {embeddingTexts,rankSemantic} from '../shared/semantic-ranking.ts';
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
for(const name of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort()){if(name.startsWith('0001_'))sqlite.exec("ALTER TABLE profiles ADD COLUMN instagram_handle TEXT NOT NULL DEFAULT ''; ALTER TABLE profiles ADD COLUMN instagram_visible TEXT NOT NULL DEFAULT 'private';");sqlite.exec(fs.readFileSync('drizzle/'+name,'utf8'));}
const DB={prepare(sql){let args=[];const stmt=sqlite.prepare(sql);return {bind(...v){args=v;return this;},async first(){return stmt.get(...args)||null;},async all(){return {results:stmt.all(...args)};},async run(){return stmt.run(...args);}};},async batch(stmts){return Promise.all(stmts.map(s=>s.run()));}};
async function call(body,token='',q=''){const result=await api(new Request('https://test.invalid/api/app'+q,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB});return {status:result.status,data:await result.json()};}
const make=async username=>(await call({action:'register',username,password:'test-password-123',confirmPassword:'test-password-123'})).data.token;
import {groupPlans} from '../shared/grouping.ts';
import {addPresentationFriends} from './presentation-friends.mjs';
const register=async username=>{const r=await call({action:'register',username,password:'test-password-123',confirmPassword:'test-password-123'});assert.equal(r.status,200);return r.data.token;};
const recording=await register('recording_user'),normal=await register('normal_user');
const interests=[{id:'jazz',label:'재즈',category:'음악',shared:true,preference:'like'},{id:'run',label:'러닝',category:'운동',shared:true,preference:'like'}];
const save={action:'saveProfile',name:'촬영자',interests,presentationSetup:true};
assert.equal((await call(save,recording)).status,200);
const data=(await call(undefined,recording)).data;
assert.equal(data.friends.length,29);assert(data.friends.every(p=>p.isExample));
const people=[data.me,...data.friends],matches=findMatches(people);
assert.equal(people.length,30);
for(const size of [3,4,5]){const plans=groupPlans(people,matches,size);assert(plans.length);for(const p of plans){const ids=[...p.groups.flatMap(g=>g.ids),...p.unassigned];assert.equal(ids.length,30);assert.equal(new Set(ids).size,30);assert(p.groups.every(g=>g.ids.length<=size&&g.interests.length>0));}console.log(JSON.stringify({size,plans:plans.length,groups:plans[0].groups.map(g=>g.ids.length),unassigned:plans[0].unassigned.length}));}
assert.equal(groupPlans(people,matches,5)[0].unassigned.length,0);
await call(save,recording);assert.equal((await call(undefined,recording)).data.friends.length,29);
// Seed operation is idempotent; another account receives no sample people.
const me=await DB.prepare('SELECT * FROM profiles WHERE id=?').bind(data.me.id).first();await addPresentationFriends(DB,me.owner,me);
assert.equal((await call(undefined,recording)).data.friends.length,29);
await call({...save,presentationSetup:false},normal);assert.equal((await call(undefined,normal)).data.friends.length,0);
await call(save,normal);assert.equal((await call(undefined,normal)).data.friends.length,0);
const plan=groupPlans(people,matches,5)[0];
const created=await call({action:'createPlannedRoom',name:'우리의 첫 모임',plan:{size:5,selected:people.map(p=>p.id),groups:plan.groups.map(g=>g.ids),unassigned:plan.unassigned}},recording);assert.equal(created.status,200);
const room=(await call(undefined,recording,'?room='+created.data.id)).data.selectedRoom;
assert.equal(room.members.length,30);assert.equal(room.pending.length,0);assert.equal(room.plan.selected.length,30);
assert.equal((await call(undefined,normal,'?room='+created.data.id)).data.selectedRoom,null);
console.log('presentation signup, account isolation, idempotency, 30-person grouping and room persistence passed');
