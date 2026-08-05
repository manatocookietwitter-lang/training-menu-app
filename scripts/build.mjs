import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(root,'dist','server','index.js');

const textFiles=[
  ['index.html','text/html; charset=utf-8'],
  ['styles.css','text/css; charset=utf-8'],
  ['app.js','text/javascript; charset=utf-8'],
  ['sw.js','text/javascript; charset=utf-8'],
  ['manifest.webmanifest','application/manifest+json; charset=utf-8']
];

const binaryFiles=[
  ['icons/favicon-32-v2.png','image/png'],
  ['icons/apple-touch-icon-v2.png','image/png'],
  ['icons/icon-192-v2.png','image/png'],
  ['icons/icon-512-v2.png','image/png']
];

const textAssets=[];
for(const [path,type] of textFiles){
  textAssets.push([`/${path}`,{body:await readFile(resolve(root,path),'utf8'),type}]);
}

const binaryAssets=[];
for(const [path,type] of binaryFiles){
  binaryAssets.push([`/${path}`,{body:(await readFile(resolve(root,path))).toString('base64'),type}]);
}

const worker=`const textAssets=new Map(${JSON.stringify(textAssets)});
const binaryAssets=new Map(${JSON.stringify(binaryAssets)});

function responseHeaders(path,type){
  const headers=new Headers({
    'Content-Type':type,
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'strict-origin-when-cross-origin'
  });
  if(path==='/index.html'){
    headers.set('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  }
  if(path==='/sw.js')headers.set('Service-Worker-Allowed','/');
  const revalidate=path==='/index.html'||path==='/sw.js'||path==='/manifest.webmanifest';
  headers.set('Cache-Control',revalidate?'no-cache':'public, max-age=3600, must-revalidate');
  return headers;
}

function binaryFromBase64(value){
  return Uint8Array.from(atob(value),character=>character.charCodeAt(0));
}

export default {
  async fetch(request){
    if(request.method!=='GET'&&request.method!=='HEAD'){
      return new Response('Method Not Allowed',{status:405,headers:{Allow:'GET, HEAD'}});
    }
    const url=new URL(request.url);
    let path=decodeURIComponent(url.pathname);
    if(path==='/'||path.endsWith('/'))path='/index.html';
    let asset=textAssets.get(path);
    let binary=false;
    if(!asset){asset=binaryAssets.get(path);binary=Boolean(asset)}
    if(!asset&&request.headers.get('accept')?.includes('text/html')){
      path='/index.html';
      asset=textAssets.get(path);
    }
    if(!asset)return new Response('Not Found',{status:404});
    const body=request.method==='HEAD'?null:(binary?binaryFromBase64(asset.body):asset.body);
    return new Response(body,{status:200,headers:responseHeaders(path,asset.type)});
  }
};
`;

await rm(resolve(root,'dist'),{recursive:true,force:true});
await mkdir(dirname(output),{recursive:true});
await writeFile(output,worker,'utf8');
console.log('Sites build ready');
