import { keyboardKeys, FINGER_NAMES } from './core.mjs';

// Original vector geometry, authored for this project. No third-party artwork.
const guideEscape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const keyLabel = key => key.key === ' ' ? 'Boşluk' : key.label || key.key.toLocaleUpperCase('tr-TR');
export function guideKeys(layout) {
  const starts = [60, 90, 105, 75];
  const keys = keyboardKeys(layout).flat().map(key => ({ ...key, x: starts[key.row] + key.position * 60,
    y: 24 + key.row * 60, width: 60, height: 54 }));
  const extra = (key, code, fingerId, x, y, width, row, label = key) => ({key, code, fingerId,
    finger: FINGER_NAMES[fingerId], x, y, width, height: 54, row, label});
  keys.push(extra('Backspace','Backspace','R5',780,24,120,0,'← Sil'),
    extra('Tab','Tab','L5',0,84,90,1), extra('CapsLock','CapsLock','L5',0,144,105,2,'Caps Lock'),
    { ...extra('Enter','Enter','R5',810,84,90,2), height:114, tipX:865, tipY:171,
      shape:'M814 88 H896 V194 H829 V142 H814 Z' },
    extra('Shift','ShiftLeft','L5',0,204,75,3,'⇧'), extra('Shift','ShiftRight','R5',735,204,165,3,'Shift ⇧'),
    extra(' ','Space','R1',240,264,360,4,'Boşluk'));
  return keys;
}

export function guideSelection(layout, value) {
  const keys = guideKeys(layout);
  const key = keys.find(key => key.code === value) || keys.find(key => key.key === value || key.shifted === value);
  if (!key) return { key: null, shift: null, message: 'Parmaklarını temel sıraya yerleştir. Bir tuş seçerek hangi parmağını kullanacağını keşfet.' };
  const shifted = value === key.shifted && value !== key.key;
  const shift = shifted ? keys.find(candidate => candidate.code === (key.fingerId.startsWith('L') ? 'ShiftRight' : 'ShiftLeft')) : null;
  const label = shifted ? value : keyLabel(key);
  const message = key.code === 'Space' ? 'Boşluk · Başparmaklarından biriyle bas. Görselde sağ başparmak örneklenmiştir.'
    : `${label} · ${key.finger} parmağı${shift ? ` + ${shift.finger.toLocaleLowerCase('tr-TR')} parmakla Shift.` : '.'}`;
  return { key, shift, message };
}

const handSpecs = [
  {suffix:'5', name:'serce', x:150, ratio:.75},
  {suffix:'4', name:'yuzuk', x:195, ratio:.92},
  {suffix:'3', name:'orta', x:240, ratio:1},
  {suffix:'2', name:'isaret', x:285, ratio:.9},
  {suffix:'1', name:'bas', x:322, ratio:.7}
];
function handSvg(side) {
  const fingers = handSpecs.map(spec => {
    const id = side + spec.suffix, length = 120 * spec.ratio;
    const thumb = spec.suffix === '1';
    const height = thumb ? 32 : length, width = thumb ? length : 32;
    return `<g id="finger-${side === 'L' ? 'sol' : 'sag'}-${spec.name}" data-finger="${id}" class="hand-finger finger-${id}"><rect x="${spec.x}" y="${thumb ? 165 : 155-length}" width="${width}" height="${height}" rx="${height/2}" ry="16"/></g>`;
  }).join('');
  return `<g class="hand" ${side === 'R' ? 'transform="translate(900 0) scale(-1 1)"' : ''}><rect class="hand-palm" x="140" y="140" width="190" height="85" rx="32"/>${fingers}</g>`;
}

