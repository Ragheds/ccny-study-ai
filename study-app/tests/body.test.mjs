import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boundedBody, boundedJSON, BodyError} from '../lib/server/body.ts';
test('rejects unannounced oversized streamed uploads and cancels input', async()=>{
 let cancelled=false;
 const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(8));c.enqueue(new Uint8Array(8));},cancel(){cancelled=true;}});
 const request=new Request('http://localhost/upload',{method:'POST',body,duplex:'half'});
 await assert.rejects(boundedBody(request,10),BodyError);
 assert.equal(cancelled,true);
});
test('accepts a small JSON body and rejects oversized declared length',async()=>{
 assert.deepEqual(await boundedJSON(new Request('http://localhost',{method:'POST',body:'{"ok":true}'})),{ok:true});
 await assert.rejects(boundedBody(new Request('http://localhost',{method:'POST',headers:{'content-length':'500'},body:'x'}),10),BodyError);
});
