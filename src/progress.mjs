import { lowerTR, mergeKeyStats, keyboardKeys } from './core.mjs';

const progressEscape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function localDay(value = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function validDay(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === day;
}
const dayNumber = day => Date.parse(`${day}T12:00:00Z`) / 86400000;
export function practiceStreak(days, today = localDay()) {
  const numbers = [...new Set(days.filter(validDay))].map(dayNumber).filter(day => day <= dayNumber(today)).sort((a,b)=>a-b);
  let best = 0, run = 0, previous;
  for (const day of numbers) { run = day === previous + 1 ? run + 1 : 1; best = Math.max(best,run); previous = day; }
  const set = new Set(numbers), currentDay = dayNumber(today);
  let current = 0, cursor = set.has(currentDay) ? currentDay : currentDay - 1;
  while (set.has(cursor)) { current++; cursor--; }
  return {current,best,totalDays:numbers.length,today:set.has(currentDay)};
}
export function heatData(sessions, layoutId) {
  return mergeKeyStats(sessions.filter(session=>session.keyboardLayout === layoutId && session.exerciseType !== 'SHORTCUTS'));
}
export function keyHeat(stat) {
  if (!stat?.attempts) return {level:'none',rate:null,attempts:0,errors:0};
  const rate = stat.errors / stat.attempts;
  return {level:rate === 0 ? 'good' : rate < .1 ? 'mild' : rate < .25 ? 'warm' : 'hot',rate,attempts:stat.attempts,errors:stat.errors};
}
export function heatmapMarkup(layout, stats) {
  return `<div class="heatmap-scroll"><div class="heatmap" role="group" aria-label="Tuş hata oranları">${keyboardKeys(layout).map(row=>`<div class="heat-row">${row.map(key=>{
    const stat=keyHeat(stats[lowerTR(key.key)]), label=key.key.toLocaleUpperCase('tr-TR');
    const info=stat.rate === null ? `${label}: henüz veri yok` : `${label}: ${stat.errors} hata / ${stat.attempts} vuruş, %${Math.round(stat.rate*100)} hata${stat.attempts < 5 ? ', az örnek' : ''}`;
    return `<button class="heat-key heat-${stat.level}" data-heat-key="${progressEscape(key.key)}" aria-label="${progressEscape(info)}" title="${progressEscape(info)}">${progressEscape(label)}<small>${stat.rate === null ? '—' : `%${Math.round(stat.rate*100)}`}</small></button>`;
  }).join('')}</div>`).join('')}</div></div>`;
}
export function trendMarkup(sessions, metric, label, unit) {
  if (!sessions.length) return '<p class="muted chart-empty">Bu filtrede henüz yazma çalışması yok.</p>';
  const values=sessions.map(s=>s[metric]), max=metric === 'accuracy' ? 100 : Math.max(10,...values);
  const x=index=>50 + (sessions.length === 1 ? 230 : index*460/(sessions.length-1)), y=value=>165-value/max*130;
  const points=values.map((value,index)=>`${x(index)},${y(value)}`).join(' ');
  return `<svg class="trend-chart" viewBox="0 0 540 205" role="img" aria-label="${label}; eskiden yeniye ${sessions.length} çalışma. Ayrıntılar aşağıdaki tabloda."><g class="chart-grid">${[0,.5,1].map(part=>`<line x1="50" y1="${y(max*part)}" x2="510" y2="${y(max*part)}"/><text x="40" y="${y(max*part)+4}" text-anchor="end">${Math.round(max*part)}</text>`).join('')}</g><polyline class="chart-line" points="${points}"/>${values.map((value,index)=>`<circle class="chart-point" cx="${x(index)}" cy="${y(value)}" r="4"><title>${new Date(sessions[index].startedAt).toLocaleString('tr-TR')}: ${value.toLocaleString('tr-TR',{maximumFractionDigits:1})} ${unit}</title></circle>`).join('')}<text class="chart-label" x="50" y="193">İlk kayıt</text><text class="chart-label" x="510" y="193" text-anchor="end">Son kayıt</text></svg>`;
}
