const shortcutEscape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const demoText = 'Türkçe klavye ile akıcı yazıyorum.';
export const shortcutTasks = [
  {id:'select',name:'Tümünü seç',combo:'Ctrl + A',keys:['Ctrl+a'],instruction:'Örnek metnin tamamını seç.',selection:[0,0]},
  {id:'copy',name:'Kopyala',combo:'Ctrl + C',keys:['Ctrl+c'],instruction:'Seçili “Türkçe” kelimesini alıştırma panosuna kopyala.',selection:[0,6]},
  {id:'cut',name:'Kes',combo:'Ctrl + X',keys:['Ctrl+x'],instruction:'Seçili “Türkçe” kelimesini kes.',selection:[0,6]},
  {id:'paste',name:'Yapıştır',combo:'Ctrl + V',keys:['Ctrl+v'],instruction:'Alıştırma panosundaki “Türkçe ” metnini başa yapıştır.',text:'klavye ile akıcı yazıyorum.',selection:[0,0]},
  {id:'undo',name:'Geri al',combo:'Ctrl + Z',keys:['Ctrl+z'],instruction:'Son eklenen “!” işaretini geri al.',text:demoText+'!',selection:[33,33]},
  {id:'redo',name:'Yinele',combo:'Ctrl + Y',keys:['Ctrl+y','Ctrl+Shift+z'],instruction:'Geri alınan “!” işaretini yeniden ekle.',selection:[32,32]},
  {id:'left',name:'Bir kelime sola git',combo:'Ctrl + ←',keys:['Ctrl+ArrowLeft'],instruction:'İmleci önceki kelimenin başına götür.',selection:[32,32]},
  {id:'right',name:'Bir kelime sağa git',combo:'Ctrl + →',keys:['Ctrl+ArrowRight'],instruction:'İmleci sonraki kelimenin başına götür.',selection:[0,0]},
  {id:'home',name:'Satır başına git',combo:'Home',keys:['Home'],instruction:'İmleci satırın başına götür.',selection:[20,20]},
  {id:'end',name:'Satır sonuna git',combo:'End',keys:['End'],instruction:'İmleci satırın sonuna götür.',selection:[0,0]}
];
export function shortcutChord(event) {
  if (event.altKey) return null;
  const key=event.key.length === 1 ? event.key.toLocaleLowerCase('en-US') : event.key;
  if (['Control','Meta','Shift','Alt','Tab','Escape'].includes(key)) return null;
  return `${event.ctrlKey || event.metaKey ? 'Ctrl+' : ''}${event.shiftKey ? 'Shift+' : ''}${key}`;
}
export function shortcutEffect(task, text) {
  switch(task.id) {
    case 'select': return {text,start:0,end:text.length,message:'Metnin tamamı seçildi.'};
    case 'copy': return {text,start:0,end:6,message:'“Türkçe” alıştırma panosuna kopyalandı.'};
    case 'cut': return {text:text.slice(6),start:0,end:0,message:'Seçili kelime kesildi.'};
    case 'paste': return {text:'Türkçe '+text,start:7,end:7,message:'Alıştırma panosundaki metin yapıştırıldı.'};
    case 'undo': return {text:text.slice(0,-1),start:text.length-1,end:text.length-1,message:'Son eklenen işaret geri alındı.'};
    case 'redo': return {text:text+'!',start:text.length+1,end:text.length+1,message:'İşaret yeniden eklendi.'};
    case 'left': { const start=text.search(/\S+\s*$/u); return {text,start,end:start,message:'İmleç önceki kelimenin başında.'}; }
    case 'right': { const start=text.search(/\s/u)+1; return {text,start,end:start,message:'İmleç sonraki kelimenin başında.'}; }
    case 'home': return {text,start:0,end:0,message:'İmleç satırın başında.'};
    case 'end': return {text,start:text.length,end:text.length,message:'İmleç satırın sonunda.'};
  }
}
export class ShortcutTrainer {
  constructor(root, layoutId, onFinish) {
    this.root=root; this.onFinish=onFinish; this.index=0; this.solved=false; this.paused=false;
    this.elapsed=0; this.runningSince=null;
    this.result={version:1,id:`${Date.now()}-shortcut`,startedAt:new Date().toISOString(),keyboardLayout:layoutId,attempts:0,correct:0,completed:0,durationSeconds:0};
    root.innerHTML=`<div class="section-head"><div><div class="eyebrow">KISAYOL ATÖLYESİ</div><h1>Az tuşla daha rahat.</h1></div><button id="shortcut-finish">Çalışmayı bitir</button></div><div class="metrics"><div class="metric"><strong id="shortcut-count">0 / 10</strong><span>tamamlanan kısayol</span></div><div class="metric"><strong id="shortcut-accuracy">%100</strong><span>doğru deneme</span></div></div><section class="panel shortcut-panel"><span id="shortcut-step" class="badge"></span><h2 id="shortcut-name"></h2><div id="shortcut-combo" class="shortcut-combo"></div><p id="shortcut-instruction"></p><label for="shortcut-editor" class="field">Deneme alanı</label><textarea id="shortcut-editor" rows="2" readonly spellcheck="false" aria-describedby="shortcut-note shortcut-feedback"></textarea><p id="shortcut-note" class="muted">Alana tıkla ve gösterilen kısayola bas. Kopyalama/yapıştırma bu alıştırmanın panosunda yapılır. Mac'te Ctrl yerine Command kullanabilirsin.</p><p id="shortcut-feedback" class="feedback" role="status">Hazır olduğunda başla.</p><div class="actions"><button id="shortcut-next" class="primary" hidden>Sonraki kısayol →</button><button id="shortcut-pause">Duraklat</button></div></section>`;
    this.editor=root.querySelector('#shortcut-editor');
    this.handler=event=>this.keydown(event); this.editor.addEventListener('keydown',this.handler);
    this.visibility=()=>{if(root.ownerDocument.hidden && !this.paused)this.pause();};
    root.ownerDocument.addEventListener('visibilitychange',this.visibility);
    root.querySelector('#shortcut-finish').onclick=()=>this.finish();
    root.querySelector('#shortcut-pause').onclick=()=>this.pause();
    root.querySelector('#shortcut-next').onclick=()=>{if(!this.solved || this.paused)return;if(++this.index===shortcutTasks.length)this.finish();else this.show();};
    this.show();
  }
  show() {
    const task=shortcutTasks[this.index]; this.solved=false;
    this.root.querySelector('#shortcut-step').textContent=`${this.index+1} / ${shortcutTasks.length}`;
    this.root.querySelector('#shortcut-name').textContent=task.name;
    this.root.querySelector('#shortcut-combo').innerHTML=task.combo.split(' + ').map(key=>`<kbd>${shortcutEscape(key)}</kbd>`).join('<span>+</span>');
    this.root.querySelector('#shortcut-instruction').textContent=task.instruction;
    this.root.querySelector('#shortcut-next').hidden=true;
    this.root.querySelector('#shortcut-feedback').textContent='Gösterilen kısayolu dene.';
    this.editor.value=task.text || demoText; this.editor.focus(); this.editor.setSelectionRange(...task.selection);
  }
  keydown(event) {
    const chord=shortcutChord(event);
    if (!chord) { if(event.key==='Escape'){event.preventDefault();this.pause();} return; }
    event.preventDefault();
    if(event.repeat || this.paused || this.solved || event.isComposing)return;
    if(this.runningSince===null)this.runningSince=performance.now();
    this.result.attempts++;
    const task=shortcutTasks[this.index];
    if(task.keys.includes(chord)) {
      this.result.correct++;this.result.completed++;this.solved=true;
      const effect=shortcutEffect(task,this.editor.value);
      this.editor.value=effect.text;this.editor.setSelectionRange(effect.start,effect.end);
      this.root.querySelector('#shortcut-feedback').textContent=`Doğru. ${effect.message}`;
      const next=this.root.querySelector('#shortcut-next');next.hidden=false;
      next.textContent=this.index===shortcutTasks.length-1 ? 'Sonucumu gör →' : 'Sonraki kısayol →';
    } else this.root.querySelector('#shortcut-feedback').textContent='Bu kombinasyon farklı. Gösterilen kısayolu yeniden dene.';
    this.root.querySelector('#shortcut-count').textContent=`${this.result.completed} / ${shortcutTasks.length}`;
    this.root.querySelector('#shortcut-accuracy').textContent=`%${Math.round(this.result.correct/this.result.attempts*100)}`;
  }
  pause() {
    if(this.paused){this.paused=false;if(this.result.attempts)this.runningSince=performance.now();}
    else {if(this.runningSince!==null)this.elapsed+=(performance.now()-this.runningSince)/1000;this.runningSince=null;this.paused=true;}
    this.editor.disabled=this.paused;
    this.root.querySelector('#shortcut-pause').textContent=this.paused?'Devam et':'Duraklat';
    this.root.querySelector('#shortcut-next').disabled=this.paused;
    if(!this.paused)this.editor.focus();
  }
  finish() {
    this.result.durationSeconds=this.elapsed+(this.runningSince===null?0:(performance.now()-this.runningSince)/1000);
    this.onFinish({...this.result});
  }
  destroy() {this.editor.removeEventListener('keydown',this.handler);this.root.ownerDocument.removeEventListener('visibilitychange',this.visibility);}
}
