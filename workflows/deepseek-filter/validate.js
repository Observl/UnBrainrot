function main({body,state,status_code}){
 if(Number(status_code)!==200)throw Error('DeepSeek request failed');
 const original=JSON.parse(state),response=JSON.parse(body);
 if(response.choices?.[0]?.finish_reason!=='stop')throw Error('Incomplete model response');
 const raw=response.choices?.[0]?.message?.content;if(typeof raw!=='string')throw Error('Missing model result');
 const data=JSON.parse(raw);if(!Array.isArray(data.decisions)||data.decisions.length!==original.candidateIds.length)throw Error('Incomplete decisions');
 const reasons=new Set(['relevant_depth','irrelevant','entertainment','adult_meme','trivia','course_exam','politics_accident','pseudoscience','sensational_opinion','marketing','creator_threshold','insufficient_evidence']);
 const allowed=new Set(original.candidateIds),seen=new Set(),decisions=new Map(original.locked.map(x=>[x.id,x]));
 for(const d of data.decisions){if(!allowed.has(d.id)||seen.has(d.id)||typeof d.keep!=='boolean'||!reasons.has(d.reason)||typeof d.confidence!=='number'||!Number.isFinite(d.confidence)||d.confidence<0||d.confidence>1)throw Error('Invalid model decision');seen.add(d.id);decisions.set(d.id,{id:d.id,keep:d.keep&&d.confidence>=0.75&&d.reason==='relevant_depth',reason:d.reason,confidence:d.confidence})}
 const audit=original.ids.map(id=>decisions.get(id));
 return {result:JSON.stringify({version:'1',decisions:audit.map(({id,keep})=>({id,keep}))}),audit:JSON.stringify(audit)};
}