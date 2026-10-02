import { lowerTR, equalTR, createSession, recordKey, submitWords, metrics, trainingLevel, feedback, chooseTarget, mergeKeyStats, keyboardKeys } from './core.mjs';
import { StorageManager } from './storage.mjs';

const data = JSON.parse(document.querySelector('#app-data').textContent);
const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const number = value => Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
function notice(message) { $('#notice').textContent = message; $('#notice').hidden = false; }
let local;
try { local = window.localStorage; } catch { local = null; }
const store = new StorageManager(local, notice);
let settings = store.settings(), history = store.history(), active = null, lastResult = null, currentMode = 'WORDS';
let ticker = null, hintTimer = null, voices = [];
const modes = {
  EXPLORE: ['Klavyeyi tanı', 'Tuşların yerini ve hangi parmağını kullanacağını keşfet.', 'F Q', 'İLK ADIM'],
  FIND: ['Tuş bulma', 'Harfleri klavyende bul, yerlerini adım adım öğren.', 'Aa', 'KEŞFET'],
  WORDS: ['Kelime çalış', 'Kısa kelimelerden cümlelere, kendi ritminde ilerle.', 'ab', 'ALIŞTIRMA'],
  DICTATION: ['Sesli dikte', 'Kelimeyi dinle, yaz ve Enter ile kontrol et.', '♪', 'DİNLE & YAZ'],
  TIMED: ['Süreli çalışma', 'Kendine zaman ayır. Önce doğruluğuna odaklan.', '◷', 'KENDİNİ DENE'],
  WEAK: ['Zayıf tuşları çalış', 'Zorlandığın harflere sana özel bir çalışma ayır.', 'ğ ş', 'PEKİŞTİR'],
  LETTERS: ['Harf alıştırması', 'Temel sıra ve diğer harflerde parmaklarını alıştır.', 'a ş', 'TEMEL SIRA'],
  FREE: ['Serbest çalışma', 'Kendi metnini ekle, dilediğin kadar tekrar et.', '¶', 'KENDİ METNİN'],
  LESSON: ['Ders modu', 'Öğretmeninin verdiği süre, seviye ve hedefi seç.', '01', 'BİRLİKTE ÖĞREN']
};
const isLetterMode = mode => ['EXPLORE','FIND','LETTERS'].includes(mode);
const levelOptions = '<option value="1">1 · Kısa kelimeler</option><option value="2" selected>2 · Günlük kelimeler</option><option value="3">3 · Uzun kelimeler</option><option value="4">4 · Türkçe karakterler</option><option value="5">5 · Cümleler ve noktalama</option>';

function applySettings() {
  const dark = settings.theme === 'dark' || settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.className = [dark ? 'dark' : '', settings.font === 'large' ? 'large' : '', settings.contrast ? 'contrast' : ''].join(' ');
  $('#layout-badge').textContent = data.keyboards[settings.keyboardLayout]?.name || 'F / Q';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySettings);
