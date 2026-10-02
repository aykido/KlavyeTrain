import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
function boot(saved) {
  const errors=[];
  const virtualConsole=new VirtualConsole(); virtualConsole.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:'https://klavye.test/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole,
    beforeParse(window){
      window.matchMedia=()=>({matches:false,addEventListener(){}}); window.scrollTo=()=>{}; window.confirm=()=>true;
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
test('ilk açılış, F/Q seçimi, hazırlayan ve sürüm bilgisi',()=>{
  const app=boot();try {
    assert.match(app.$('footer').textContent,/Aykut BOZALAN/);assert.match(app.$('#version').textContent,/v1\.0\.0/);
    app.click('[data-layout="TR_F"]');assert.equal(app.$('#layout-badge').textContent,'Türkçe F');
    assert.equal(app.dom.window.document.querySelectorAll('[data-mode]').length,9);assert.deepEqual(app.errors,[]);
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
