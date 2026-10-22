import { createReadStream } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repository, releaseTag, getToken, github } from './github.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try{
 const token=getToken();
 const manifest=JSON.parse(await readFile(path.join(root,'src/data/downloads.json'),'utf8'));
 const source=path.resolve(process.env.LEGACY_SOURCE||path.join(root,'.migration/source'));
 // Verify every local file before making any change to the release.
 for(const item of manifest){
  const file=path.join(source,item.path);
  if((await stat(file)).size!==item.bytes)throw new Error(`File size mismatch: ${item.path}`);
  const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);
  if(hash.digest('hex')!==item.sha256)throw new Error(`Checksum mismatch: ${item.path}`);
 }
 let release=await github(`/repos/${repository}/releases/tags/${releaseTag}`,{token,allow404:true});
 if(!release)release=await github(`/repos/${repository}/releases`,{method:'POST',token,body:{tag_name:releaseTag,target_commitish:'main',name:'Public legacy research assets — 2026-10-22',body:'Previously published LADSE benchmark datasets, lecture materials and research video. Original contents are preserved. SHA-256 checksums are recorded in src/data/downloads.json.',draft:false,prerelease:false}});
 for(const item of manifest){
  const existing=release.assets.find(x=>x.name===item.asset);
  if(existing){
   if(existing.size!==item.bytes||existing.digest!==`sha256:${item.sha256}`)throw new Error(`Existing release asset differs or has no verifiable checksum: ${item.asset}. It was not replaced.`);
   console.log(`Verified existing asset: ${item.asset}`);continue;
  }
  const uploaded=await github(`https://uploads.github.com/repos/${repository}/releases/${release.id}/assets?name=${encodeURIComponent(item.asset)}`,{
   method:'POST',token,headers:{'Content-Type':'application/octet-stream','Content-Length':String(item.bytes)},body:createReadStream(path.join(source,item.path)),
  });
  if(uploaded.size!==item.bytes||uploaded.digest!==`sha256:${item.sha256}`)throw new Error(`Uploaded asset failed verification: ${item.asset}`);
  console.log(`Uploaded and verified: ${item.asset}`);
 }
 await writeFile(path.join(root,'.migration/releases-verified.json'),JSON.stringify({repository,releaseTag,verifiedAt:new Date().toISOString(),assets:manifest.map(x=>({name:x.asset,sha256:x.sha256}))},null,2)+'\n');
 console.log(`All ${manifest.length} large assets verified: ${release.html_url}`);
}catch(error){console.error(error.message);process.exitCode=1;}
