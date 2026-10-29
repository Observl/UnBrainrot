import {AI_POLICY} from './ai-policy.mjs';
import {filterWithWorkflow} from './workflow.mjs';
const endpoints={deepseek:'https://api.deepseek.com/chat/completions',siliconflow:'https://api.siliconflow.cn/v1/chat/completions'};
export function parseAIConfig(input){if(!input||input.provider==='server')return null;if(input.provider==='static')return {provider:'static'};
 if(!['dify','deepseek','siliconflow'].includes(input.provider))throw Error('不支持的 AI 提供商');
 if(typeof input.key!=='string'||!input.key.trim()||input.key.length>4096||/[\r\n]/.test(input.key))throw Error('请填写有效 API Key');
 const config={provider:input.provider,key:input.key.trim()};
 if(input.provider==='dify'){const u=new URL(input.endpoint||'https://api.dify.ai/v1/workflows/run');const allowed=['api.dify.ai',...(process.env.AI_WORKFLOW_ALLOWED_HOSTS||'').split(',').map(x=>x.trim()).filter(Boolean)];if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port&&u.port!=='443'||!allowed.includes(u.hostname)||u.pathname!=='/v1/workflows/run')throw Error('Dify 地址须为 Cloud API；自建域名需由服务端允许');config.endpoint=u.href}else{config.model=input.model||(input.provider==='deepseek'?'deepseek-flash':'deepseek-ai/DeepSeek-V4.1-Flash');if(!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(config.model))throw Error('模型 ID 格式不正确')}
 return config;
}
function decisions(text,items,threshold){const data=JSON.parse(text),ids=new Set(items.map(x=>x.id)),seen=new Set();if(!Array.isArray(data.decisions)||data.decisions.length!==ids.size)throw Error('Incomplete decisions');return data.decisions.map(d=>{if(!ids.has(d.id)||seen.has(d.id)||typeof d.keep!=='boolean'||typeof d.confidence!=='number'||!Number.isFinite(d.confidence)||d.confidence<0||d.confidence>1||typeof d.reason!=='string'||d.reason.length>120)throw Error('Invalid decision');seen.add(d.id);return {...d,keep:d.keep&&d.confidence>=threshold}})}
export async function runConfiguredAI(items,context,config,{batch,fetcher=fetch}={}){
 if(!items.length)return {items:[],decisions:[],workflow:{status:'applied',filtered:0}};
 if(config.provider==='dify')return filterWithWorkflow(items,context,{batch,url:config.endpoint,token:config.key,kind:'dify',failureMode:'closed',fetcher});
 const signal=AbortSignal.timeout(25000);
 async function call(stage,candidates){const title=stage==='title';const payload={context,items:candidates.map(x=>title?{id:x.id,kind:x.kind,title:x.title}:{...x,description:String(x.description||x.desc||'').slice(0,1500)})};const instructions=title?'本轮只看标题。不要依据未提供的简介、作者或粉丝信息删除内容；可能合格但须简介确认的候选可保留至下一轮。':'本轮结合简介和已有作者元数据筛选。只处理标题通过项；简介缺失或证据不足时删除。';
 const response=await fetcher(endpoints[config.provider],{method:'POST',redirect:'error',signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.key},body:JSON.stringify({model:config.model,messages:[{role:'system',content:AI_POLICY+'\n'+instructions},{role:'user',content:JSON.stringify(payload)}],temperature:0.1,max_tokens:4096,response_format:{type:'json_object'},stream:false,...(config.provider==='deepseek'?{thinking:{type:'disabled'}}:{enable_thinking:false})})});
 if(!response.ok)throw Error('AI service unavailable');const raw=await response.text();if(raw.length>200000)throw Error('Oversized AI response');const result=JSON.parse(raw);if(result.choices?.[0]?.finish_reason!=='stop'||typeof result.choices?.[0]?.message?.content!=='string')throw Error('Invalid AI response');return decisions(result.choices[0].message.content,candidates,title?0.65:0.75).map(d=>({...d,stage:'reviewed',screeningStage:stage}));
 }
 const first=await call('title',items),pass=new Set(first.filter(x=>x.keep).map(x=>x.id)),candidates=items.filter(x=>pass.has(x.id)),result=new Map(first.map(x=>[x.id,x]));if(candidates.length)for(const d of await call('description',candidates))result.set(d.id,d);const audit=items.map(x=>result.get(x.id)),keep=new Set(audit.filter(x=>x.keep).map(x=>x.id)),kept=items.filter(x=>keep.has(x.id));return {items:kept,decisions:audit,workflow:{status:'applied',filtered:items.length-kept.length}};
}
