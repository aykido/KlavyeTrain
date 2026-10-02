import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFile(path.join(root,name),'utf8');
const metadata = JSON.parse(await read('package.json'));
if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(metadata.version)) throw new Error('Geçersiz sürüm');
const data = { version:metadata.version };
for (const name of ['config','words','sentences','keyboards']) data[name] = JSON.parse(await read(`data/${name}.json`));
for (const level of [1,2,3,4]) if (!data.words[level]?.length || data.words[level].some(word=>typeof word !== 'string' || !word.trim())) throw new Error(`Kelime verisi hatalı: ${level}`);
for (const layout of Object.values(data.keyboards)) {
  if (layout.rows.length !== layout.shiftRows.length || layout.rows.some((row,i)=>[...row].length !== [...layout.shiftRows[i]].length)) throw new Error('Klavye haritası hatalı');
}
const js = (await Promise.all(['core','storage','app'].map(name=>read(`src/${name}.mjs`))))
  .map(source=>source.replace(/^import .+;\r?\n/gm,'').replace(/^export /gm,'')).join('\n');
// Inline JSON must never be able to terminate its script element.
const json = JSON.stringify(data).replace(/</g,'\\u003c');
const html = (await read('src/index.html')).replace('/* APP_CSS */', await read('src/style.css'))
  .replace('APP_DATA',()=>json).replace('/* APP_JS */',()=>`(() => {\n'use strict';\n${js}\n})();`.replace(/<\/script/gi,'<\\/script'));
await mkdir(path.join(root,'dist'),{recursive:true});
await writeFile(path.join(root,'dist/index.html'),html,'utf8');
await writeFile(path.join(root,'dist/version.json'),JSON.stringify({version:metadata.version,author:metadata.author},null,2)+'\n');
for (const name of ['Kur.cmd','Kaldir.cmd']) await copyFile(path.join(root,'installer',name),path.join(root,'dist',name));
for (const name of ['install.ps1','uninstall.ps1']) {
  // Windows PowerShell 5.1 requires a BOM to decode Turkish text correctly.
  await writeFile(path.join(root,'dist',name),'\uFEFF'+(await read(`installer/${name}`)).replace(/^\uFEFF/,''),'utf8');
}
await copyFile(path.join(root,'KULLANIM.md'),path.join(root,'dist/ONCE-OKUYUN.txt'));
console.log(`Türkçe Klavye Antrenörü v${metadata.version} hazır: dist/index.html`);
