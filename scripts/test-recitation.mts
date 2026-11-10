import fs from 'fs';
import {
  normalizeWord, tokenizeWords, stripTags, expectedWordsFromVerses,
  matchLive, scoreOf, similarity,
} from '../src/lib/recitation.ts';

const d = JSON.parse(fs.readFileSync('./public/text/qpc-hafs-tajweed.json','utf8'));
const verse = (s:number,v:number) => ({ surah:s, verse:v, text:d[`${s}:${v}`].text });
let fail = 0;
const ok = (name:string, cond:boolean, extra='') => {
  console.log(`  ${cond?'PASS':'FAIL'}  ${name}${extra?'  '+extra:''}`);
  if(!cond) fail++;
};

console.log('normalizeWord');
ok('bism', normalizeWord('بِسۡمِ')==='بسم', normalizeWord('بِسۡمِ'));
ok('ar-rahman', normalizeWord('ٱلرَّحۡمَٰنِ')==='الرحمن', normalizeWord('ٱلرَّحۡمَٰنِ'));
ok('ZWNJ folded', normalizeWord('رَيۡبَ‌ۛ')==='ريب', normalizeWord('رَيۡبَ‌ۛ'));
ok('nothing empties', normalizeWord('نَسۡتَعِينُ').length>0);

console.log('\ntokenizeWords');
ok('2:30 -> 29 tokens', tokenizeWords(d['2:30'].text).length===29, String(tokenizeWords(d['2:30'].text).length));
let lossless=0, tot=0;
for(const k of Object.keys(d)){
  tot++;
  const t=tokenizeWords(d[k].text).map(stripTags).filter(s=>s.trim());
  const p=stripTags(d[k].text).split(/\s+/).filter(Boolean);
  if(t.length===p.length && t.every((s,i)=>s===p[i])) lossless++;
}
ok(`lossless on all verses`, lossless===tot, `${lossless}/${tot}`);

console.log('\nexpectedWordsFromVerses');
const fatiha = expectedWordsFromVerses([1,2,3,4,5,6,7].map(v=>verse(1,v)));
ok('Al-Fatiha -> 29 words (no ayah numbers)', fatiha.length===29, String(fatiha.length));
ok('no empty norms', fatiha.every(w=>w.norm.length>0));
ok('rule tags preserved in html', expectedWordsFromVerses([verse(2,30)]).some(w=>w.html.includes('<rule')));
const sajdah = expectedWordsFromVerses([verse(7,206)]);
ok('sajdah sign dropped', !sajdah.some(w=>w.plain.includes('۩')));
ok('37:130 keeps all words (no trailing number)', expectedWordsFromVerses([verse(37,130)]).length===4,
   String(expectedWordsFromVerses([verse(37,130)]).length));

console.log('\nmatchLive');
const words = fatiha.map(w=>w.norm);
let st = matchLive(fatiha, words, false);
ok('perfect recitation completes', st.cursor===fatiha.length && st.status.every(s=>s==='correct'));
ok('score counts all correct', scoreOf(st).correct===29, JSON.stringify(scoreOf(st)));

st = matchLive(fatiha, words.slice(0,3), false);
ok('partial leaves cursor at 3', st.cursor===3);
ok('unreached words pending', st.status[5]==='pending');

st = matchLive(fatiha, [words[0], 'كتاب'], true);
ok('wait mode holds on wrong word', st.waiting===true && st.cursor===1,
   `cursor=${st.cursor} waiting=${st.waiting}`);
st = matchLive(fatiha, [words[0], 'كتاب', ...words.slice(1)], true);
ok('wait mode recovers when the word is finally said', st.cursor===fatiha.length && !st.waiting,
   `cursor=${st.cursor}`);

st = matchLive(fatiha, [words[0], 'كتاب', ...words.slice(1)], false);
ok('non-wait flags and advances', st.status[1]==='mismatch'||st.status[1]==='substitution');

st = matchLive(fatiha, [words[0], words[2]], false);
ok('skip detected via lookahead', st.status[1]==='skipped' && st.status[2]==='correct');

st = matchLive(fatiha, [words[0], words[0], words[1]], false);
ok('repeat ignored', st.cursor===2 && st.status[1]==='correct');

st = matchLive(fatiha, [words[0]], true, new Set([1,2]));
ok('revealed words skipped', st.cursor===3 && st.status[1]==='revealed');
ok('reveal counted in score', scoreOf(st).revealed===2);

console.log('\nsimilarity');
ok('identical = 1', similarity('كتاب','كتاب')===1);
ok('near miss high', similarity('كتاب','كتب')>=0.7);
ok('unrelated low', similarity('كتاب','الحمد')<0.7);

console.log(fail===0 ? '\nALL PASS' : `\n${fail} FAILURES`);
process.exit(fail?1:0);
