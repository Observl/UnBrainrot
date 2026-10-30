export default async function onRequest({request}){
 const url=new URL(request.url),image=url.searchParams.get('url');if(request.method!=='GET'||!image)return new Response(null,{status:400});
 try{const r=await fetch('https://unbrainrot-knowledge.griffonage2077.workers.dev/api/cover?url='+encodeURIComponent(image),{signal:AbortSignal.timeout(12000)});return new Response(r.body,{status:r.status,headers:{'Content-Type':r.headers.get('content-type')||'image/jpeg','Cache-Control':r.ok?'public, max-age=86400':'no-store','X-Content-Type-Options':'nosniff'}})}catch{return new Response(null,{status:503})}
}
