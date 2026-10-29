import {searchVideos} from './web/bilibili.mjs';
const allowedOrigins=new Set(['https://observl.github.io','http://127.0.0.1:4173','http://127.0.0.1:4176']);
export default {async fetch(request,env){const url=new URL(request.url);const origin=request.headers.get('Origin');const cors=allowedOrigins.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'86400'}});
 if(url.pathname==='/api/health')return Response.json({ok:true,service:'unbrainrot-bilibili'},{headers:cors});
 if(url.pathname==='/api/search'){if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405,headers:cors});if(origin&&!allowedOrigins.has(origin)&&origin!==url.origin)return Response.json({error:'Origin not allowed'},{status:403});const q=(url.searchParams.get('q')||'').trim();if(!q||q.length>100)return Response.json({error:'搜索词需要 1–100 字符'},{status:400,headers:cors});const page=Math.max(1,Math.min(10,parseInt(url.searchParams.get('page'))||1));try{return Response.json(await searchVideos(q,page),{headers:{...cors,'Cache-Control':'public, max-age=60'}})}catch(e){return Response.json({error:e.message},{status:503,headers:{...cors,'Cache-Control':'no-store'}})}}
 if(url.pathname.startsWith('/api/'))return Response.json({error:'Not found'},{status:404,headers:cors});
 return env.ASSETS.fetch(request);
}};
