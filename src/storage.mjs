const SETTINGS_KEY = 'klavyetrain.settings.v1';
const HISTORY_KEY = 'klavyetrain.history.v1';
export const defaults = { version: 1, keyboardLayout: null, help: 1, font: 'normal',
  theme: 'system', contrast: false, speechRate: 0.8, showHands: true };
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function validSession(s) {
  if (!s || s.version !== 1 || !['TR_F', 'TR_Q'].includes(s.keyboardLayout) ||
    typeof s.id !== 'string' || typeof s.exerciseType !== 'string' || !Number.isFinite(Date.parse(s.startedAt))) return false;
  if (!['durationSeconds', 'totalCharacters', 'correctCharacters', 'incorrectCharacters', 'correctWords',
    'incorrectWords', 'backspaceCount', 'correctedErrors', 'accuracy', 'realWordsPerMinute', 'standardWpm', 'netWpm', 'cpm'].every(key => finite(s[key]))) return false;
  if (s.accuracy > 100 || !s.keyStats || !s.confusions || typeof s.keyStats !== 'object' || typeof s.confusions !== 'object') return false;
  return Object.values(s.keyStats).every(v => v && finite(v.attempts) && finite(v.errors) && v.errors <= v.attempts)
    && Object.values(s.confusions).every(finite);
}

export class StorageManager {
  constructor(storage, warn = () => {}) { this.storage = storage; this.warn = warn; this.blocked = new Set(); }
  read(key, fallback) {
    try { const raw = this.storage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch { this.warn('Yerel kayıtlar okunamadı. Bu oturumda çalışmaya devam edebilirsin.'); return fallback; }
  }
  write(key, value) {
    if (this.blocked.has(key)) return false;
    try { this.storage.setItem(key, JSON.stringify(value)); return true; }
    catch { this.warn('Tarayıcı kayıt alanı kullanılamıyor. Sonuçlarını JSON olarak dışa aktarabilirsin.'); return false; }
  }
  settings() {
    const s = this.read(SETTINGS_KEY, defaults);
    if (s?.version !== 1) { this.blocked.add(SETTINGS_KEY); this.warn('Ayar sürümü desteklenmiyor; eski kayıt korunuyor.'); return { ...defaults }; }
    return { ...defaults,
      keyboardLayout: ['TR_F', 'TR_Q'].includes(s.keyboardLayout) ? s.keyboardLayout : null,
      help: [1, 2, 3, 4].includes(s.help) ? s.help : 1,
      font: s.font === 'large' ? 'large' : 'normal',
      showHands: s.showHands !== false,
      theme: ['light', 'dark', 'system'].includes(s.theme) ? s.theme : 'system',
      contrast: s.contrast === true, speechRate: [0.6, 0.8, 1].includes(s.speechRate) ? s.speechRate : 0.8 };
  }
  history() {
    const value = this.read(HISTORY_KEY, { version: 1, sessions: [] });
    if (value?.version !== 1) { this.blocked.add(HISTORY_KEY); this.warn('Geçmiş sürümü desteklenmiyor; eski kayıt korunuyor.'); return []; }
    return Array.isArray(value.sessions) ? value.sessions.filter(validSession).slice(-20) : [];
  }
  saveSettings(settings) { return this.write(SETTINGS_KEY, settings); }
  saveHistory(sessions) { return this.write(HISTORY_KEY, { version: 1, sessions: sessions.filter(validSession).slice(-20) }); }
}
