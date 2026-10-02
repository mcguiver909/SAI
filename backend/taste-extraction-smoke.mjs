import assert from 'node:assert/strict';
import {parseTasteOutput,extractionPrompt,validateTasteInput,prepareImportedTasteText} from '../shared/taste-extraction.ts';
const text='재즈 공연과 클라이밍을 좋아해.';
const candidates=parseTasteOutput('[["재즈 공연","음악"],["클라이밍","운동"],["축구","운동"],["재즈 공연","음악"]]',text,'like');
assert.deepEqual(candidates.map(t=>t.label),['재즈 공연','클라이밍']);
assert(candidates.every(t=>!t.shared&&t.preference==='like'));
assert.equal(parseTasteOutput('[["공포영화","콘텐츠"]]','공포영화는 피하고 싶어.','avoid')[0].preference,'avoid');
assert.throws(()=>parseTasteOutput('[["재즈"','재즈','like'));
assert.equal(parseTasteOutput('[]','딱히 없어','like').length,0);
assert.doesNotThrow(()=>validateTasteInput('연락처 010-1234-5678'));
assert(extractionPrompt('도예를 해보고 싶어','explore').at(-1).content.includes('해보고'));
console.log('PASS: grounded LLM results, deduplication, explicit preferences, private selection, malformed output and personal identifier rejection');

assert.equal(parseTasteOutput('["재즈","음악"]','재즈를 좋아해','like')[0].label,'재즈');

assert.throws(()=>validateTasteInput(''),/문장을 입력/);
assert.throws(()=>validateTasteInput('가'.repeat(1001)),/1,001자/);
assert.doesNotThrow(()=>validateTasteInput('가'.repeat(1000)));
assert.doesNotThrow(()=>validateTasteInput('재즈 https://youtube.com/watch?v=example'));
const imported=prepareImportedTasteText([{title:'재즈 공연',text:'감상 영상 https://youtube.com/watch?v=example 문의 music@example.com 010-1234-5678'}]);
assert(!imported.truncated);assert(imported.text.includes('https'));assert(imported.text.includes('@'));assert(imported.text.includes('010-1234'));assert.doesNotThrow(()=>validateTasteInput(imported.text));
assert(prepareImportedTasteText([{title:'재즈',text:'가'.repeat(1200)}]).truncated);
console.log('PASS: separate empty/length errors, 1,000-char boundary, unrestricted text input and truncation notice');
