/** Optional server-side workflow hook; default rules always run before this hook. */
export async function filterWithWorkflow(items,context,{url=process.env.CONTENT_WORKFLOW_URL,token=process.env.CONTENT_WORKFLOW_TOKEN,fetcher=fetch,kind=process.env.CONTENT_WORKFLOW_KIND||'webhook',timeoutMs=(kind==='dify'?15000:4000)}={}){
 if(!url)return {items,workflow:{status:'disabled',filtered:0}};
 try{
  const endpoint=new URL(url);
  if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.port&&endpoint.port!=='443'||endpoint.hostname==='localhost'||endpoint.hostname.endsWith('.local')||endpoint.hostname.includes(':')||/^\d+(?:\.\d+){3}$/.test(endpoint.hostname))throw Error('Invalid workflow endpoint');
  if(!items.length)return {items,workflow:{status:'applied',filtered:0}};
  if(!['webhook','dify'].includes(kind)||kind==='dify'&&!token)throw Error('Invalid workflow configuration');
  const payload={version:'1',context:{query:context.query,page:context.page,topic:context.topic||'',discovery:context.discovery,minViews:context.minViews},items:items.map(x=>({id:x.id,kind:x.kind,title:x.title,description:x.desc||'',source:x.source,author:x.author,url:x.url,tags:x.tags||'',topic:x.topic,views:x.views??null,duration:x.duration??null,followers:x.followers??null,creatorVerified:x.creatorVerified===true,parts:x.parts||1,isCollection:x.isCollection===true,category:x.category||'',curated:x.curated===true,publishedAt:x.publishedAt||'',news:x.news===true}))};
  const requestBody=kind==='dify'?{inputs:{payload:JSON.stringify(payload)},response_mode:'blocking',user:'unbrainrot-api'}:payload;
  const response=await fetcher(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(requestBody)});
  if(!response.ok)throw Error('Workflow unavailable');
  const body=await response.text();if(body.length>100000)throw Error('Workflow response too large');let data=JSON.parse(body);if(kind==='dify'){if(data.data?.status!=='succeeded'||typeof data.data?.outputs?.result!=='string')throw Error('Invalid Dify result');data=JSON.parse(data.data.outputs.result)}
  if(data.version!=='1'||!Array.isArray(data.decisions)||data.decisions.length!==items.length)throw Error('Invalid workflow response');
  const ids=new Set(items.map(x=>x.id)),decisions=new Map();
  for(const d of data.decisions){if(!ids.has(d.id)||decisions.has(d.id)||typeof d.keep!=='boolean')throw Error('Invalid decision');decisions.set(d.id,d.keep)}
  const kept=items.filter(x=>decisions.get(x.id));return {items:kept,workflow:{status:'applied',filtered:items.length-kept.length}};
 }catch{return {items,workflow:{status:'fallback',filtered:0},warning:'AI 筛选暂不可用，已使用默认规则'}}
}
