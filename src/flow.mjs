import { equalTR, recordKey } from './core.mjs';

// Align by word boundaries so one missing letter does not shift the whole passage.
// Whitespace completes a nonempty word. Extra spaces never skip target words.
export function analyzeFlow(targets, text, final = false) {
  const characters = [...text.normalize('NFC')];
  const words = [], expected = [];
  let wordIndex = 0, token = '', start = 0;
  for (let index = 0; index < characters.length; index++) {
    const char = characters[index], target = [...(targets[wordIndex] || '')];
    const separator = /\s/u.test(char);
    expected.push(target[[...token].length] ?? (separator && token ? ' ' : ''));
    if (separator) {
      if (token) {
        words.push({ text: token, start, end: index, complete: true, correct: equalTR(token, targets[wordIndex] || '') });
        wordIndex++; token = '';
      }
      start = index + 1;
    } else token += char;
  }
  if (token) words.push({ text: token, start, end: characters.length, complete: final, correct: equalTR(token, targets[wordIndex] || '') });
  const completed = words.filter(word => word.complete);
  return { words, expected, wordIndex, offset: [...token].length,
    next: [...(targets[wordIndex] || '')][[...token].length] ?? (token ? ' ' : ''),
    correctWords: completed.filter(word => word.correct).length,
    incorrectWords: completed.filter(word => !word.correct).length };
}

// Diff only the edited range, preserving first-stroke accuracy when a learner
// moves the caret, replaces a selection, or deletes across word boundaries.
export function recordFlowEdit(session, targets, previous, next, inputType = '') {
  const before = [...previous.normalize('NFC')], after = [...next.normalize('NFC')];
  let from = 0, oldEnd = before.length, newEnd = after.length;
  while (from < oldEnd && from < newEnd && before[from] === after[from]) from++;
  while (oldEnd > from && newEnd > from && before[oldEnd - 1] === after[newEnd - 1]) { oldEnd--; newEnd--; }
  const oldState = analyzeFlow(targets, previous), state = analyzeFlow(targets, next);
  const comparable = char => /\s/u.test(char) ? ' ' : char;
  if (inputType === 'deleteContentBackward' || inputType === 'deleteWordBackward') session.backspaceCount++;
  for (let i = from; i < oldEnd; i++) if (!equalTR(oldState.expected[i], comparable(before[i]))) session.correctedErrors++;
  let correct = true;
  for (let i = from; i < newEnd; i++) correct = recordKey(session, state.expected[i], comparable(after[i])) && correct;
  session.correctWords = state.correctWords;
  session.incorrectWords = state.incorrectWords;
  return { ...state, correct };
}
