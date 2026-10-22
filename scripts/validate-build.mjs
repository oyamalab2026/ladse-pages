import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
export async function walk(dir){const result=[];for(const item of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,item.name);result.push(...(item.isDirectory()?await walk(p):[p]));}return result;}
const files=await walk(dist);
const issues=[];
for(const file of files){
  const rel=path.relative(dist,file);
  if((await stat(file)).size>25*1024*1024)issues.push(`Asset exceeds Pages 25 MiB limit: ${rel}`);
  if(/(^|\/)(\.git|owncloud|staff_only|\.env)(\/|$)|\.(php|sql|sh|log)$/i.test(rel))issues.push(`Unexpected private or executable file: ${rel}`);
}
if(files.length>20000)issues.push(`Pages file count exceeded: ${files.length}`);
const newHtml=files.filter(f=>f.endsWith('.html')&&!f.includes(`${path.sep}archive${path.sep}`));
const redirects=await readFile(path.join(dist,'_redirects'),'utf8');
const newsPages=[];
for(const file of newHtml){
 const html=await readFile(file,'utf8');
 const rel=path.relative(dist,file);
 if(html.includes('class="news-detail"')&&/^ja\/news\//.test(rel))newsPages.push(file);
 if(!html.includes('<html lang='))issues.push(`Missing document language: ${rel}`);
 const url=new URL('/'+rel.replace(/index\.html$/,''),'https://local.invalid');
 for(const match of html.matchAll(/\b(href|src|poster)="([^"]+)"/g)){
  const raw=match[2].replaceAll('&amp;','&');
  if(raw.startsWith('http:')&&match[1]!=='href')issues.push(`Insecure embedded resource in ${rel}: ${raw}`);
  if(/^(mailto:|tel:|data:|https?:|\/\/)/.test(raw))continue;
  let target;
  try{target=new URL(raw,url);}catch{issues.push(`Invalid URL in ${rel}: ${raw}`);continue;}
  const pathname=decodeURIComponent(target.pathname);
  const candidates=[pathname,pathname.replace(/\/$/,'')+'/index.html',pathname+'.html'];
  let found=false;
  for(const candidate of candidates){try{if((await stat(path.join(dist,candidate))).isFile()){found=true;break;}}catch{}}
  // Source aliases for large files are intentional Cloudflare redirects.
  if(!found&&!redirects.split('\n').some(l=>l.startsWith(target.pathname+' ')))issues.push(`Broken local link in ${rel}: ${raw}`);
 }
}
const report=JSON.parse(await readFile(path.join(root,'docs/migration-report.json'),'utf8'));
if(newsPages.length<report.news)issues.push(`News migration loss: ${newsPages.length}/${report.news}`);
if(issues.length){console.error([...new Set(issues)].join('\n'));process.exitCode=1;}else console.log(`Validated ${files.length} files, ${newHtml.length} new HTML pages, ${newsPages.length} news articles; local links and Pages limits OK.`);
