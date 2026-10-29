import {exclusionReason,relevant,classicLiterature} from './knowledge.js';
import {newsTopics,newsEligible} from './news.mjs';
import {parseContentBatch} from './content-json.js';
export function applyStaticRules(document){const batch=parseContentBatch(document),{query='',topic='全部',discovery=true,minViews=10000}=batch.context;
 const decisions=batch.items.map(x=>{const reason=exclusionReason(x,Math.max(10000,Number(minViews)||10000))||(!discovery&&!relevant(x,query)?'搜索不相关':null)||(topic==='经典名著'&&!classicLiterature.test(x.title+' '+x.tags+' '+x.desc)?'非经典文学':null)||(newsTopics.includes(topic)&&!newsEligible(x)?'非事实型财经新闻或已过期':null);return {id:x.id,keep:!reason,reason:reason||'default_pass',stage:'rules'}});
 const ids=new Set(decisions.filter(x=>x.keep).map(x=>x.id)),candidates=batch.items.filter(x=>ids.has(x.id)),videos=candidates.filter(x=>x.kind==='video'),articles=candidates.filter(x=>x.kind==='article'),mixed=[];while(videos.length||articles.length)mixed.push(...videos.splice(0,2),...articles.splice(0,1));return {...batch,stage:'rules',items:mixed,decisions};
}
