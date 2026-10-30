import {API_BASE} from './config.js';
const edge='https://unbrainrot-search-api-public-cliexv0t.edgeone.dev';
const origins=[...new Set([...(location.hostname.endsWith('github.io')?[]:[location.origin]),API_BASE,edge].filter(Boolean))];
let active='',selection=null;
export const activeAPI=()=>active||API_BASE||location.origin;
async function probe(origin){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);try{const r=await fetch(origin+'/api/health',{signal:controller.signal,cache:'no-store'});const data=await r.json();if(!r.ok||!data.ok)throw Error('Unavailable endpoint');return origin}finally{clearTimeout(timer)}}
async function select(){if(active)return active;if(selection)return selection;
 selection=new Promise(resolve=>{let remaining=origins.length,done=false;for(const origin of origins)probe(origin).then(value=>{if(!done){done=true;active=value;resolve(value)}}).catch(()=>{if(!--remaining&&!done)resolve(API_BASE||origins[0])})}).finally(()=>{selection=null});return selection;
}
export async function apiFetch(path,{retryNetwork=false,...options}={}){const origin=await select();if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');try{return await fetch(origin+path,options)}catch(error){active='';if(options.signal?.aborted||options.method==='POST'&&!retryNetwork)throw error;const alternative=origins.find(x=>x!==origin);if(!alternative)throw error;const response=await fetch(alternative+path,options);active=alternative;return response}}
export const coverURL=url=>url?activeAPI()+'/api/cover?url='+encodeURIComponent(url):'./assets/cover-placeholder.svg';
