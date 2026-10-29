import {applyStaticRules} from './content-rules.mjs';
import {filterWithWorkflow} from './workflow.mjs';
export async function reviewContentBatch(collected,{url=process.env.CONTENT_WORKFLOW_URL,reviewer=filterWithWorkflow}={}){
 if(!url){const rules=applyStaticRules(collected);return {...rules,stage:'reviewed',filterEngine:'static',workflow:{status:'disabled',filtered:0},warnings:[]}}
 let reviewed;try{reviewed=await reviewer(collected.items,collected.context,{url,batch:collected,failureMode:'closed'})}catch{reviewed={items:[],workflow:{status:'error',filtered:0}}}
 const failed=reviewed.workflow.status!=='applied',items=failed?[]:reviewed.items,ids=new Set(items.map(x=>x.id));
 return {...collected,stage:'reviewed',filterEngine:'workflow',items,decisions:failed?[]:(reviewed.decisions||collected.items.map(x=>({id:x.id,keep:ids.has(x.id),reason:ids.has(x.id)?'workflow_pass':'workflow_reject',stage:'reviewed'}))),workflow:failed?{status:'error',filtered:0}:reviewed.workflow,warnings:failed?[reviewed.warning||'AI 筛选暂不可用，未使用默认规则，请重试']:[]};
}