export function keyboardGraphic(layout, {showHands = true, interactive = false} = {}) {
  const keys = guideKeys(layout);
  const keyFaces = keys.map(key => `<g class="guide-key finger-${key.fingerId}${key.home ? ' is-home' : ''}" data-key-code="${key.code}"${interactive ? ` role="button" tabindex="${key.code === 'KeyF' ? 0 : -1}" aria-label="${guideEscape(keyLabel(key))} — ${key.finger}${key.home ? ', temel sıra' : ''}"` : ''}><title>${guideEscape(keyLabel(key))} · ${key.finger}</title>${key.shape ? `<path class="key-face" d="${key.shape}"/>` : `<rect class="key-face" x="${key.x+3}" y="${key.y+3}" width="${key.width-6}" height="${key.height-6}" rx="7"/>`}${key.home ? `<path class="home-mark" d="M${key.x+23} ${key.y+45} h14"/>` : ''}</g>`).join('');
  // The keyboard and abstract hand guide are separate SVGs.
  const labels = keys.map(key => `<text class="guide-key-label${key.label ? ' special-label' : ''}" x="${key.x+key.width/2}" y="${key.y+31}">${guideEscape(keyLabel(key))}</text>`).join('');
  return `<div class="guide-scroll"><svg class="keyboard-guide" viewBox="-12 0 924 340" xmlns="http://www.w3.org/2000/svg" role="${interactive ? 'group' : 'img'}" aria-label="${layout.name} klavye ve parmak yerleşimi"><rect class="keyboard-frame" x="-6" y="12" width="912" height="316" rx="16"/><text class="guide-layout-label" x="28" y="56">${layout.name.endsWith('Q') ? 'Q' : 'F'}</text>${keyFaces}<g class="guide-modifiers" aria-hidden="true"><text x="42" y="296">Ctrl</text><text x="108" y="296">⊞</text><text x="181" y="296">Alt</text><text x="647" y="296">AltGr</text><text x="742" y="296">☰</text><text x="849" y="296">Ctrl</text></g><g class="key-labels" aria-hidden="true">${labels}</g></svg></div><svg class="hands-layer hand-guide" viewBox="0 0 900 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sol ve sağ el parmak rehberi"${showHands ? '' : ' style="display:none"'}>${handSvg('L')}${handSvg('R')}<text class="hand-label" x="240" y="250">SOL EL</text><text class="hand-label" x="660" y="250">SAĞ EL</text></svg>`;
}

export function updateKeyboardGraphic(root, layout, value = '') {
  const selection = guideSelection(layout, value);
  for (const element of root.querySelectorAll('[data-key-code]')) {
    const selected = [selection.key, selection.shift].some(key => key?.code === element.dataset.keyCode);
    element.classList.toggle('is-active', selected);
    if (element.hasAttribute('tabindex')) element.setAttribute('tabindex', element.dataset.keyCode === (selection.key?.code || 'KeyF') ? '0' : '-1');
  }
  for (const group of root.querySelectorAll('[data-finger]')) {
    group.classList.toggle('is-active', [selection.key, selection.shift].some(key => key?.fingerId === group.dataset.finger));
  }
  const message = root.querySelector('[data-guide-message]');
  if (message) message.textContent = selection.message;
  for (const item of root.querySelectorAll('[data-legend-finger]')) item.classList.toggle('is-active', [selection.key,selection.shift].some(key=>key?.fingerId === item.dataset.legendFinger));
  return selection;
}

export function fingerLegend(layout) {
  const keys = keyboardKeys(layout).flat();
  return `<div class="finger-legend">${Object.entries(FINGER_NAMES).filter(([id])=>!id.endsWith('1')).map(([id,name]) => {
    const home = keys.find(key => key.home && key.fingerId === id);
    return `<span class="legend-item finger-${id}" data-legend-finger="${id}"><i aria-hidden="true"></i><span>${name}<strong>${home?.key.toLocaleUpperCase('tr-TR') || ''}</strong></span></span>`;
  }).join('')}</div>`;
}

export class KeyboardGuideController {
  constructor(root, layout) {
    this.root = root; this.layout = layout; this.value = '';
    this.select = value => { this.value = value; return updateKeyboardGraphic(root,layout,value); };
    this.pointer = event => { const key = event.target.closest('[data-key-code]'); if (key) this.select(key.dataset.keyCode); };
    this.keydown = event => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.target.closest('[data-key-code]');
      if (key && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const keys = guideKeys(layout).sort((a,b)=>a.row-b.row || a.x-b.x), current = keys.find(k=>k.code===key.dataset.keyCode);
        let next;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next = keys[(keys.indexOf(current)+(event.key==='ArrowLeft' ? -1 : 1)+keys.length)%keys.length];
        else next = keys.filter(k=>k.row===current.row+(event.key==='ArrowUp' ? -1 : 1)).sort((a,b)=>Math.abs(a.x+a.width/2-current.x-current.width/2)-Math.abs(b.x+b.width/2-current.x-current.width/2))[0];
        if (next) { this.select(next.code); root.querySelector(`[data-key-code="${next.code}"]`).focus(); }
        return;
      }
      if (key && ['Enter',' '].includes(event.key)) { event.preventDefault(); this.select(key.dataset.keyCode); return; }
      if (event.target.closest('input,select,textarea,button,a,summary')) return;
      if (event.key === 'Tab') return; // Keep normal focus navigation.
      const value = event.key === 'Shift' ? event.code : event.key;
      if (guideSelection(layout,value).key) { event.preventDefault(); this.select(value); }
    };
    root.addEventListener('pointerover',this.pointer); root.addEventListener('click',this.pointer); root.addEventListener('focusin',this.pointer);
    root.ownerDocument.addEventListener('keydown',this.keydown);
  }
  destroy() {
    this.root.removeEventListener('pointerover',this.pointer); this.root.removeEventListener('click',this.pointer); this.root.removeEventListener('focusin',this.pointer);
    this.root.ownerDocument.removeEventListener('keydown',this.keydown);
  }
}
