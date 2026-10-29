import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {normalizeVideo} from '../dist/knowledge.js';
import {searchVideos} from '../bilibili.mjs';
const seeds=JSON.parse(await readFile(new URL('./seeds.json',import.meta.url),'utf8'));
const destination=new URL('../dist/data/bilibili.json',import.meta.url);
let previous={items:[]};try{previous=JSON.parse(await readFile(destination,'utf8'))}catch{}
const items=[],errors=[];
for(const seed of seeds){try{const response=await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${seed.bvid}`,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error(`HTTP ${response.status}`);const result=await response.json();if(result.code!==0)throw Error(`code ${result.code}`);items.push({...normalizeVideo(result.data,{...seed,curated:true}),fetchedAt:new Date().toISOString()});}catch(e){errors.push(`${seed.bvid}: ${e.message}`);const old=previous.items.find(x=>x.bvid===seed.bvid);if(old)items.push(old);}await new Promise(resolve=>setTimeout(resolve,700));}
for(const item of previous.items){if(!items.some(x=>x.id===item.id))items.push(item)}
for(const query of ['神经网络 科普','线性代数 教程','物理 科普','历史 公开课','哲学 入门','计算机 网络']){try{const result=await searchVideos(query);for(const item of result.items){if(!items.some(x=>x.id===item.id))items.push({...item,fetchedAt:new Date().toISOString()})}}catch(e){errors.push(`Search ${query}: ${e.message}`)}await new Promise(resolve=>setTimeout(resolve,700));}
if(!items.length)throw Error('No real Bilibili metadata available; refusing to publish an empty or fabricated index');
await mkdir(new URL('../dist/data/',import.meta.url),{recursive:true});
await writeFile(destination,JSON.stringify({updatedAt:new Date().toISOString(),mode:'index',errors,items},null,2));
console.log(`Indexed ${items.length} real videos; ${errors.length} upstream errors`);
if(errors.length)console.warn(errors.join('\n'));
