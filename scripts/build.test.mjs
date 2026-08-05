import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { stat } from 'node:fs/promises';
import test from 'node:test';

execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});
const workerUrl=new URL('../dist/server/index.js',import.meta.url);
workerUrl.searchParams.set('test',String(Date.now()));
const {default:worker}=await import(workerUrl.href);

test('serves the installable app shell',async()=>{
  const response=await worker.fetch(new Request('https://example.test/',{headers:{accept:'text/html'}}));
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type')??'',/^text\/html/);
  assert.match(await response.text(),/<title>練習メニュープランナー<\/title>/);
});

test('serves PWA files with the expected headers',async()=>{
  const [manifest,serviceWorker,icon]=await Promise.all([
    worker.fetch(new Request('https://example.test/manifest.webmanifest')),
    worker.fetch(new Request('https://example.test/sw.js')),
    worker.fetch(new Request('https://example.test/icons/icon-192-v3.png'))
  ]);
  assert.equal(manifest.status,200);
  assert.match(manifest.headers.get('content-type')??'',/^application\/manifest\+json/);
  assert.equal(serviceWorker.headers.get('service-worker-allowed'),'/');
  assert.equal(icon.headers.get('content-type'),'image/png');
  assert.ok((await icon.arrayBuffer()).byteLength>1000);
});

test('supports app navigation and rejects missing assets',async()=>{
  const route=await worker.fetch(new Request('https://example.test/menu',{headers:{accept:'text/html'}}));
  const privacy=await worker.fetch(new Request('https://example.test/privacy.html'));
  const missing=await worker.fetch(new Request('https://example.test/missing.js'));
  assert.equal(route.status,200);
  assert.equal(privacy.status,200);
  assert.match(await privacy.text(),/プライバシーポリシー/);
  assert.equal(missing.status,404);
  assert.ok((await stat(new URL('../dist/server/index.js',import.meta.url))).size>10000);
});
