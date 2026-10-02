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
  {suffix:'5', x:135, baseX:166, baseY:301, width:27},
  {suffix:'4', x:195, baseX:208, baseY:289, width:31},
  {suffix:'3', x:255, baseX:251, baseY:286, width:33},
  {suffix:'2', x:315, baseX:295, baseY:300, width:32},
  {suffix:'1', x:370, y:291, baseX:307, baseY:350, width:35}
];
function fingerGeometry(spec, side, selection) {
  const id = side + spec.suffix;
  const pressed = [selection.key, selection.shift].find(key => key?.fingerId === id);
  let x = spec.x, y = spec.y || 171;
  if (pressed) {
    const globalX = pressed.code === 'Space' ? 440 : pressed.tipX || pressed.x + pressed.width / 2;
    x = side === 'R' ? 810 - globalX : globalX;
    y = pressed.tipY || pressed.y + 27;
  }
  const b = spec.baseX, h = spec.baseY, w = spec.width / 2;
  // Curved capsules attach to the palm; the fingertip meets the target key.
  const path = `M${b-w} ${h} C${b-w} ${h-35} ${x-w} ${y+52} ${x-w} ${y+6} Q${x-w} ${y-15} ${x} ${y-15} Q${x+w} ${y-15} ${x+w} ${y+6} C${x+w} ${y+52} ${b+w} ${h-35} ${b+w} ${h} Z`;
  return {id, x, y, path, pressed: Boolean(pressed)};
}
function handSvg(side, selection) {
  const fingers = handSpecs.map(spec => {
    const f = fingerGeometry(spec, side, selection);
    return `<g data-finger="${f.id}" class="hand-finger finger-${f.id}${f.pressed ? ' is-active' : ''}"><path d="${f.path}"/><ellipse cx="${f.x}" cy="${f.y+5}" rx="8" ry="11" class="finger-nail"/></g>`;
  }).join('');
  return `<g class="hand" ${side === 'R' ? 'transform="translate(810 0) scale(-1 1)"' : ''}><path class="hand-palm" d="M148 280 C177 264 277 261 310 290 C330 310 324 339 333 355 C317 379 310 398 309 424 L189 424 C186 391 155 367 145 333 C140 314 137 293 148 280Z"/>${fingers}<path class="hand-crease" d="M175 324 Q232 299 298 324 M189 389 Q245 376 302 388"/></g>`;
}

export function keyboardGraphic(layout, {showHands = true, interactive = false} = {}) {
  const keys = guideKeys(layout);
  const selection = guideSelection(layout, '');
  const keyFaces = keys.map(key => `<g class="guide-key finger-${key.fingerId}${key.home ? ' is-home' : ''}" data-key-code="${key.code}"${interactive ? ` role="button" tabindex="${key.code === 'KeyF' ? 0 : -1}" aria-label="${guideEscape(keyLabel(key))} — ${key.finger}${key.home ? ', temel sıra' : ''}"` : ''}><title>${guideEscape(keyLabel(key))} · ${key.finger}</title>${key.shape ? `<path class="key-face" d="${key.shape}"/>` : `<rect class="key-face" x="${key.x+3}" y="${key.y+3}" width="${key.width-6}" height="${key.height-6}" rx="7"/>`}${key.home ? `<path class="home-mark" d="M${key.x+23} ${key.y+45} h14"/>` : ''}</g>`).join('');
  // Labels are painted AFTER the hands, so translucent fingers never hide letters.
  const labels = keys.map(key => `<text class="guide-key-label${key.label ? ' special-label' : ''}" x="${key.x+key.width/2}" y="${key.y+31}">${guideEscape(keyLabel(key))}</text>`).join('');
  return `<div class="guide-scroll"><svg class="keyboard-guide" viewBox="-12 0 924 ${showHands ? 470 : 340}" xmlns="http://www.w3.org/2000/svg" role="${interactive ? 'group' : 'img'}" aria-label="${layout.name} klavye ve parmak yerleşimi"><rect class="keyboard-frame" x="-6" y="12" width="912" height="316" rx="16"/><text class="guide-layout-label" x="28" y="56">${layout.name.endsWith('Q') ? 'Q' : 'F'}</text>${keyFaces}<g class="guide-modifiers" aria-hidden="true"><text x="42" y="296">Ctrl</text><text x="108" y="296">⊞</text><text x="181" y="296">Alt</text><text x="647" y="296">AltGr</text><text x="742" y="296">☰</text><text x="849" y="296">Ctrl</text></g><g class="hands-layer" aria-hidden="true"${showHands ? '' : ' style="display:none"'}>${handSvg('L',selection)}${handSvg('R',selection)}<text class="hand-label" x="247" y="455">SOL EL</text><text class="hand-label" x="563" y="455">SAĞ EL</text></g><g class="key-labels" aria-hidden="true">${labels}</g></svg></div>`;
}

export function updateKeyboardGraphic(root, layout, value = '') {
  const selection = guideSelection(layout, value);
  for (const element of root.querySelectorAll('[data-key-code]')) {
    const selected = [selection.key, selection.shift].some(key => key?.code === element.dataset.keyCode);
    element.classList.toggle('is-active', selected);
    if (element.hasAttribute('tabindex')) element.setAttribute('tabindex', element.dataset.keyCode === (selection.key?.code || 'KeyF') ? '0' : '-1');
  }
  for (const side of ['L','R']) for (const spec of handSpecs) {
    const f = fingerGeometry(spec, side, selection), group = root.querySelector(`[data-finger="${f.id}"]`);
    if (!group) continue;
    group.classList.toggle('is-active', f.pressed);
    group.querySelector('path').setAttribute('d', f.path);
    group.querySelector('ellipse').setAttribute('cx', f.x);
    group.querySelector('ellipse').setAttribute('cy', f.y+5);
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
