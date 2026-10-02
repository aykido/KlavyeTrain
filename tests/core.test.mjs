import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lowerTR, equalTR, createSession, recordKey, submitWords, metrics, trainingLevel, feedback, chooseTarget, mergeKeyStats, keyboardKeys } from '../src/core.mjs';
import { StorageManager, validSession } from '../src/storage.mjs';
const config = JSON.parse(await readFile(new URL('../data/config.json',import.meta.url)));
const layouts = JSON.parse(await readFile(new URL('../data/keyboards.json',import.meta.url)));
const session = () => createSession('TR_Q','WORDS',2,new Date('2026-10-02T10:00:00Z'));
test('Türkçe I/İ/ı/i ve Unicode normalizasyonu',()=>{
  assert.equal(lowerTR('Iİıi'),'ıiıi');
  assert.equal(equalTR('I','ı',false),true); assert.equal(equalTR('İ','i',false),true);
  assert.equal(equalTR('I','i',false),false); assert.equal(equalTR('ı','i'),false);
  assert.equal(equalTR('İ','i'),false); assert.equal(equalTR('ş','s\u0327'),true);
});
test('ilk vuruş doğruluğu, karışıklıklar ve gerçek/standart hız ayrımı',()=>{
  const s = session();
  for (const [expected,actual] of [['ş','s'],['ş','ş'],['ı','i'],['ğ','ğ']]) recordKey(s,expected,actual);
  submitWords(s,'bir iki','bir iki');
  const r = metrics(s,30);
  assert.equal(r.accuracy,50); assert.equal(r.realWordsPerMinute,4);
  assert.equal(r.standardWpm,1.6); assert.equal(r.netWpm,.8); assert.equal(r.cpm,8);
  assert.equal(r.confusions['ş→s'],1); assert.equal(r.confusions['ı→i'],1);
  assert.equal(r.keyStats['ş'].attempts,2); assert.ok(r.weakKeys.includes('ı'));
});
test('eksik, fazla ve büyük/küçük harfi farklı kelimeler yanlış sayılır',()=>{
  const s=session(); submitWords(s,'İyi günler dünya','iyi günler');
  assert.equal(s.correctWords,1); assert.equal(s.incorrectWords,2);
  submitWords(s,'bir','bir iki'); assert.equal(s.incorrectWords,3);
});
test('sıfır süre güvenli; hız doğruluk hedefinin önüne geçmez',()=>{
  const r=metrics(session(),0); assert.equal(r.cpm,0); assert.equal(r.accuracy,100);
  assert.equal(trainingLevel({...r,realWordsPerMinute:38,accuracy:86},config),'Başlangıç');
  assert.equal(trainingLevel({...r,realWordsPerMinute:30,accuracy:95},config),'Hedef');
  assert.match(feedback({...r,totalCharacters:1,realWordsPerMinute:38,accuracy:86}),/doğruluğa/);
});
test('adaptif seçim zor tuşları artırır, normal kelimeleri ve çeşitliliği korur',()=>{
  const pool=['el','şiş'],stats={'ş':{attempts:10,errors:10}};
  const counts={el:0,'şiş':0};
  for(let i=0;i<1000;i++) counts[chooseTarget(pool,stats,[],()=>i/1000)]++;
  assert.ok(counts['şiş']>counts.el*2); assert.ok(counts.el>100);
  assert.equal(chooseTarget(pool,stats,['şiş'],()=>.99),'el');
  assert.equal(chooseTarget(['el'],{},['el']),'el');
  assert.throws(()=>chooseTarget([]),/içerik/);
});
test('oturum JSON dönüşümü ve hatalı veri doğrulaması',()=>{
  const r=metrics(session(),60); assert.ok(validSession(JSON.parse(JSON.stringify(r))));
  assert.equal(validSession({...r,accuracy:NaN}),false);
  assert.equal(validSession({...r,keyStats:{a:{attempts:1,errors:3}}}),false);
  assert.equal(validSession({...r,version:2}),false);
});
const memory=()=>{const map=new Map();return {getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)};};
test('geçmiş en fazla 20 geçerli kayıt tutar',()=>{
  const store=new StorageManager(memory());
  store.saveHistory(Array.from({length:25},(_,i)=>({...metrics(session(),60),id:String(i)})));
  assert.equal(store.history().length,20); assert.equal(store.history()[0].id,'5');
});
test('kapalı/dolu ve bozuk localStorage uygulamayı çökertmez',()=>{
  const messages=[]; const store=new StorageManager({getItem(){throw Error('disabled');},setItem(){throw Error('full');}},m=>messages.push(m));
  assert.equal(store.settings().help,1); assert.deepEqual(store.history(),[]);
  assert.equal(store.saveHistory([]),false); assert.ok(messages.length>=3);
  const bad=memory();bad.setItem('klavyetrain.history.v1','{broken');assert.deepEqual(new StorageManager(bad).history(),[]);
});
test('bilinmeyen şema sürümü korunur',()=>{
  const m=memory();m.setItem('klavyetrain.history.v1','{"version":2,"sessions":[]}');
  const store=new StorageManager(m); assert.deepEqual(store.history(),[]);assert.equal(store.saveHistory([]),false);
  assert.equal(JSON.parse(m.getItem('klavyetrain.history.v1')).version,2);
});
test('F ve Q haritalarında Türkçe karakterler ve parmak verileri vardır',()=>{
  for(const layout of Object.values(layouts)) {
    const keys=keyboardKeys(layout).flat();
    for(const char of 'çğıöşü') assert.ok(keys.some(key=>key.key===char));
    assert.ok(keys.every(key=>key.finger && Number.isInteger(key.position)));
  }
  assert.equal(layouts.TR_F.rows[1],'fgğıodrnhpqw');
  assert.deepEqual(mergeKeyStats([{keyStats:{'ş':{attempts:2,errors:1}}},{keyStats:{'ş':{attempts:3,errors:1}}}]),{'ş':{attempts:5,errors:2}});
});
