import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../src/core.mjs';
import { analyzeFlow, recordFlowEdit } from '../src/flow.mjs';
const session = () => createSession('TR_Q', 'FLOW', 2);

test('boşluk kelimeyi tamamlar, yanlış/eksik kelime sonraki hedefi kaydırmaz', () => {
  const state = analyzeFlow(['kalem', 'ışık', 'güneş'], 'kale ışık ');
  assert.equal(state.correctWords, 1); assert.equal(state.incorrectWords, 1);
  assert.equal(state.wordIndex, 2); assert.equal(state.next, 'g');
});
test('fazla boşluk hedef kelime atlamaz; satır sonu kelime ayırır', () => {
  const state = analyzeFlow(['şiş', 'İzmir', 'çiçek'], '  şiş  \nİzmir\n');
  assert.equal(state.correctWords, 2); assert.equal(state.wordIndex, 2);
  assert.equal(state.next, 'ç');
});
test('süre sonunda yalnızca yazılan kelimeler değerlendirilir', () => {
  const targets = ['ışık', 'güneş', 'köprü', 'orman'];
  assert.equal(analyzeFlow(targets, 'ışık güneş').correctWords, 1);
  assert.equal(analyzeFlow(targets, 'ışık güneş', true).correctWords, 2);
  const partial = analyzeFlow(targets, 'ışık gü', true);
  assert.equal(partial.correctWords, 1); assert.equal(partial.incorrectWords, 1);
  assert.equal(analyzeFlow(targets, '', true).incorrectWords, 0);
});
test('Backspace ile sınırdan geri dönüş skoru geri alır, tekrar boşluk iki kez saymaz', () => {
  const s = session(), targets = ['çay', 'süt'];
  recordFlowEdit(s, targets, '', 'çay ', 'insertText');
  assert.equal(s.correctWords, 1);
  recordFlowEdit(s, targets, 'çay ', 'çay', 'deleteContentBackward');
  assert.equal(s.correctWords, 0); assert.equal(s.backspaceCount, 1);
  recordFlowEdit(s, targets, 'çay', 'çay ', 'insertText');
  assert.equal(s.correctWords, 1); assert.equal(s.incorrectCharacters, 0);
});
test('ortadaki seçimi düzeltmek yalnızca yeni vuruşları ölçer; ilk hata korunur', () => {
  const s = session(), targets = ['şiş', 'İzmir'];
  recordFlowEdit(s, targets, '', 'sis İzmir ', 'insertText');
  assert.equal(s.incorrectWords, 1); assert.equal(s.correctWords, 1);
  const originalTotal = s.totalCharacters;
  recordFlowEdit(s, targets, 'sis İzmir ', 'şiş İzmir ', 'insertText');
  assert.equal(s.correctWords, 2); assert.equal(s.incorrectWords, 0);
  assert.equal(s.totalCharacters, originalTotal + 3);
  assert.equal(s.correctedErrors, 2); assert.equal(s.incorrectCharacters, 2);
  assert.equal(s.backspaceCount, 0);
});
