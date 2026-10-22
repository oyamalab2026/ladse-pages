import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { repository, getToken, github } from './github.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const marker='oyama-ladse-pages-v1';
try{
 if(process.argv.includes('--check')){
  for(const file of ['dist/ja/index.html','dist/en/index.html','docs/migration-report.json','src/data/downloads.json']){
   if(!existsSync(file))throw new Error(`Missing publication artifact: ${file}`);
  }
  console.log('Static publication artifacts are ready. GitHub/Cloudflare authentication and release upload must be completed before public deployment.');
  process.exit(0);
 }
 const token=getToken();
 const remote=await github(`/repos/${repository}`,{token,allow404:true});
 if(!remote){
  const [owner,name]=repository.split('/');
  const account=await github(`/users/${owner}`,{token});
  let endpoint;
  if(account.type==='Organization')endpoint=`/orgs/${owner}/repos`;
  else if(account.type==='User'){
   const authenticated=await github('/user',{token});
   if(authenticated.login.toLowerCase()!==owner.toLowerCase())throw new Error(`Authenticate as ${owner} before creating this repository.`);
   endpoint='/user/repos';
  }else throw new Error('Unsupported GitHub repository owner.');
  await github(endpoint,{method:'POST',token,body:{name,description:'Oyama Laboratory public website — Astro / Cloudflare Pages',private:false,auto_init:false}});
 }else if(remote.size>0){
  const file=await github(`/repos/${repository}/contents/.ladse-pages-project`,{token,allow404:true});
  if(!file||Buffer.from(file.content,'base64').toString().trim()!==marker)throw new Error('The destination repository contains another project. Refusing to overwrite it.');
 }
 await writeFile('.ladse-pages-project',marker+'\n');
 const env={...process.env,GH_TOKEN:token,GIT_ASKPASS:path.join(root,'scripts/github-askpass.mjs'),GIT_TERMINAL_PROMPT:'0'};
 const git=(args,opts={})=>execFileSync('git',args,{cwd:root,env,stdio:'inherit',...opts});
 if(!existsSync('.git'))git(['init','-b','main']);
 const origin=`https://github.com/${repository}.git`;
 let oldOrigin='';try{oldOrigin=git(['remote','get-url','origin'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
 if(oldOrigin&&oldOrigin!==origin)throw new Error('Unexpected git origin. Refusing to replace it.');
 if(!oldOrigin)git(['remote','add','origin',origin]);
 git(['add','--all']);
 try{git(['diff','--cached','--quiet']);}catch{git(['commit','-m','Build bilingual Oyama Laboratory website and public archives']);}
 git(['push','-u','origin','main']);
 console.log(`Source published: https://github.com/${repository}`);
 console.log('Next: npm run publish:assets, then connect this repository in Cloudflare Pages.');
}catch(error){console.error(error.message);process.exitCode=1;}
