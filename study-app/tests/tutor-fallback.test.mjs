import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tryModelsStreaming} from '../lib/server/tutorStream.ts';
test('pre-stream failure tries next model, recording only the answer attempt',async()=>{
 const requested=[],finished=[];
 const original=globalThis.fetch;
 try {
  globalThis.fetch=async (_url,init)=>{
   const model=JSON.parse(init.body).model; requested.push(model);
   return model==='first' ? new Response('',{status:429}) : new Response('data: {"model":"actual-second","choices":[{"delta":{"content":"A short answer"}}]}\n\ndata: [DONE]\n\n');
  };
  const response=await tryModelsStreaming(['first','second'],{},'test-key',async(...args)=>finished.push(args));
  assert.equal(await response.text(),'A short answer');
  assert.deepEqual(requested,['first','second']);
  assert.equal(finished.length,1); assert.equal(finished[0][0],'completed'); assert.equal(finished[0][1],'actual-second');
 }finally{globalThis.fetch=original;}
});
