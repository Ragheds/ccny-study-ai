import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const root='.next/static/chunks';
const chunks=readdirSync(root,{recursive:true}).filter(name=>name.endsWith('.js')).map(name=>({name,gzip:gzipSync(readFileSync(`${root}/${name}`)).length})).sort((a,b)=>b.gzip-a.gzip);
const total=chunks.reduce((sum,chunk)=>sum+chunk.gzip,0), largest=chunks[0]?.gzip ?? 0;
const report={totalJavaScriptGzipKiB:Math.round(total/1024),largestChunkGzipKiB:Math.round(largest/1024),budgets:{totalKiB:900,chunkKiB:120},largestChunks:chunks.slice(0,5).map(chunk=>({name:chunk.name,gzipKiB:Math.round(chunk.gzip/1024)}))};
console.log(JSON.stringify(report,null,2));
// All lazy chunks together: a regression gate, not a per-page network measurement.
if(total>900*1024 || largest>120*1024)process.exitCode=1;
