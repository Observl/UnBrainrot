import {searchVideos} from '../lib/bilibili.mjs';
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
 try{return Response.json(await searchVideos(q,page,url.searchParams.get('order')),{headers:{...headers,'Cache-Control':'public, max-age=60'}})}
 catch(error){return Response.json({error:error.message,mode:'error'},{status:503,headers:{...headers,'Cache-Control':'no-store'}})}
}
