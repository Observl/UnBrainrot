import fs from 'node:fs/promises';
const dir='workflows/deepseek-filter';
const rules=(await fs.readFile('web/dist/knowledge.js','utf8')).replace(/export /g,'');
const prompt=(await fs.readFile(dir+'/system-prompt.txt','utf8')).trim();
const prepare=rules+`
function main({payload}) {
 if(typeof payload!=='string'||payload.length>100000)throw Error('Invalid payload size');
 const input=JSON.parse(payload);
 if(input.version!=='1'||!Array.isArray(input.items)||input.items.length>32)throw Error('Invalid workflow input');
 const ids=new Set();for(const item of input.items){if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id)||!['video','article'].includes(item.kind))throw Error('Invalid candidate');ids.add(item.id)}
 const context={query:String(input.context?.query||'').slice(0,100),topic:String(input.context?.topic||'').slice(0,40),discovery:input.context?.discovery===true,minViews:Math.max(10000,Number(input.context?.minViews)||10000)};
 const locked=[],candidates=[];
 for(const item of input.items){const normalized={...item,desc:item.description||item.desc||''};const reason=exclusionReason(normalized,context.minViews);if(reason)locked.push({id:item.id,keep:false,reason:'default_rule',confidence:1});else candidates.push({...item,title:String(item.title||'').slice(0,240),description:String(normalized.desc).slice(0,600),tags:String(item.tags||'').slice(0,200)})}
 const request={model:'deepseek-flash',thinking:{type:'disabled'},stream:false,temperature:0.1,max_tokens:4096,response_format:{type:'json_object'},messages:[{role:'system',content:${JSON.stringify(prompt)}},{role:'user',content:JSON.stringify({context,items:candidates})}]};
 return {request_body:JSON.stringify(request),state:JSON.stringify({ids:[...ids],candidateIds:candidates.map(x=>x.id),locked,batch:input})};
}`;
const finish=`function main({body,state,status_code}){
 if(Number(status_code)!==200)throw Error('DeepSeek request failed');
 const original=JSON.parse(state),response=JSON.parse(body);
 if(response.choices?.[0]?.finish_reason!=='stop')throw Error('Incomplete model response');
 const raw=response.choices?.[0]?.message?.content;if(typeof raw!=='string')throw Error('Missing model result');
 const data=JSON.parse(raw);if(!Array.isArray(data.decisions)||data.decisions.length!==original.candidateIds.length)throw Error('Incomplete decisions');
 const reasons=new Set(['relevant_depth','irrelevant','entertainment','adult_meme','trivia','course_exam','politics_accident','pseudoscience','sensational_opinion','marketing','creator_threshold','insufficient_evidence']);
 const allowed=new Set(original.candidateIds),seen=new Set(),decisions=new Map(original.locked.map(x=>[x.id,x]));
 for(const d of data.decisions){if(!allowed.has(d.id)||seen.has(d.id)||typeof d.keep!=='boolean'||!reasons.has(d.reason)||typeof d.confidence!=='number'||!Number.isFinite(d.confidence)||d.confidence<0||d.confidence>1)throw Error('Invalid model decision');seen.add(d.id);decisions.set(d.id,{id:d.id,keep:d.keep&&d.confidence>=0.75&&d.reason==='relevant_depth',reason:d.reason,confidence:d.confidence})}
 const audit=original.ids.map(id=>decisions.get(id));
 const decisionMap=new Map((original.batch.decisions||[]).map(x=>[x.id,x]));audit.forEach(x=>decisionMap.set(x.id,{...x,stage:'reviewed'}));const kept=new Set(audit.filter(x=>x.keep).map(x=>x.id));const result=original.batch.schema?{...original.batch,stage:'reviewed',items:original.batch.items.filter(x=>kept.has(x.id)),decisions:[...decisionMap.values()]}:{version:'1',decisions:audit.map(({id,keep})=>({id,keep}))};return {result:JSON.stringify(result),audit:JSON.stringify(audit)};
}`;
await fs.writeFile(dir+'/prepare.js',prepare);await fs.writeFile(dir+'/validate.js',finish);
const node=(id,type,title,x,extra={})=>({id,type:'custom',position:{x,y:160},positionAbsolute:{x,y:160},width:260,height:110,sourcePosition:'right',targetPosition:'left',selected:false,data:{type,title,desc:'',selected:false,...extra}});
const vars=(...entries)=>entries.map(([variable,nodeId,field])=>({variable,value_selector:[nodeId,field]}));
const outputs=names=>Object.fromEntries(names.map(n=>[n,{type:'string',children:null}]));
const nodes=[node('1001','start','输入候选内容',40,{variables:[{variable:'payload',label:'候选内容 JSON',type:'paragraph',required:true,max_length:100000,options:[]}]}),node('1002','code','默认规则复核与请求构建',360,{code_language:'javascript',code:prepare,variables:vars(['payload','1001','payload']),outputs:outputs(['request_body','state'])}),node('1003','http-request','DeepSeek V4.1 Flash 筛选',680,{method:'post',url:'https://api.deepseek.com/chat/completions',authorization:{type:'no-auth',config:null},headers:'Content-Type:application/json\nAuthorization:Bearer {{#env.DEEPSEEK_API_KEY#}}',params:'',body:{type:'raw-text',data:[{id:'body',key:'',type:'text',value:'{{#1002.request_body#}}'}]},timeout:{max_connect_timeout:3,max_read_timeout:12,max_write_timeout:3},retry_config:{retry_enabled:false,max_retries:0,retry_interval:100},ssl_verify:true,variables:[]}),node('1004','code','校验 ID 与决定格式',1000,{code_language:'javascript',code:finish,variables:vars(['body','1003','body'],['status_code','1003','status_code'],['state','1002','state']),outputs:outputs(['result','audit'])}),node('1005','end','返回筛选决定',1320,{outputs:[{variable:'result',value_selector:['1004','result']},{variable:'audit',value_selector:['1004','audit']}]})];
const edges=nodes.slice(1).map((n,i)=>({id:nodes[i].id+'-source-'+n.id+'-target',type:'custom',source:nodes[i].id,target:n.id,sourceHandle:'source',targetHandle:'target',data:{sourceType:nodes[i].data.type,targetType:n.data.type,isInIteration:false},zIndex:0}));
const app={app:{description:'默认规则复核 → DeepSeek V4.1 Flash 元数据筛选 → 严格 JSON 校验。需设置 DEEPSEEK_API_KEY；不宣称完整事实核查。',icon:'🧠',icon_background:'#14251A',icon_type:'emoji',mode:'workflow',name:'UnBrainrot Workflow · DeepSeek V4.1 Flash',use_icon_as_answer_icon:false},dependencies:[],kind:'app',version:'0.7.0',workflow:{conversation_variables:[],environment_variables:[{id:'9a185ef6-2a53-46a8-809f-564987804580',name:'DEEPSEEK_API_KEY',description:'在 Dify 环境变量里填写，禁止放入输入或前端',value:'',value_type:'secret'}],features:{file_upload:{enabled:false},retriever_resource:{enabled:false},sensitive_word_avoidance:{enabled:false},text_to_speech:{enabled:false,language:'',voice:''}},graph:{nodes,edges,viewport:{x:20,y:80,zoom:0.7}},rag_pipeline_variables:[]}};
await fs.writeFile(dir+'/app.json',JSON.stringify(app,null,2)+'\n');
let yaml;try{const {stringifyYAML}=await import('../../.cache/edgeone/node_modules/confbox/dist/yaml.mjs');yaml=stringifyYAML(app,{lineWidth:110,noRefs:true})}catch{yaml=JSON.stringify(app,null,2)+'\n'}
await fs.writeFile(dir+'/app.yaml',yaml);
console.log(JSON.stringify({nodes:nodes.length,edges:edges.length,model:'deepseek-flash'}));