function mount(html) { $('#main').innerHTML = html; $('#main').focus({ preventScroll:true }); window.scrollTo(0,0); }
function stopTimers() { clearInterval(ticker); clearTimeout(hintTimer); window.speechSynthesis?.cancel(); }
function navigate(page) {
  if (active) {
    if (!confirm('Çalışmayı bitirip sonucunu görmek ister misin?')) return;
    finish(); return;
  }
  stopTimers(); document.body.classList.remove('exercise-active');
  if (!settings.keyboardLayout) return welcome();
  ({ home, history: showHistory, settings: showSettings }[page] || home)();
}
function welcome() {
  mount(`<section class="intro"><div class="eyebrow">HOŞ GELDİN</div><h1>Her tuşla<br>biraz daha rahat.</h1><p>Hızlanmak için acele etme. Önce klavyeni tanıyalım.<br>Hangi klavye düzenini kullanıyorsun?</p><div class="layout-choices"><button class="layout-choice" data-layout="TR_F">Türkçe<b>F</b></button><button class="layout-choice" data-layout="TR_Q">Türkçe<b>Q</b></button></div><p class="muted">Klavyenin üst harf sırasındaki ilk tuşa bakabilirsin.<br>Seçimini daha sonra Ayarlar bölümünden değiştirebilirsin.</p><div class="tip">Kayıt veya kişisel bilgi gerekmez. Gelişimin bu tarayıcıda saklanır.</div></section>`);
}
function home() {
  mount(`<section class="hero"><div><div class="eyebrow">KENDİ RİTMİNDE, ADIM ADIM</div><h1>Klavyende rahat ol.<br>Doğru yaz, akıcı ilerle.</h1><p>Her gün kısa bir çalışma, daha güçlü bir alışkanlık.<br>Bugün kaldığın yerden devam et.</p></div><aside class="goal-card"><span class="eyebrow">BİRLİKTE ULAŞACAĞIMIZ HEDEF</span><div class="goal-values"><div><strong>${data.config.targetWpm}</strong><span>doğru kelime / dk</span></div><div><strong>%${data.config.targetAccuracy}</strong><span>yazım doğruluğu</span></div></div><p>Bir yarış değil; kendini geliştirme yolculuğu.</p></aside></section><div class="section-head"><h2>Bugün ne çalışalım?</h2><p>${data.keyboards[settings.keyboardLayout].name} klavye · Kısa çalışmalar, kalıcı alışkanlıklar</p></div><div class="cards">${Object.entries(modes).map(([id, mode], i) => `<button class="exercise-card" data-mode="${id}"><span class="card-top"><span class="card-icon" aria-hidden="true">${mode[2]}</span><span class="card-number">${String(i+1).padStart(2,'0')} / ${mode[3]}</span></span><h3>${mode[0]}</h3><p>${mode[1]}</p><span class="card-link">Çalışmaya geç <span aria-hidden="true">↗</span></span></button>`).join('')}</div><div class="tip"><strong>Küçük bir hatırlatma:</strong> Omuzlarını rahat bırak. Parmaklarını temel sıraya yerleştir. Hızın, doğruluğun geliştikçe artacak.</div>`);
}
function setup(mode) {
  currentMode = mode;
  mount(`<button class="back" data-nav="home">← Çalışmalara dön</button><div class="eyebrow">${modes[mode][3]}</div><h1>${modes[mode][0]}</h1><p style="margin-top:16px">${modes[mode][1]}</p><form id="setup-form" class="panel"><div class="form-grid">${isLetterMode(mode) ? '<p class="full-width">20 doğru harfle tamamlanan kısa bir çalışma. Harfleri küçük yazarak başlayabilirsin.</p>' : `<label class="field">Çalışma seviyesi<select id="level">${levelOptions}</select></label><label class="field">Çalışma süresi<select id="duration"><option value="60">1 dakika</option><option value="180" selected>3 dakika</option><option value="300">5 dakika</option><option value="600">10 dakika</option><option value="custom">Özel süre</option></select></label><label class="field" id="custom-field" hidden>Özel süre (dakika)<input id="custom-duration" type="number" min="1" max="60" value="5"></label>`}${mode === 'LESSON' ? '<label class="field">Hedef doğruluk (%)<input id="accuracy-goal" type="number" min="50" max="100" value="95" required></label><label class="field">Hedef doğru kelime / dk<input id="speed-goal" type="number" min="1" max="150" value="30" required></label>' : ''}${mode === 'FREE' ? '<label class="field full-width">Yazmak istediğin metin<textarea id="free-text" maxlength="1200" required placeholder="Çalışmak istediğin cümleleri buraya yaz..."></textarea><small>En fazla 1200 karakter. Satır sonları boşluğa dönüştürülür.</small></label>' : ''}</div><div class="tip">${mode === 'DICTATION' ? 'Bu çalışma cihazında Türkçe ses gerektirir. Kelimeyi dinledikten sonra yaz ve Enter tuşuna bas.' : 'Süre ilk tuşla başlar. Kelime ve cümleleri Enter ile tamamla. Büyük harf ve noktalama işaretlerine dikkat et.'}</div><div class="actions"><button class="primary" type="submit">Çalışmayı başlat →</button></div></form>`);
  if (mode === 'DICTATION') { $('#level option[value="5"]').remove(); }
  $('#duration')?.addEventListener('change', event => { $('#custom-field').hidden = event.target.value !== 'custom'; });
  $('#setup-form').addEventListener('submit', event => {
    event.preventDefault();
    let duration = Number($('#duration')?.value || 0);
    if ($('#duration')?.value === 'custom') duration = Number($('#custom-duration').value) * 60;
    if (!isLetterMode(mode) && (!Number.isFinite(duration) || duration < 60 || duration > 3600)) return notice('Çalışma süresi 1 ile 60 dakika arasında olmalı.');
    start(mode, { level: Number($('#level')?.value || 1), duration,
      text: $('#free-text')?.value.trim().replace(/\s+/gu,' ') || '',
      targetAccuracy: Number($('#accuracy-goal')?.value || data.config.targetAccuracy),
      targetWpm: Number($('#speed-goal')?.value || data.config.targetWpm) });
  });
}
function refreshVoices() { voices = window.speechSynthesis?.getVoices().filter(voice => /^tr(?:[-_]|$)/i.test(voice.lang)) || []; }
if (window.speechSynthesis) { refreshVoices(); window.speechSynthesis.addEventListener('voiceschanged', refreshVoices); }
function speak() {
  if (!active || active.paused || active.mode !== 'DICTATION') return;
  refreshVoices();
  if (!voices.length) return notice('Bu cihazda Türkçe ses desteği bulunamadı. Ayarlardan Türkçe konuşma sesi ekleyebilir veya kelime çalışabilirsin.');
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(active.target);
  utterance.lang = 'tr-TR'; utterance.voice = voices[0]; utterance.rate = settings.speechRate;
  utterance.onerror = event => { if (!['interrupted','canceled'].includes(event.error)) { notice('Ses oynatılamadı. Türkçe ses paketini kontrol et veya kelime çalışmasına geç.'); if (active && !active.paused) pause(); } };
  window.speechSynthesis.speak(utterance);
}
function start(mode, options) {
  if (mode === 'DICTATION') { refreshVoices(); if (!voices.length) return notice('Bu cihazda Türkçe ses desteği bulunamadı. İşletim sistemine Türkçe konuşma sesi ekleyebilir veya Kelime çalış bölümünü kullanabilirsin.'); }
  const layout = data.keyboards[settings.keyboardLayout];
  const pool = isLetterMode(mode) ? [...new Set((mode === 'LETTERS' ? layout.home : layout.rows.slice(1).join('')).replace(/[^a-zçğıöşü]/gu,''))]
    : mode === 'FREE' ? [options.text] : options.level === 5 ? data.sentences : data.words[options.level];
  if (!pool?.length || pool.some(item => !item)) return notice('Çalışma içeriği bulunamadı. Lütfen bir metin veya farklı seviye seç.');
  active = { mode, options, pool, session: createSession(settings.keyboardLayout, mode, options.level),
    recent: [], stats: mergeKeyStats(history), target: '', typed: '', completed: 0,
    elapsed: 0, runningSince: null, paused: false, hint: false };
  document.body.classList.add('exercise-active');
  mount(`<div class="section-head"><div><div class="eyebrow">${data.keyboards[settings.keyboardLayout].name} · ÖNCE DOĞRULUK</div><h2>${modes[mode][0]}</h2></div><button id="finish">Çalışmayı bitir</button></div><div class="metrics"><div class="metric"><strong id="time">0:00</strong><span>${options.duration ? 'kalan süre' : 'geçen süre'}</span></div><div class="metric"><strong id="word-count">0</strong><span>${isLetterMode(mode) ? 'tamamlanan harf' : 'doğru kelime'}</span></div><div class="metric"><strong id="accuracy">%100</strong><span>doğruluk</span></div><div class="metric"><strong id="speed">0</strong><span>doğru kelime / dk</span></div></div><section class="panel exercise-panel"><p>${mode === 'DICTATION' ? 'Dinle, yaz, Enter ile tamamla.' : isLetterMode(mode) ? 'Gösterilen harfi klavyende bul.' : 'Metni yaz, Enter ile tamamla.'}</p><div class="target" id="target" aria-label="Yazılacak metin"></div><label for="typing" class="muted">Yazma alanı</label><input class="typing-input" id="typing" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-describedby="typing-feedback" placeholder="Hazır olduğunda başla..."><div id="typing-feedback" class="feedback" role="status">Süre ilk tuşa bastığında başlayacak.</div><div class="actions" style="justify-content:center">${mode === 'DICTATION' ? '<button id="listen">♪ Tekrar dinle</button>' : ''}<button id="pause">Duraklat</button></div><div class="progress" aria-hidden="true"><span id="progress" style="width:0"></span></div></section><div id="keyboard-area"></div><p id="keyboard-help" class="keyboard-help"></p>`);
  $('#finish').onclick = finish; $('#pause').onclick = pause; $('#listen')?.addEventListener('click', speak);
  $('#typing').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); if (!event.repeat) submit(); }
    if (event.key === 'Escape') { event.preventDefault(); pause(); }
  });
  $('#typing').addEventListener('paste', event => { event.preventDefault(); $('#typing-feedback').textContent = 'Bu alanda metni tuşlayarak yazalım.'; });
  $('#typing').addEventListener('drop', event => event.preventDefault());
  $('#typing').addEventListener('beforeinput', event => {
    if (active?.paused) return event.preventDefault();
    if (!['insertText','deleteContentBackward','insertCompositionText'].includes(event.inputType)) { event.preventDefault(); return; }
    const input = event.target;
    if (input.selectionStart !== input.value.length || input.selectionEnd !== input.value.length) {
      event.preventDefault(); input.setSelectionRange(input.value.length,input.value.length);
      $('#typing-feedback').textContent = 'Düzeltmek için sondan Backspace tuşunu kullanabilirsin.';
    }
  });
  $('#typing').addEventListener('input', handleInput);
  nextTarget(); ticker = setInterval(tick, 200); tick(); $('#typing').focus();
}
function elapsed() { return active ? active.elapsed + (active.runningSince === null ? 0 : (performance.now() - active.runningSince) / 1000) : 0; }
function beginClock() { if (active.runningSince === null && !active.paused) active.runningSince = performance.now(); }
function tick() {
  if (!active) return;
  const seconds = elapsed(), result = metrics(active.session, seconds);
  $('#time').textContent = clock(active.options.duration ? Math.max(0, Math.ceil(active.options.duration - seconds)) : seconds);
  $('#word-count').textContent = isLetterMode(active.mode) ? active.completed : result.correctWords;
  $('#accuracy').textContent = `%${number(result.accuracy)}`;
  $('#speed').textContent = number(result.realWordsPerMinute);
  $('#progress').style.width = `${Math.min(100, isLetterMode(active.mode) ? active.completed / 20 * 100 : seconds / active.options.duration * 100)}%`;
  if (active.options.duration && seconds >= active.options.duration) finish();
}
function nextTarget() {
  if (!active) return;
  const stats = mergeKeyStats([{ keyStats: active.stats }, active.session]);
  active.target = chooseTarget(active.pool, stats, active.recent, Math.random, active.mode === 'WEAK' ? 6 : 2);
  active.recent.push(active.target); active.recent = active.recent.slice(-5);
  active.typed = ''; active.hint = false; $('#typing').value = '';
  renderTarget(); renderKeyboard(); scheduleHint(); speak();
}
function scheduleHint() {
  clearTimeout(hintTimer);
  if (settings.help === 2 && active && !active.paused) hintTimer = setTimeout(() => { if (active) { active.hint = true; renderKeyboard(); } }, data.config.hintDelayMs);
}
function renderTarget() {
  if (!active) return;
  if (active.paused) { $('#target').textContent = 'Kısa bir mola'; return; }
  if (active.mode === 'DICTATION') { $('#target').textContent = '♪ Dinle ve yaz'; return; }
  const typed = [...active.typed];
  $('#target').innerHTML = [...active.target].map((char, index) => `<span class="${index < typed.length ? equalTR(char,typed[index]) ? 'correct' : 'incorrect' : index === typed.length ? 'current' : ''}">${escapeHTML(char)}</span>`).join('');
}
function renderKeyboard() {
  if (!active) return;
  const area = $('#keyboard-area'), help = $('#keyboard-help');
  if (settings.help === 4 || active.mode === 'DICTATION' || active.paused) { area.innerHTML = ''; help.textContent = ''; return; }
  const expected = [...active.target][[...active.typed].length] || '';
  const show = settings.help === 1 || active.hint;
  const rows = keyboardKeys(data.keyboards[settings.keyboardLayout]);
  const key = rows.flat().find(key => key.key === expected || key.shifted === expected);
  const shifted = key && key.shifted === expected && key.key !== expected;
  area.innerHTML = `<div class="keyboard-wrap"><div class="keyboard" role="img" aria-label="${data.keyboards[settings.keyboardLayout].name} sanal klavye">${rows.map(row => `<div class="key-row">${row.map(key => `<span class="key ${show && (key.key === expected || key.shifted === expected) ? 'active' : ''}">${escapeHTML(shifted ? key.shifted : key.key.toLocaleUpperCase('tr-TR'))}</span>`).join('')}</div>`).join('')}<div class="key-row"><span class="key shift ${show && shifted ? 'active' : ''}">Shift ⇧</span><span class="key space ${show && expected === ' ' ? 'active' : ''}">Boşluk</span><span class="key shift ${show && shifted ? 'active' : ''}">Shift ⇧</span></div></div></div>`;
  help.textContent = show && expected ? expected === ' ' ? 'Boşluk tuşu · Başparmak' : `${key?.finger || 'Uygun tuş'}${shifted ? ' + karşı elinle Shift' : ''}` : 'Tuşun yerini hatırlamaya çalış. Acele etme.';
}
function handleInput(event) {
  if (!active || active.paused) return;
  if (event.isComposing) return;
  if (active.options.duration && elapsed() >= active.options.duration) { finish(); return; }
  const input = event.target, previous = [...active.typed], value = [...input.value.normalize('NFC')];
  beginClock();
  let common = 0; while (common < previous.length && common < value.length && previous[common] === value[common]) common++;
  if (common < previous.length) {
    active.session.backspaceCount++;
    for (let i = common; i < previous.length; i++) if (!equalTR(previous[i], [...active.target][i] || '')) active.session.correctedErrors++;
  }
  let correct = true;
  for (let i = common; i < value.length; i++) correct = recordKey(active.session, [...active.target][i] || '', value[i]) && correct;
  active.typed = value.join('');
  if (isLetterMode(active.mode)) {
    if (equalTR(active.typed, active.target)) {
      active.completed++; $('#typing-feedback').textContent = 'Doğru tuş. Böyle devam et.';
      if (active.completed >= 20) return finish();
      nextTarget();
    } else {
      active.typed = ''; input.value = ''; active.hint = settings.help === 3;
      $('#typing-feedback').textContent = 'Bir kez daha dene. Tuşun yerini bulmak için zamanın var.';
      renderKeyboard();
    }
  } else {
    active.hint = settings.help === 3 && !correct;
    $('#typing-feedback').textContent = correct ? 'Rahat bir ritimle devam et. Bitirdiğinde Enter.' : 'Bir tuş farklı oldu. Backspace ile düzeltebilirsin.';
    renderTarget(); renderKeyboard(); scheduleHint();
  }
  tick();
}
function submit() {
  if (!active || active.paused || isLetterMode(active.mode) || !active.typed) return;
  if (active.options.duration && elapsed() >= active.options.duration) return finish();
  const correct = equalTR(active.target,active.typed);
  if (!correct) {
    $('#typing-feedback').textContent = active.mode === 'DICTATION' ? `Doğrusu: ${active.target}. Düzelterek tekrar Enter tuşuna basabilirsin.` : 'Metni tamamla veya farklı harfleri düzelt, sonra Enter tuşuna bas.';
    return;
  }
  submitWords(active.session, active.target, active.typed); active.completed++;
  $('#typing-feedback').textContent = 'Tamamlandı. Sıradaki kelimeye geçelim.';
  nextTarget(); tick();
}
function pause() {
  if (!active) return;
  if (!active.paused) {
    active.elapsed = elapsed(); active.runningSince = null; active.paused = true;
    window.speechSynthesis?.cancel(); clearTimeout(hintTimer);
  } else { active.paused = false; if (active.session.totalCharacters) active.runningSince = performance.now(); scheduleHint(); speak(); }
  $('#typing').disabled = active.paused; $('#pause').textContent = active.paused ? 'Devam et' : 'Duraklat';
  renderTarget(); renderKeyboard(); if (!active.paused) $('#typing').focus();
}
document.addEventListener('visibilitychange', () => { if (document.hidden && active && !active.paused) pause(); });
window.addEventListener('beforeunload', event => { if (active?.session.totalCharacters) { event.preventDefault(); event.returnValue = ''; } });
function finish() {
  if (!active) return;
  stopTimers();
  // Count a final partial submission once, including missing words, when time runs out.
  if (!isLetterMode(active.mode) && active.typed) submitWords(active.session, active.target, active.typed);
  const duration = active.options.duration ? Math.min(elapsed(), active.options.duration) : elapsed();
  const result = metrics(active.session, duration);
  result.targetAccuracy = active.options.targetAccuracy; result.targetWpm = active.options.targetWpm;
  result.completedTargets = active.completed;
  if (result.totalCharacters) { history.push(result); history = history.slice(-data.config.historyLimit); store.saveHistory(history); }
  lastResult = result; active = null; document.body.classList.remove('exercise-active'); showResult(result);
}
function showResult(result) {
  const letterMode = isLetterMode(result.exerciseType);
  mount(`<div class="eyebrow">ÇALIŞMA TAMAMLANDI</div><h1>Bir adım daha ilerledin.</h1><div class="result-message">${letterMode ? 'Tuşların yerini öğrenmek zaman ister. Düzenli kısa çalışmalarla devam et.' : feedback(result,result.targetWpm,result.targetAccuracy)}</div><div class="metrics"><div class="metric"><strong>${clock(result.durationSeconds)}</strong><span>etkin süre</span></div><div class="metric"><strong>${letterMode ? result.completedTargets : number(result.realWordsPerMinute)}</strong><span>${letterMode ? 'tamamlanan harf' : 'doğru kelime / dk'}</span></div><div class="metric"><strong>%${number(result.accuracy)}</strong><span>ilk vuruş doğruluğu</span></div><div class="metric"><strong>${letterMode ? 'Keşif' : trainingLevel(result,data.config)}</strong><span>çalışma seviyesi</span></div></div><p>Hedef: ${result.targetWpm} doğru kelime/dk · %${result.targetAccuracy} doğruluk</p><section class="panel"><h2>Bir sonraki küçük adım</h2><p style="margin-top:10px">${result.weakKeys.length ? 'Bu tuşlara biraz daha zaman ayırabilirsin.' : 'Rahat ve doğru yazma ritmini korumaya devam et.'}</p><div class="weak-keys">${result.weakKeys.map(key=>`<span>${escapeHTML(key.toLocaleUpperCase('tr-TR'))}</span>`).join('')}</div>${result.accuracy >= 95 && settings.help < 4 ? '<p>Doğruluğun iyi. Ayarlar bölümünden klavye yardımını bir seviye azaltmayı deneyebilirsin.</p>' : ''}<div class="actions"><button class="primary" data-mode="WEAK">Zayıf tuşları çalış</button><button data-mode="${result.exerciseType}">Tekrar çalış</button><button data-nav="home">Ana menü</button></div></section><details class="panel"><summary>Ayrıntılı sonuçlar</summary><div class="detail-grid">${Object.entries({'Doğru kelime':result.correctWords,'Hatalı / eksik kelime':result.incorrectWords,'Toplam vuruş':result.totalCharacters,'Doğru vuruş':result.correctCharacters,'Hatalı vuruş':result.incorrectCharacters,'Backspace':result.backspaceCount,'Silinen hatalı karakter':result.correctedErrors,'Standart WPM':number(result.standardWpm),'Net WPM':number(result.netWpm),'CPM':number(result.cpm)}).map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div><p class="muted" style="margin-top:16px">Standart WPM = vuruş / 5 / dakika. Net WPM = doğru vuruş / 5 / dakika. Doğruluk, sonradan silinen yanlış vuruşları da içerir. Gerçek hız yalnızca doğru tamamlanan kelimeleri sayar.</p><h3 style="margin-top:20px">Karıştırılan tuşlar</h3><p>${Object.entries(result.confusions).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([pair,count])=>`${escapeHTML(pair)}: ${count} kez`).join(' · ') || 'Karışıklık kaydedilmedi.'}</p></details><div class="actions"><button id="export-result">Sonucu JSON olarak indir</button><button data-nav="history">Gelişimimi gör</button></div>`);
  $('#export-result').onclick = () => download([result]);
}
function download(sessions) {
  const blob = new Blob([JSON.stringify({ version:1, appVersion:data.version, exportedAt:new Date().toISOString(), sessions },null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = `klavye-sonuclar-${new Date().toISOString().slice(0,10)}.json`; anchor.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showHistory() {
  const comparable = history.filter(s=>!isLetterMode(s.exerciseType));
  const average = key => comparable.length ? comparable.reduce((sum,s)=>sum+s[key],0)/comparable.length : 0;
  const first = comparable[0], last = comparable.at(-1);
  mount(`<div class="eyebrow">DÜNÜNLE BUGÜNÜN ARASINDA</div><h1>Gelişimim</h1><p style="margin-top:16px">Yalnızca kendi ilerleyişine bak. Her çalışma değerli.</p>${history.length ? `<div class="metrics"><div class="metric"><strong>${history.length}</strong><span>kayıtlı çalışma</span></div><div class="metric"><strong>${number(Math.max(0,...comparable.map(s=>s.realWordsPerMinute)))}</strong><span>en iyi doğru kelime / dk</span></div><div class="metric"><strong>%${number(Math.max(0,...comparable.map(s=>s.accuracy)))}</strong><span>en iyi doğruluk</span></div><div class="metric"><strong>${number(average('realWordsPerMinute'))}</strong><span>ortalama doğru kelime / dk</span></div></div>${last ? `<section class="panel"><h2>Kelime çalışmalarındaki yolculuğun</h2><p>Son çalışma: ${number(last.realWordsPerMinute)} kelime/dk, %${number(last.accuracy)} doğruluk.<br>İlk kayıtlı çalışmana göre ${number(last.realWordsPerMinute-first.realWordsPerMinute)} kelime/dk ve ${number(last.accuracy-first.accuracy)} yüzde puan değişim.</p><div class="history-bars" aria-hidden="true">${comparable.map(s=>`<div class="history-bar" style="height:${Math.max(2,s.realWordsPerMinute/Math.max(1,...comparable.map(s=>s.realWordsPerMinute))*100)}%" title="${number(s.realWordsPerMinute)} kelime/dk"></div>`).join('')}</div><p class="muted">Eskiden yeniye doğru kelime/dk · Ortalama doğruluk: %${number(average('accuracy'))}. Farklı çalışma türleri doğrudan karşılaştırılmayabilir.</p></section>` : ''}<section class="panel table-wrap"><table><caption class="muted">Son ${history.length} çalışma (en fazla ${data.config.historyLimit})</caption><thead><tr><th>Tarih</th><th>Çalışma</th><th>Klavye</th><th>Kelime/dk</th><th>Doğruluk</th><th>Süre</th></tr></thead><tbody>${[...history].reverse().map(s=>`<tr><td>${new Date(s.startedAt).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'})}</td><td>${escapeHTML(modes[s.exerciseType]?.[0] || s.exerciseType)}</td><td>${data.keyboards[s.keyboardLayout].name}</td><td>${isLetterMode(s.exerciseType) ? '—' : number(s.realWordsPerMinute)}</td><td>%${number(s.accuracy)}</td><td>${clock(s.durationSeconds)}</td></tr>`).join('')}</tbody></table></section><div class="actions"><button id="export-history">Geçmişi JSON olarak indir</button></div>` : '<section class="panel empty"><h2>İlk adım seni bekliyor.</h2><p>Bir çalışmayı tamamladığında sonuçların burada görünecek.</p><div class="actions" style="justify-content:center"><button class="primary" data-mode="EXPLORE">Klavyeyi tanı</button></div></section>'}<div class="tip">Sonuçlar yalnızca bu cihazın bu tarayıcısında saklanır. Tarayıcı verilerini temizlemek geçmişini siler. Taşınabilir dosyayı başka bir konuma taşıdığında eski kayıtlar görünmeyebilir.</div>`);
  $('#export-history')?.addEventListener('click',()=>download(history));
}
function showSettings() {
  mount(`<div class="eyebrow">SANA UYGUN BİR ÇALIŞMA</div><h1>Ayarlar</h1><form id="settings-form" class="panel"><div class="form-grid"><label class="field">Klavye düzeni<select name="keyboardLayout"><option value="TR_Q">Türkçe Q</option><option value="TR_F">Türkçe F</option></select></label><label class="field">Klavye yardımı<select name="help"><option value="1">1 · Tuşu her zaman göster</option><option value="2">2 · Biraz bekledikten sonra göster</option><option value="3">3 · Yanlış tuşta göster</option><option value="4">4 · Yardımsız çalış</option></select></label><label class="field">Yazı boyutu<select name="font"><option value="normal">Normal</option><option value="large">Büyük</option></select></label><label class="field">Tema<select name="theme"><option value="system">Sistem</option><option value="light">Açık</option><option value="dark">Koyu</option></select></label><label class="field">Dikte hızı<select name="speechRate"><option value="0.6">Yavaş</option><option value="0.8">Normal</option><option value="1">Hızlı</option></select></label><label class="checkbox"><input type="checkbox" name="contrast">Yüksek kontrast</label></div><div class="actions"><button class="primary" type="submit">Ayarları kaydet</button></div><p id="settings-status" role="status"></p></form><section class="panel"><h2>Türkçe Klavye Antrenörü</h2><p style="margin-top:10px">Sürüm ${data.version} · Hazırlayan: <strong>Aykut BOZALAN</strong></p><p>Halk Eğitimi Merkezi kursiyerleri için doğruluk ve klavye hâkimiyeti odaklı eğitim.</p><p style="margin-top:10px">Kişisel bilgi istenmez. Sonuçlar bu tarayıcıda kalır; herhangi bir sunucuya gönderilmez. Dikte, cihazdaki Türkçe sesin kullanılabilirliğine bağlıdır.</p><p><a href="https://github.com/aykido" target="_blank" rel="noopener noreferrer">Hazırlayanın GitHub profili ↗</a></p></section>`);
  for (const [key,value] of Object.entries(settings)) {
    const field = $('#settings-form').elements.namedItem(key); if (field) field.type === 'checkbox' ? field.checked = value : field.value = value;
  }
  $('#settings-form').onsubmit = event => {
    event.preventDefault(); const form = new FormData(event.target);
    settings = {version:1,keyboardLayout:form.get('keyboardLayout'),help:Number(form.get('help')),font:form.get('font'),theme:form.get('theme'),speechRate:Number(form.get('speechRate')),contrast:form.has('contrast')};
    const saved = store.saveSettings(settings); applySettings(); $('#settings-status').textContent = saved ? 'Ayarların kaydedildi.' : 'Ayarlar bu oturum için uygulandı; kalıcı kayıt yapılamadı.';
  };
}
document.addEventListener('click', event => {
  const layout = event.target.closest('[data-layout]');
  if (layout) { settings.keyboardLayout = layout.dataset.layout; store.saveSettings(settings); applySettings(); home(); }
  const nav = event.target.closest('[data-nav]'); if (nav) navigate(nav.dataset.nav);
  const mode = event.target.closest('[data-mode]'); if (mode) setup(mode.dataset.mode);
});
$('#brand').onclick = event => { event.preventDefault(); navigate('home'); };
$('#version').textContent = `v${data.version}`;
applySettings(); navigate('home');
