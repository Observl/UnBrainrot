import {videoDimensions} from '../lib/bilibili.mjs';
import {videoMedia} from '../lib/content-json.js';
export default async function onRequest({request}){const u=new URL(request.url),origin=request.headers.get('origin');const headers={'Access-Control-Allow-Origin':'https://observl.github.io','Vary':'Origin','Cache-Control':'public, max-age=300'};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, OPTIONS'}});
 if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405,headers});
 if(origin&&!['https://observl.github.io','https://unbrainrot-knowledge.griffonage2077.workers.dev',u.origin].includes(origin))return Response.json({error:'Origin not allowed'},{status:403});
 const bvid=u.searchParams.get('bvid')||'';if(!/^BV[0-9A-Za-z]{10}$/.test(bvid))return Response.json({error:'无效视频 ID'},{status:400,headers});
 try{const dimension=await videoDimensions(bvid);return Response.json({schema:'unbrainrot.video-metadata',schemaVersion:'1.0',bvid,media:videoMedia({dimension})},{headers})}catch{return Response.json({error:'视频尺寸暂不可用'},{status:503,headers:{...headers,'Cache-Control':'no-store'}})}}
