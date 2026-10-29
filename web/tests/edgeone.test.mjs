import test from 'node:test';
import assert from 'node:assert/strict';
import search from '../../edgeone-api/cloud-functions/api/search.js';
import health from '../../edgeone-api/cloud-functions/api/health.js';
test('EdgeOne health route identifies the deployed API',async()=>{const response=await health();assert.equal(response.status,200);assert.equal((await response.json()).service,'unbrainrot-search-api')});
test('EdgeOne rejects missing query, malformed POST requests and untrusted browser origins before contacting Bilibili',async()=>{const missing=await search({request:new Request('https://example.com/api/search')});assert.equal(missing.status,400);const post=await search({request:new Request('https://example.com/api/search?q=philosophy',{method:'POST'})});assert.equal(post.status,400);const denied=await search({request:new Request('https://example.com/api/search?q=philosophy',{headers:{origin:'https://untrusted.example'}})});assert.equal(denied.status,403)});
test('EdgeOne allows the existing GitHub frontend without credential sharing',async()=>{const response=await search({request:new Request('https://example.com/api/search',{headers:{origin:'https://observl.github.io'}})});assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://observl.github.io');assert.equal(response.headers.get('Access-Control-Allow-Credentials'),null)});
