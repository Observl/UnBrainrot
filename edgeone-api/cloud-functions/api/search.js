import {applyStaticRules} from '../lib/content-rules.mjs';
import {createContentBatch} from '../lib/content-json.js';
import {newsFeed,newsTopics} from '../lib/news.mjs';
import {verifyCreators} from '../lib/creators.mjs';
import {filterWithWorkflow} from '../lib/workflow.mjs';
import {searchVideos} from '../lib/bilibili.mjs';
import {isKnowledge} from '../lib/knowledge.js';
import {articleFeed} from '../lib/feeds.mjs';
const origins=new Set(['https://observl.github.io','https://unbrainrot-knowledge.griffonage2077.workers.dev']);
export default async function onRequest({request}){
 const url=new URL(request.url),origin=request.headers.get('origin');
 const headers={'Content-Type':'application/json; charset=utf-8','Vary':'Origin',...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, OPTIONS'}});
 if(request.method!=='GET')return Response.json({error:'仅支持 GET 请求'},{status:405,headers});
 if(origin&&!origins.has(origin)&&origin!==url.origin)return Response.json({error:'不允许此来源'},{status:403,headers});
 const q=(url.searchParams.get('q')||'').trim();if(!q||q.length>100)return Response.json({error:'搜索词需要 1–100 字符'},{status:400,headers});
 const page=Math.max(1,Math.min(50,parseInt(url.searchParams.get('page'))||1)),minViews=Math.max(10000,Math.min(100000,Number(url.searchParams.get('minViews'))||10000));
 const source=url.searchParams.get('source')||'all',discovery=url.searchParams.get('discovery')==='1',topic=url.searchParams.get('topic')||'全部',isNews=newsTopics.includes(topic),stage=url.searchParams.get('delivery')||'reviewed';
 if(!['collected','rules','reviewed'].includes(stage))return Response.json({error:'无效交付阶段'},{status:400,headers});
 const tasks=[];
 if(isNews)tasks.push(['新闻',()=>newsFeed(topic,discovery?'':q,page)]);
 if(!isNews&&source!=='articles')tasks.push(['B站',async()=>{const data=await searchVideos(q,page,url.searchParams.get('order'));const raw=data.candidates||data.items;const candidates=raw.filter(x=>Number.isFinite(x.views)&&x.views>=minViews&&isKnowledge(x));const checked=await verifyCreators(candidates,{retainRejected:true});const enriched=new Map(checked.items.map(x=>[x.id,x]));return {...data,items:raw.map(x=>enriched.get(x.id)||x),warnings:checked.unavailable?['部分作者信息无法核实，已排除相关视频']:[]}}]);
 if(!isNews&&source!=='bilibili')tasks.push(['图文',()=>articleFeed(discovery?(topic==='经典名著'?'文学':''):q,page)]);
 const outcomes=await Promise.allSettled(tasks.map(([,fn])=>fn()));let raw=[],hasMore=false,warnings=[],success=0;
 outcomes.forEach((r,i)=>{if(r.status==='rejected'){warnings.push(tasks[i][0]+'：'+r.reason.message);return}success++;hasMore ||=r.value.hasMore;warnings.push(...(r.value.warnings||[]));raw.push(...r.value.items)});
 if(!success)return Response.json({error:warnings.join('；'),mode:'error'},{status:503,headers});
 const context={query:q,page,topic,discovery,minViews};const collected=createContentBatch(raw,context,{page,hasMore});
 const rules=applyStaticRules(collected),decisions=rules.decisions;let batch=stage==='collected'?collected:rules,workflow={status:'disabled',filtered:0};
 if(stage==='reviewed'){const reviewed=await filterWithWorkflow(rules.items,context,{batch:rules});workflow=reviewed.workflow;if(reviewed.warning)warnings.push(reviewed.warning);const ids=new Set(reviewed.items.map(x=>x.id));batch={...rules,stage:'reviewed',items:reviewed.items,decisions:decisions.map(d=>d.keep&&!ids.has(d.id)?{...d,keep:false,reason:'ai_filter',stage:'reviewed'}:d)}}
 const filtered=collected.items.length-batch.items.length;const fileName='unbrainrot-'+stage+'-'+batch.batchId+'.json';
 return Response.json({...batch,workflow,hasMore,page,filtered,warnings,mode:'live',updatedAt:batch.createdAt,minViews},{headers:{...headers,'Cache-Control':process.env.CONTENT_WORKFLOW_URL?'no-store':'public, max-age=60','Content-Disposition':(url.searchParams.get('download')==='1'?'attachment':'inline')+'; filename="'+fileName+'"'}});
}
