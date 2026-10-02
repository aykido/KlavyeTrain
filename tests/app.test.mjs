import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import {shortcutTasks} from '../src/shortcuts.mjs';
import {createSession,metrics} from '../src/core.mjs';
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
function boot(saved, now) {
  const errors=[];
  const virtualConsole=new VirtualConsole(); virtualConsole.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:'https://klavye.test/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole,
    beforeParse(window){
      window.matchMedia=()=>({matches:false,addEventListener(){}}); window.scrollTo=()=>{}; window.confirm=()=>true;
      if(now) Object.defineProperty(window.performance, 'now', {value: now});
      if(saved) for(const [key,value] of Object.entries(saved)) window.localStorage.setItem(key,value);
    }});
  const $=selector=>dom.window.document.querySelector(selector);
  return {dom,$,errors,click:selector=>$(selector).click(),close:()=>dom.window.close()};
}
function type(app,text) {
  for(const char of text) {
    const input=app.$('#typing'); input.value+=char;
    input.dispatchEvent(new app.dom.window.InputEvent('input',{bubbles:true,data:char,inputType:'insertText'}));
  }
}
function enter(app) { app.$('#typing').dispatchEvent(new app.dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})); }
function startWords(app){app.click('[data-layout="TR_Q"]');app.click('[data-mode="WORDS"]');app.click('#setup-form button[type="submit"]');}
function startFlow(app) {
  app.click('[data-layout="TR_Q"]');app.click('[data-mode="FLOW"]');
  app.$('#duration').value='60';app.click('#setup-form button[type="submit"]');
}
function flowWord(app, index) { return app.$(`[data-flow-word="${index}"]`).textContent; }
test('Türkçe odaklı set akıcı editörde boşlukla ilerler ve set kaydedilir',()=>{
  const app=boot();try {
    app.click('[data-layout="TR_Q"]');app.click('[data-mode="TURKISH"]');
    assert.equal(app.dom.window.document.querySelectorAll('#turkish-set option').length,4);
    app.$('#turkish-set').value='punctuation';app.$('#turkish-set').dispatchEvent(new app.dom.window.Event('change'));
    app.click('#setup-form button[type="submit"]');assert.equal(app.$('#typing').tagName,'TEXTAREA');
    const target=flowWord(app,0);type(app,target+' ');assert.equal(app.$('#word-count').textContent,'1');app.click('#finish');
    const saved=JSON.parse(app.dom.window.localStorage.getItem('klavyetrain.history.v1')).sessions[0];
    assert.equal(saved.exerciseType,'TURKISH');assert.equal(saved.turkishSet,'punctuation');assert.equal(saved.correctWords,1);
    assert.equal(JSON.parse(app.dom.window.localStorage.getItem('klavyetrain.activity.v1')).days.length,1);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});
test('kısayol turunda yanlış deneme, tekrar engeli, duraklatma ve ayrı kayıt',()=>{
  const app=boot();try {
    app.click('[data-layout="TR_F"]');app.click('[data-mode="SHORTCUTS"]');app.click('#shortcut-start');
    const press=(key,options={})=>{
      const event=new app.dom.window.KeyboardEvent('keydown',{key,ctrlKey:true,bubbles:true,cancelable:true,...options});
      app.$('#shortcut-editor').dispatchEvent(event);return event;
    };
    assert.equal(press('c').defaultPrevented,true);press('a');assert.equal(app.$('#shortcut-count').textContent,'1 / 10');
    press('a',{repeat:true});assert.equal(app.$('#shortcut-count').textContent,'1 / 10');
    app.click('#shortcut-pause');assert.equal(app.$('#shortcut-next').disabled,true);app.click('#shortcut-pause');app.click('#shortcut-next');
    for(const task of shortcutTasks.slice(1)) {
      const key=task.keys[0].split('+').at(-1);press(key,{ctrlKey:task.keys[0].startsWith('Ctrl+')});app.click('#shortcut-next');
    }
    const saved=JSON.parse(app.dom.window.localStorage.getItem('klavyetrain.shortcuts.v1')).sessions[0];
    assert.equal(saved.completed,10);assert.equal(saved.attempts,11);assert.equal(saved.correct,10);
    assert.equal(app.dom.window.localStorage.getItem('klavyetrain.history.v1'),null);
    app.click('[data-nav="history"]');assert.equal(app.$('#streak-current').textContent,'1');
    assert.match(app.$('#main').textContent,/Kısayol sonuçları/);assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});
test('ısı haritası ve grafik filtresi Q/F verilerini karıştırmaz',()=>{
  const make=(layout,rate,attempts,errors)=>metrics({...createSession(layout,'WORDS',2),totalCharacters:attempts,correctCharacters:attempts-errors,incorrectCharacters:errors,correctWords:rate,keyStats:{'ş':{attempts,errors}}},60);
  const app=boot({'klavyetrain.settings.v1':JSON.stringify({version:1,keyboardLayout:'TR_Q'}),'klavyetrain.history.v1':JSON.stringify({version:1,sessions:[make('TR_Q',12,20,2),make('TR_F',25,10,5)]})});try {
    app.click('[data-nav="history"]');assert.match(app.$('[data-heat-key="ş"]').title,/2 hata \/ 20 vuruş/);
    app.click('[data-heat-key="ş"]');assert.match(app.$('#heat-detail').textContent,/2 hata \/ 20 vuruş/);
    app.$('#history-layout').value='TR_F';app.$('#history-layout').dispatchEvent(new app.dom.window.Event('change'));
    assert.match(app.$('[data-heat-key="ş"]').title,/5 hata \/ 10 vuruş/);
    assert.equal(app.dom.window.document.querySelectorAll('.trend-chart .chart-point').length,2);
    assert.equal(JSON.parse(app.dom.window.localStorage.getItem('klavyetrain.settings.v1')).keyboardLayout,'TR_Q');
    app.$('#history-mode').value='FLOW';app.$('#history-mode').dispatchEvent(new app.dom.window.Event('change'));
    assert.equal(app.$('.trend-chart'),null);
    app.click('[data-mode="WEAK"]');
    assert.equal(JSON.parse(app.dom.window.localStorage.getItem('klavyetrain.settings.v1')).keyboardLayout,'TR_F');
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});
test('harita F/Q önizlemesi, Shift yönlendirmesi ve gezinme temizliği',()=>{
  const app=boot();try {
    app.click('[data-layout="TR_Q"]'); app.click('[data-nav="keyboard"]');
    assert.equal(app.dom.window.document.querySelectorAll('[data-finger]').length,10);
    app.click('[data-map-layout="TR_F"]');
    assert.match(app.$('.guide-home-row').textContent,/U · İ · E · A/);
    assert.equal(JSON.parse(app.dom.window.localStorage.getItem('klavyetrain.settings.v1')).keyboardLayout,'TR_Q');
    app.dom.window.document.body.dispatchEvent(new app.dom.window.KeyboardEvent('keydown',{key:'İ',bubbles:true,cancelable:true}));
    assert.ok(app.$('[data-finger="L4"]').classList.contains('is-active'));
    assert.ok(app.$('[data-finger="R5"]').classList.contains('is-active'));
    assert.match(app.$('[data-guide-message]').textContent,/Shift/);
    const key=app.$('[data-key-code="KeyF"]');key.focus();
    key.dispatchEvent(new app.dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
    assert.equal(app.dom.window.document.activeElement.dataset.keyCode,'KeyG');
    app.click('#map-show-hands');
    assert.equal(app.$('#map-hand-state').textContent,'Kapalı');
    assert.equal(JSON.parse(app.dom.window.localStorage.getItem('klavyetrain.settings.v1')).showHands,false);
    assert.equal(app.$('.hands-layer').style.display,'none');
    app.click('[data-nav="home"]');
    const event=new app.dom.window.KeyboardEvent('keydown',{key:'a',bubbles:true,cancelable:true});
    app.dom.window.document.body.dispatchEvent(event);assert.equal(event.defaultPrevented,false);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});
test('el rehberi yardım seviyelerinde erken ipucu göstermez',()=>{
  for(const help of [2,3,4]) {
    const app=boot({'klavyetrain.settings.v1':JSON.stringify({version:1,keyboardLayout:'TR_Q',help})});try{
      app.click('[data-mode="WORDS"]');app.click('#setup-form button[type="submit"]');
      assert.equal(app.dom.window.document.querySelectorAll('#keyboard-area .is-active').length,0);
      assert.equal(Boolean(app.$('#keyboard-area svg')),help!==4);
      if(help!==4) assert.equal(app.$('#exercise-show-hands').checked,true);
      assert.deepEqual(app.errors,[]);
    }finally{app.close();}
  }
});
test('akıcı mod geniş metin ve textarea açar, boşlukla kesintisiz sayar',()=>{
  const app=boot();try {
    startFlow(app);
    assert.equal(app.$('#typing').tagName,'TEXTAREA');
    assert.ok(app.dom.window.document.querySelectorAll('[data-flow-word]').length>=90);
    const first=flowWord(app,0), second=flowWord(app,1);
    type(app,first+' '+second+' ');
    assert.equal(app.$('#word-count').textContent,'2');
    assert.equal(app.$('#typing').value,first+' '+second+' ');
    assert.equal(app.$('[aria-current="true"]').dataset.flowWord,'2');
    app.click('#pause');assert.ok(app.$('#typing').disabled);app.click('#pause');
    assert.equal(app.$('#typing').value,first+' '+second+' ');
    app.click('#finish');
    const saved=JSON.parse(app.dom.window.localStorage.getItem('klavyetrain.history.v1')).sessions[0];
    assert.equal(saved.exerciseType,'FLOW');assert.equal(saved.correctWords,2);assert.equal(saved.incorrectWords,0);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});
test('akıcı modda yanlış kelime ilerlemeyi kesmez ve geçmişte düzeltilebilir',()=>{
  const app=boot();try {
    startFlow(app);const first=flowWord(app,0),second=flowWord(app,1);
    type(app,'# '+second+' ');
    assert.equal(app.$('#word-count').textContent,'1');
    assert.ok(app.$('[data-flow-word="0"]').classList.contains('flow-error'));
    const input=app.$('#typing');input.value=first+' '+second+' ';
    input.dispatchEvent(new app.dom.window.InputEvent('input',{bubbles:true,inputType:'insertText'}));
    assert.equal(app.$('#word-count').textContent,'2');
    assert.ok(app.$('[data-flow-word="0"]').classList.contains('flow-done'));
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});
test('akıcı metin bitmez; yeni hedefler eklenir ve görünür pencere ilerler',()=>{
  const app=boot();try {
    startFlow(app);
    const initial=[...app.dom.window.document.querySelectorAll('[data-flow-word]')].map(el=>el.textContent);
    const input=app.$('#typing'); input.value=initial.join(' ')+' ';
    input.dispatchEvent(new app.dom.window.InputEvent('input',{bubbles:true,inputType:'insertText'}));
    assert.equal(app.$('#word-count').textContent,String(initial.length));
    assert.ok(app.$(`[data-flow-word="${initial.length+20}"]`));
    assert.ok(!app.$('[data-flow-word="0"]'));
    input.setSelectionRange(0,0);input.dispatchEvent(new app.dom.window.Event('select'));
    assert.ok(app.$('[data-flow-word="0"]'));assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});
test('süre dolunca son kelime bir kez sayılır, ilerideki metin hata sayılmaz',async()=>{
  let time=0;const app=boot(undefined,()=>time);try {
    startFlow(app); const first=flowWord(app,0),second=flowWord(app,1);
    type(app,first+' '+second);time=61000;
    await new Promise(resolve=>setTimeout(resolve,260));
    assert.ok(!app.$('#typing'));
    const saved=JSON.parse(app.dom.window.localStorage.getItem('klavyetrain.history.v1')).sessions[0];
    assert.equal(saved.durationSeconds,60);assert.equal(saved.correctWords,2);assert.equal(saved.incorrectWords,0);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});
test('ilk açılış, F/Q seçimi, hazırlayan ve sürüm bilgisi',()=>{
  const app=boot();try {
    assert.match(app.$('footer').textContent,/Aykut BOZALAN/);assert.match(app.$('#version').textContent,/v1\.3\.0/);
    app.click('[data-layout="TR_F"]');assert.equal(app.$('#layout-badge').textContent,'Türkçe F');
    assert.equal(app.dom.window.document.querySelectorAll('[data-mode]').length,12);assert.deepEqual(app.errors,[]);
  } finally{app.close();}
});
test('kelime girişi, hata düzeltme, Enter ve kayıtlı sonuç akışı',()=>{
  const app=boot();try {
    startWords(app);const target=app.$('#target').textContent;
    type(app,'#');const input=app.$('#typing');input.value='';input.dispatchEvent(new app.dom.window.InputEvent('input',{bubbles:true,inputType:'deleteContentBackward'}));
    type(app,target);enter(app);assert.equal(app.$('#word-count').textContent,'1');
    app.click('#pause');assert.ok(app.$('#typing').disabled);app.click('#pause');assert.ok(!app.$('#typing').disabled);
    app.click('#finish');assert.match(app.$('#main').textContent,/Bir adım daha ilerledin/);
    const saved=JSON.parse(app.dom.window.localStorage.getItem('klavyetrain.history.v1')).sessions[0];
    assert.equal(saved.correctWords,1);assert.equal(saved.backspaceCount,1);assert.equal(saved.correctedErrors,1);
    assert.equal(saved.incorrectCharacters,1);assert.ok(saved.accuracy<100);assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});
test('keşif 20 harfte tamamlanır; Türkçe F temel sıra çalışır',()=>{
  const app=boot();try{
    app.click('[data-layout="TR_F"]');app.click('[data-mode="EXPLORE"]');app.click('#setup-form button[type="submit"]');
    for(let i=0;i<20;i++)type(app,app.$('#target').textContent);
    assert.match(app.$('#main').textContent,/20/);assert.ok(!app.$('#typing'));
    const saved=JSON.parse(app.dom.window.localStorage.getItem('klavyetrain.history.v1')).sessions[0];
    assert.equal(saved.completedTargets,20);assert.equal(saved.accuracy,100);assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});
test('Türkçe ses yokken dikte açık bir uyarıyla durur',()=>{
  const app=boot();try{
    app.click('[data-layout="TR_Q"]');app.click('[data-mode="DICTATION"]');app.click('#setup-form button[type="submit"]');
    assert.match(app.$('#notice').textContent,/Türkçe ses desteği bulunamadı/);assert.ok(!app.$('#typing'));assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});
test('kayıtlı geçmiş açılır, HTML metni çalıştırılmaz, ayarlar saklanır',()=>{
  const app=boot();try{
    app.click('[data-layout="TR_Q"]');app.click('[data-mode="FREE"]');app.$('#free-text').value='<img src=x onerror=alert(1)>';
    app.click('#setup-form button[type="submit"]');assert.equal(app.$('#target img'),null);
    type(app,'a');app.click('#finish');app.click('[data-nav="history"]');assert.equal(app.dom.window.document.querySelectorAll('tbody tr').length,1);
    app.click('[data-nav="settings"]');app.$('[name="theme"]').value='dark';app.click('#settings-form button[type="submit"]');
    assert.ok(app.dom.window.document.documentElement.classList.contains('dark'));assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});
