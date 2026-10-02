import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceStreak,validDay,localDay,heatData,keyHeat} from '../src/progress.mjs';
import {StorageManager} from '../src/storage.mjs';
import {shortcutChord,shortcutEffect,shortcutTasks} from '../src/shortcuts.mjs';

test('seri tekrarları saymaz, dünü korur, boş günde kesilir ve geleceği dışlar',()=>{
  const days=['2026-09-29','2026-09-30','2026-10-01','2026-10-01','2026-10-10','2026-99-99'];
  assert.deepEqual(practiceStreak(days,'2026-10-02'),{current:3,best:3,totalDays:3,today:false});
  assert.equal(practiceStreak(days,'2026-10-03').current,0);
  assert.equal(practiceStreak([...days,'2026-10-02'],'2026-10-02').current,4);
  assert.equal(validDay('2026-02-30'),false);assert.equal(validDay('2026-99-99'),false);
  assert.equal(localDay(new Date(2026,9,2,0,30)),'2026-10-02');
});
test('ısı haritası düzenleri ayırır, hata oranı örnek sayısıyla hesaplanır',()=>{
  const stats=heatData([{keyboardLayout:'TR_Q',keyStats:{'ş':{attempts:10,errors:2}}},{keyboardLayout:'TR_Q',keyStats:{'ş':{attempts:30,errors:2}}},{keyboardLayout:'TR_F',keyStats:{'ş':{attempts:2,errors:2}}}], 'TR_Q');
  assert.deepEqual(stats['ş'],{attempts:40,errors:4});assert.equal(keyHeat(stats['ş']).rate,.1);
  assert.equal(keyHeat({attempts:10,errors:0}).level,'good');assert.equal(keyHeat().level,'none');
});
test('seri tarihleri ayrı saklanır ve desteklenmeyen şema ezilmez',()=>{
  const saved=new Map(),storage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)};
  const store=new StorageManager(storage);const days=Array.from({length:25},(_,i)=>localDay(new Date(2026,8,i+1)));
  store.saveActivityDays([...days,...days]);store.saveHistory([]);assert.equal(store.activityDays().length,25);
  saved.set('klavyetrain.activity.v1','{"version":2,"days":[]}');assert.deepEqual(store.activityDays(),[]);
  assert.equal(store.saveActivityDays(days),false);assert.equal(JSON.parse(saved.get('klavyetrain.activity.v1')).version,2);
});
test('kısayol eşleşmesi değiştirici tuşları ayırt eder ve düzenleme etkisini gösterir',()=>{
  assert.equal(shortcutChord({key:'C',ctrlKey:true,shiftKey:false}),'Ctrl+c');
  assert.equal(shortcutChord({key:'z',metaKey:true,shiftKey:true}),'Ctrl+Shift+z');
  assert.equal(shortcutChord({key:'Control',ctrlKey:true}),null);
  assert.equal(shortcutChord({key:'c',ctrlKey:true,altKey:true}),null);
  const cut=shortcutEffect(shortcutTasks.find(task=>task.id==='cut'),'Türkçe metin');assert.equal(cut.text,' metin');
  const paste=shortcutEffect(shortcutTasks.find(task=>task.id==='paste'),'metin');assert.equal(paste.text,'Türkçe metin');
});
