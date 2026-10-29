import {newsFeed,newsTopics} from '../lib/news.mjs';
import {verifyCreators} from '../lib/creators.mjs';
import {filterWithWorkflow} from '../lib/workflow.mjs';
import {searchVideos} from '../lib/bilibili.mjs';
import {articleFeed} from '../lib/feeds.mjs';
import {eligible,relevant,classicLiterature} from '../lib/knowledge.js';
const origins=new Set(['https://observl.github.io','https://unbrainrot-knowledge.griffonage2077.workers.dev']);
export default async function onRequest({request}){
 const url=new URL(request.url),origin=request.headers.get('origin');
 const headers={'Content-Type':'application/json; charset=utf-8','Vary':'Origin',...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, OPTIONS'}});
 if(request.method!=='GET')return Response.json({error:'仅支持 GET 请求'},{status:405,headers});
 if(origin&&!origins.has(origin)&&origin!==url.origin)return Response.json({error:'不允许此来源'},{status:403,headers});
 const q=(url.searchParams.get('q')||'').trim();
 if(!q||q.length>100)return Response.json({error:'搜索词需要 1–100 字符'},{status:400,headers});
 const page=Math.max(1,Math.min(50,parseInt(url.searchParams.get('page'))||1));
 const minViews=Math.max(10000,Math.min(100000,Number(url.searchParams.get('minViews'))||10000));
 const source=url.searchParams.get('source')||'all',discovery=url.searchParams.get('discovery')==='1';
 const newsTopic=newsTopics.includes(url.searchParams.get('topic'));const tasks=[];if(newsTopic)tasks.push(['新闻',()=>newsFeed(url.searchParams.get('topic'),discovery?'':q,page)]);if(!newsTopic&&source!=='articles')tasks.push(['B站',async()=>{const data=await searchVideos(q,page,url.searchParams.get('order'));const candidates=data.items.filter(x=>Number.isFinite(x.views)&&x.views>=minViews);const checked=await verifyCreators(candidates);return {...data,items:checked.items,filtered:data.filtered+data.items.length-candidates.length+checked.filtered,warnings:checked.unavailable?['部分作者信息无法核实，已排除相关视频']:[]}}]);if(!newsTopic&&source!=='bilibili')tasks.push(['图文',()=>articleFeed(discovery?(url.searchParams.get('topic')==='经典名著'?'文学':''):q,page)]);
 const outcomes=await Promise.allSettled(tasks.map(([,fn])=>fn()));let items=[],hasMore=false,warnings=[],success=0,filtered=0;
 outcomes.forEach((r,i)=>{if(r.status==='rejected'){warnings.push(tasks[i][0]+'：'+r.reason.message);return}success++;const data=r.value;hasMore ||=data.hasMore;warnings.push(...(data.warnings||[]));filtered+=data.filtered||0;const valid=data.items.filter(x=>eligible(x,minViews)&&(discovery||relevant(x,q))&&(url.searchParams.get('topic')!=='经典名著'||classicLiterature.test(x.title+' '+x.tags+' '+x.desc)));filtered+=data.items.length-valid.length;items.push(...valid)});
 if(!success)return Response.json({error:warnings.join('；'),mode:'error'},{status:503,headers});
 const videos=items.filter(x=>x.kind!=='article'),articles=items.filter(x=>x.kind==='article');items=[];while(videos.length||articles.length){items.push(...videos.splice(0,2),...articles.splice(0,1))}
 const reviewed=await filterWithWorkflow(items,{query:q,page,discovery,minViews});items=reviewed.items;filtered+=reviewed.workflow.filtered;if(reviewed.warning)warnings.push(reviewed.warning);
 return Response.json({items,workflow:reviewed.workflow,hasMore,page,filtered,warnings,mode:'live',updatedAt:new Date().toISOString(),minViews},{headers:{...headers,'Cache-Control':process.env.CONTENT_WORKFLOW_URL?'no-store':'public, max-age=60'}});
}
