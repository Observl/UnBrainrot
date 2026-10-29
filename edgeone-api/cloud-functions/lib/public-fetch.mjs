// Fixed public metadata/HTML relay; never forwards credentials or arbitrary destinations.
export function publicFetch(address,options={}){
 const relay=new URL('https://unbrainrot-knowledge.griffonage2077.workers.dev/api/public-source');
 relay.searchParams.set('url',String(address));
 return fetch(relay,{method:'GET',signal:options.signal||AbortSignal.timeout(10000)});
}
