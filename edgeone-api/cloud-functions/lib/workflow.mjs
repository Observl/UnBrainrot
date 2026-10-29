import {difyRunURL,variableName,workflowError,outputValue,normalizeWorkflowResult} from './dify-contract.mjs';
/** Optional server-side workflow hook; default rules always run before this hook. */
export async function filterWithWorkflow(items,context,{url=process.env.CONTENT_WORKFLOW_URL,token=process.env.CONTENT_WORKFLOW_TOKEN,fetcher=fetch,batch=null,failureMode='default',kind=process.env.CONTENT_WORKFLOW_KIND||'webhook',inputVariable=process.env.CONTENT_WORKFLOW_INPUT_VARIABLE||'payload',outputVariable=process.env.CONTENT_WORKFLOW_OUTPUT_VARIABLE||'result',timeoutMs=(kind==='dify'?45000:4000)}={}){
 if(!url)return {items,workflow:{status:'disabled',filtered:0}};
 try{
  const endpoint=kind==='dify'?difyRunURL(url):new URL(url);inputVariable=variableName(inputVariable,'payload');outputVariable=variableName(outputVariable,'result',{path:true});
  if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.port&&endpoint.port!=='443'||endpoint.hostname==='localhost'||endpoint.hostname.endsWith('.local')||endpoint.hostname.includes(':')||/^\d+(?:\.\d+){3}$/.test(endpoint.hostname))throw Error('Invalid workflow endpoint');
  if(!items.length)return {items,workflow:{status:'applied',filtered:0}};
  if(!['webhook','dify'].includes(kind)||kind==='dify'&&!token)throw Error('Invalid workflow configuration');
  const legacy={version:'1',context:{query:context.query,page:context.page,topic:context.topic||'',discovery:context.discovery,minViews:context.minViews},items:items.map(x=>({id:x.id,kind:x.kind,title:x.title,description:x.desc||'',source:x.source,author:x.author,url:x.url,tags:x.tags||'',topic:x.topic,views:x.views??null,duration:x.duration??null,followers:x.followers??null,creatorVerified:x.creatorVerified===true,parts:x.parts||1,isCollection:x.isCollection===true,category:x.category||'',curated:x.curated===true,publishedAt:x.publishedAt||'',news:x.news===true}))};
  const payload=batch||legacy;
  const requestBody=kind==='dify'?{inputs:{[inputVariable]:JSON.stringify(payload)},response_mode:'blocking',user:'unbrainrot-api'}:payload;
  const response=await fetcher(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(requestBody)});
  if(!response.ok){if(kind==='dify')throw workflowError(response.status===401||response.status===403?'Dify API Key 未通过验证，请使用已发布 Workflow 的应用 Key':response.status===404?'Dify 调用地址不存在，请检查 API 基础地址':response.status===400?'Dify 拒绝输入参数，请检查输入变量名和应用类型':response.status===429?'Dify 请求受限或额度不足，请稍后重试':'Dify 服务暂不可用（HTTP '+response.status+'）');throw Error('Workflow unavailable')}
  const body=await response.text();if(body.length>1000000)throw Error('Workflow response too large');let data=JSON.parse(body);if(kind==='dify'){if(data.data?.status!=='succeeded')throw workflowError('Dify 工作流未成功完成，请查看 Dify 运行记录');data=normalizeWorkflowResult(outputValue(data.data.outputs,outputVariable),items)}
  if(batch&&data.schema&&(data.schema!=='unbrainrot.content-batch'||data.schemaVersion!=='1.0'||data.batchId!==batch.batchId))throw Error('Mismatched content batch');
  if(data.version!=='1'||!Array.isArray(data.decisions))throw Error('Invalid workflow response');
  const ids=new Set(items.map(x=>x.id)),decisions=new Map();
  const previousRejects=new Set((batch?.decisions||[]).filter(d=>!d.keep).map(d=>d.id)),seen=new Set();
  for(const d of data.decisions){if(seen.has(d.id)||typeof d.keep!=='boolean')throw Error('Invalid decision');seen.add(d.id);if(ids.has(d.id))decisions.set(d.id,d.keep);else if(!previousRejects.has(d.id)||d.keep)throw Error('Invalid decision')}
  if(decisions.size!==items.length)throw Error('Missing decision');
  if(data.schema){const expected=items.filter(x=>decisions.get(x.id)).map(x=>x.id);if(!Array.isArray(data.items)||data.items.length!==expected.length||new Set(data.items.map(x=>x.id)).size!==expected.length||data.items.some(x=>!expected.includes(x.id)))throw Error('Mismatched result items')}
  const kept=items.filter(x=>decisions.get(x.id));return {items:kept,decisions:data.decisions,workflow:{status:'applied',filtered:items.length-kept.length}};
 }catch(error){if(failureMode==='closed')return {items:[],workflow:{status:'error',filtered:0},warning:(error.publicMessage|| (error.name==='TimeoutError'?'Dify 等待结果超时，请稍后重试':'Dify 返回格式不符合约定，请检查输出变量及 JSON 内容'))+'；未使用默认规则'};return {items,workflow:{status:'fallback',filtered:0},warning:'AI 筛选暂不可用，已使用默认规则'}}
}
