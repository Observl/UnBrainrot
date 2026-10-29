import {xiaohongshuFeed} from '../lib/xiaohongshu.mjs';
import {parseAIConfig,runConfiguredAI} from '../lib/configured-ai.mjs';
import {unseen} from '../lib/discovery.mjs';
import {reviewContentBatch} from '../lib/review-content.mjs';
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
 const url=new URL(request.url),origin=request.headers.get('origin');let options={},ai=null;
 if(request.method==='POST'){try{if(!request.headers.get('content-type')?.includes('application/json'))throw Error('需要 JSON 请求');const raw=await request.text();if(raw.length>100000)throw Error('请求过大');const body=JSON.parse(raw);if(!body.params||typeof body.params!=='object'||Array.isArray(body.params))throw Error('参数无效');options=body.params;for(const [key,value] of Object.entries(options))if(typeof value==='string'||typeof value==='number')url.searchParams.set(key,String(value));ai=parseAIConfig(body.ai)}catch{return Response.json({error:'AI 配置或请求格式无效，请检查 Dify 基础地址、API Key 和输入输出变量名'},{status:400,headers:{'Access-Control-Allow-Origin':'https://observl.github.io','Cache-Control':'no-store'}})}}
 const headers={'Content-Type':'application/json; charset=utf-8','Vary':'Origin',...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS'}});
 if(!['GET','POST'].includes(request.method))return Response.json({error:'仅支持 GET 请求'},{status:405,headers});
 if(origin&&!origins.has(origin)&&origin!==url.origin)return Response.json({error:'不允许此来源'},{status:403,headers});
 const q=(url.searchParams.get('q')||'').trim();if(!q||q.length>100)return Response.json({error:'搜索词需要 1–100 字符'},{status:400,headers});
 const page=Math.max(1,Math.min(50,parseInt(url.searchParams.get('page'))||1));
 const source=url.searchParams.get('source')||'all',discovery=url.searchParams.get('discovery')==='1',topic=url.searchParams.get('topic')||'全部',isNews=newsTopics.includes(topic),stage=url.searchParams.get('delivery')||'reviewed';
 if(!['collected','rules','reviewed'].includes(stage))return Response.json({error:'无效交付阶段'},{status:400,headers});
 const workflowEnabled=ai?.provider==='static'?false:Boolean(ai||process.env.CONTENT_WORKFLOW_URL);const exclude=discovery&&Array.isArray(options.excludeIds)?options.excludeIds.filter(x=>typeof x==='string'&&x.length<=2048).slice(-240):[];const seed=discovery?(url.searchParams.get('seed')||'').slice(0,100):'';const articlePage=discovery?1:page;if(workflowEnabled&&stage==='rules')return Response.json({error:'workflow 已启用，不使用默认规则；请选择 collected 或 reviewed'},{status:400,headers});
 const tasks=[];
 if(isNews)tasks.push(['新闻',()=>newsFeed(topic,workflowEnabled||discovery?'':q,articlePage,{exclude})]);
 if(!isNews&&['all','bilibili'].includes(source))tasks.push(['B站',async()=>{const data=await searchVideos(q,page,url.searchParams.get('order'));const raw=unseen(data.candidates||data.items,exclude);const candidates=workflowEnabled?raw:raw.filter(isKnowledge);const checked=await verifyCreators(candidates,{retainRejected:true});const enriched=new Map(checked.items.map(x=>[x.id,x]));return {...data,items:raw.map(x=>enriched.get(x.id)||x),warnings:checked.unavailable?['部分作者信息无法核实']:[]}}]);
 if(!isNews&&['all','articles'].includes(source))tasks.push(['图文',()=>articleFeed(workflowEnabled?'':discovery?(topic==='经典名著'?'文学':''):q,articlePage,fetch,{exclude,seed})]);
 if(!isNews&&['all','articles','xiaohongshu'].includes(source))tasks.push(['小红书',()=>xiaohongshuFeed(q,articlePage,{exclude,seed})]);
 const outcomes=await Promise.allSettled(tasks.map(([,fn])=>fn()));let raw=[],hasMore=false,warnings=[],success=0;
 outcomes.forEach((r,i)=>{if(r.status==='rejected'){warnings.push(tasks[i][0]+'：'+r.reason.message);return}success++;hasMore ||=r.value.hasMore;warnings.push(...(r.value.warnings||[]));const limit=source==='all'?({'B站':16,'图文':8,'小红书':8}[tasks[i][0]]||12):32;raw.push(...r.value.items.slice(0,limit))});
 if(!success)return Response.json({error:warnings.join('；'),mode:'error'},{status:503,headers});
 const context={query:q,page,topic,discovery};const collected=createContentBatch(discovery?unseen(raw,exclude):raw,context,{page,hasMore});
 let batch=collected,workflow={status:'disabled',filtered:0};if(stage==='rules')batch=applyStaticRules(collected);if(stage==='reviewed'){batch=await reviewContentBatch(collected,ai?.provider==='static'?{url:''}:ai?{url:ai.endpoint||'https://configured-ai.invalid',reviewer:(items,ctx,opts)=>runConfiguredAI(items,ctx,ai,opts)}:{});workflow=batch.workflow;warnings.push(...batch.warnings)}
 const filtered=collected.items.length-batch.items.length;const fileName='unbrainrot-'+stage+'-'+batch.batchId+'.json';
 return Response.json({...batch,workflow,hasMore,page,filtered,warnings,mode:'live',updatedAt:batch.createdAt},{headers:{...headers,'Cache-Control':request.method==='POST'||workflowEnabled?'no-store':'public, max-age=60','Content-Disposition':(url.searchParams.get('download')==='1'?'attachment':'inline')+'; filename="'+fileName+'"'}});
}
