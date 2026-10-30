import {publicFetch} from './public-fetch.mjs';
import {verifiedBackup} from '../data/verified-backup.mjs';
import {reserveData} from '../data/reserve-data.mjs';
import {rotatePool,unseen} from './discovery.mjs';

import {verifyCreators} from './creators.mjs';
import {relevant} from './knowledge.js';
const enriched=new Map(verifiedBackup.map(x=>[x.id,x])),failed=new Map();
const inventory=[...new Map([...reserveData.items,...verifiedBackup].map(x=>[x.id,x])).values()];
// A persisted candidate inventory, never an automatic bypass of content review.
export async function reserveCandidates({exclude=[],seed='',query='',discovery=true,limit=6}={}){
 const ready=rotatePool(unseen(verifiedBackup,exclude).filter(x=>Date.now()-Date.parse(x.creatorCheckedAt)<7*86400000&&(discovery||relevant(x,query))),seed);
 // Complete public metadata is already stored. Still reviewed downstream by rules/workflow.
 if(ready.length)return {items:ready.slice(0,limit),hasMore:ready.length>limit,warnings:[]};
 const candidates=rotatePool(unseen(inventory,exclude).filter(x=>!failed.has(x.id)||failed.get(x.id)<Date.now()),seed).filter(x=>discovery||relevant(x,query)).slice(0,limit);
 const items=[];let cursor=0;
 await Promise.all(Array.from({length:2},async()=>{while(cursor<candidates.length){const row=candidates[cursor++];try{let item=enriched.get(row.id);if(!item){const response=await publicFetch('https://uapis.cn/api/v1/social/bilibili/videoinfo?bvid='+row.bvid,{signal:AbortSignal.timeout(6000),redirect:'error'});if(!response.ok)throw Error('后备元数据暂不可用');const raw=await response.json();if(raw.bvid!==row.bvid||raw.rights?.pay||raw.rights?.ugc_pay||Number(raw.state)!==0)throw Error('后备条目受限');const {normalizeVideo}=await import('./knowledge.js');const info=normalizeVideo(raw);if(info.mid!==row.mid)throw Error('作者不匹配');item={...info,reserve:row.reserve,curated:false,metadataComplete:true};enriched.set(row.id,item)}items.push(item)}catch{failed.set(row.id,Date.now()+300000)}}}));
 const checked=await verifyCreators(items,{retainRejected:true});return {items:checked.items,hasMore:inventory.length>candidates.length,warnings:items.length?[]:['后备目录的元数据暂无法补齐，本批未使用不完整条目']};
}
