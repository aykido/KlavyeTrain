export const lowerTR = text => String(text).normalize('NFC').toLocaleLowerCase('tr-TR');
export const equalTR = (a, b, strict = true) => strict
  ? String(a).normalize('NFC') === String(b).normalize('NFC') : lowerTR(a) === lowerTR(b);
export const wordsOf = text => String(text).trim().split(/\s+/u).filter(Boolean);

export function createSession(keyboardLayout, exerciseType, level, now = new Date()) {
  return { version: 1, id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: now.toISOString(), keyboardLayout, exerciseType, level,
    durationSeconds: 0, totalCharacters: 0, correctCharacters: 0, incorrectCharacters: 0,
    correctWords: 0, incorrectWords: 0, backspaceCount: 0, correctedErrors: 0,
    keyStats: {}, confusions: {} };
}

export function recordKey(session, expected, actual) {
  const correct = equalTR(expected, actual);
  session.totalCharacters++;
  session[correct ? 'correctCharacters' : 'incorrectCharacters']++;
  const key = lowerTR(expected || 'fazladan');
  const stats = session.keyStats[key] ||= { attempts: 0, errors: 0 };
  stats.attempts++;
  if (!correct) {
    stats.errors++;
    const pair = `${expected || '∅'}→${actual}`;
    session.confusions[pair] = (session.confusions[pair] || 0) + 1;
  }
  return correct;
}

export function submitWords(session, target, typed) {
  const expected = wordsOf(target), actual = wordsOf(typed);
  for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
    session[expected[i] !== undefined && equalTR(expected[i], actual[i] ?? '')
      ? 'correctWords' : 'incorrectWords']++;
  }
}

export function metrics(session, durationSeconds = session.durationSeconds) {
  const minutes = Math.max(0, durationSeconds) / 60;
  const rate = value => minutes ? value / minutes : 0;
  // First-stroke accuracy retains errors even after correction.
  // Standard WPM = all printable keystrokes / 5 / active minutes.
  // Net WPM = correct printable keystrokes / 5 / active minutes.
  return { ...session, durationSeconds: Math.max(0, durationSeconds),
    accuracy: session.totalCharacters ? session.correctCharacters / session.totalCharacters * 100 : 100,
    realWordsPerMinute: rate(session.correctWords), standardWpm: rate(session.totalCharacters / 5),
    netWpm: rate(session.correctCharacters / 5), cpm: rate(session.totalCharacters),
    totalWords: session.correctWords + session.incorrectWords,
    weakKeys: Object.entries(session.keyStats).filter(([key, stat]) => stat.errors && key !== 'fazladan' && key !== ' ')
      .sort((a, b) => b[1].errors / b[1].attempts - a[1].errors / a[1].attempts || b[1].errors - a[1].errors)
      .slice(0, 5).map(([key]) => key) };
}

export function trainingLevel(result, config) {
  return config.levels.find(level => result.realWordsPerMinute >= level.wpm && result.accuracy >= level.accuracy)?.name || 'Başlangıç';
}

export function feedback(result, targetWpm = 30, targetAccuracy = 95) {
  if (result.totalCharacters === 0) return 'Hazır olduğunda kısa bir çalışmayla başlayabilirsin.';
  if (result.accuracy < targetAccuracy) return result.realWordsPerMinute >= targetWpm
    ? 'Hızın yeterli. Bu çalışmada doğruluğa odaklan.'
    : 'Rahat bir ritimle, önce doğru tuşlara odaklan. Her çalışma bir adım.';
  return result.realWordsPerMinute >= targetWpm
    ? 'Hedefine ulaştın. Doğru ve istikrarlı yazma alışkanlığını koru.'
    : 'Doğruluğun çok iyi. Hedef hızına yaklaşıyorsun.';
}

export function chooseTarget(pool, keyStats = {}, recent = [], random = Math.random, strength = 2) {
  if (!pool.length) throw new Error('Çalışma için içerik bulunamadı.');
  const fresh = pool.filter(word => !recent.includes(word));
  const candidates = fresh.length ? fresh : pool;
  const weights = candidates.map(word => {
    const letters = [...new Set(lowerTR(word))];
    const difficulty = letters.reduce((sum, key) => {
      const stat = keyStats[key];
      return sum + (stat?.attempts ? stat.errors / stat.attempts : 0);
    }, 0);
    // Minimum weight 1 keeps ordinary words in the pool; maximum weight 4.
    return 1 + Math.min(3, difficulty * strength);
  });
  let needle = Math.max(0, Math.min(0.999999999, random())) * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < candidates.length; i++) { needle -= weights[i]; if (needle < 0) return candidates[i]; }
  return candidates.at(-1);
}

export function mergeKeyStats(sessions) {
  const stats = {};
  for (const session of sessions) for (const [key, value] of Object.entries(session.keyStats || {})) {
    const entry = stats[key] ||= { attempts: 0, errors: 0 };
    entry.attempts += value.attempts; entry.errors += value.errors;
  }
  return stats;
}

export function keyboardKeys(layout) {
  const fingers = ['Sol serçe', 'Sol yüzük', 'Sol orta', 'Sol işaret', 'Sol işaret',
    'Sağ işaret', 'Sağ işaret', 'Sağ orta', 'Sağ yüzük', 'Sağ serçe', 'Sağ serçe', 'Sağ serçe'];
  return layout.rows.map((row, rowIndex) => [...row].map((key, position) => ({ key,
    shifted: [...layout.shiftRows[rowIndex]][position], row: rowIndex, position,
    finger: fingers[rowIndex === 3 ? Math.max(0, position - 1) : position] || 'Sağ serçe' })));
}
