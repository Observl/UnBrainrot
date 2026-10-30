// Fixed public metadata/HTML relay; never forwards credentials or arbitrary destinations.
export async function publicFetch(address,options={}){
 const relay=new URL('https://unbrainrot-knowledge.griffonage2077.workers.dev/api/public-source');
 relay.searchParams.set('url',String(address));
 const signal=options.signal||AbortSignal.timeout(10000);for(let attempt=0;attempt<2;attempt++){try{return await fetch(relay,{method:'GET',signal})}catch(error){if(attempt||signal.aborted)throw error;await new Promise(resolve=>setTimeout(resolve,150))}}
}
