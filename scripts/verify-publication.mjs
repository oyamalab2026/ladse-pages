import { readFile } from 'node:fs/promises';
const manifest=JSON.parse(await readFile(new URL('../src/data/downloads.json',import.meta.url),'utf8'));
const failures=[];
for(const file of manifest){
 const response=await fetch(file.url,{method:'HEAD',redirect:'follow'});
 if(!response.ok||Number(response.headers.get('content-length'))!==file.bytes)failures.push(`${file.path}: HTTP ${response.status}, unexpected size or unavailable`);
 else console.log(`Download OK: ${file.asset}`);
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
