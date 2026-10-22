import { execFileSync } from 'node:child_process';
export const repository='oyamalab2026/ladse-pages';
export const releaseTag='legacy-assets-2026-10-22';
export function getToken(){
 let token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
 if(!token){try{token=execFileSync('gh',['auth','token'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}}
 if(!token)throw new Error('GitHub認証が必要です。GitHubを接続するか、gh auth loginを完了してください。トークンをリポジトリに保存しないでください。');
 return token;
}
export async function github(endpoint,{method='GET',body,token=getToken(),allow404=false,headers={}}={}){
 const res=await fetch(endpoint.startsWith('https://')?endpoint:`https://api.github.com${endpoint}`,{
  method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'ladse-pages-publisher',...(body?'Content-Type' in headers?{}:{'Content-Type':'application/json'}:{}),...headers},
  ...(body?{body:typeof body==='object'&&typeof body.pipe!=='function'?JSON.stringify(body):body}:{}),
  ...(body&&typeof body.pipe==='function'?{duplex:'half'}:{}),
 });
 if(allow404&&res.status===404)return null;
 const data=await res.json();
 if(!res.ok)throw new Error(`GitHub API ${res.status}: ${data.message||res.statusText}`);
 return data;
}
