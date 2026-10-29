import {verifiedBackup} from '../data/verified-backup.mjs';
import {creatorProfiles} from '../data/creator-profiles.mjs';
import {publicFetch} from './public-fetch.mjs';
const cache=new Map(),pending=new Map();
export function createCreatorVerifier(fetcher=publicFetch){
 async function creator(mid){
  mid=String(mid);if(!/^\d{1,20}$/.test(mid))return null;const hit=cache.get(mid);if(hit&&hit.until>Date.now())return hit.data;if(pending.has(mid))return pending.get(mid);
  const profile=creatorProfiles.find(x=>x.mid===mid&&Date.now()-Date.parse(x.checkedAt)<3600000);
  if(profile)return {followers:profile.followers,creatorVerified:false,creatorCheckedAt:profile.checkedAt,creatorProofSource:'cached-profile'};
  const task=(async()=>{try{let data=null;
   for(const route of ['https://uapis.cn/api/v1/social/bilibili/userinfo?uid='+mid,'https://api.bilibili.com/x/web-interface/card?mid='+mid]){try{
    const r=await fetcher(route,{signal:AbortSignal.timeout(4000)});if(!r.ok)continue;const j=await r.json(),card=j.data?.card||j;if(String(card.mid)!==mid)continue;const fans=card.follower??card.fans;if(fans===null||fans===undefined||!Number.isFinite(Number(fans))||Number(fans)<0)continue;const type=card.official_verify?.type;
    data={followers:Number(fans),creatorVerified:Number.isInteger(type)&&type>=0,creatorVerification:card.official_verify?.desc||'',creatorCheckedAt:new Date().toISOString(),creatorProofSource:route.includes('uapis.cn')?'public-profile':'bilibili-card'};break;
   }catch{}}
   if(!data){const proof=verifiedBackup.find(x=>String(x.mid)===mid&&Date.now()-Date.parse(x.creatorCheckedAt)<7*86400000);if(proof)data={followers:proof.followers,creatorVerified:proof.creatorVerified,creatorVerification:proof.creatorVerification,creatorCheckedAt:proof.creatorCheckedAt,creatorProofSource:'cached-proof'}}
   if(cache.size>2000)cache.clear();cache.set(mid,{data,until:data?.creatorProofSource==='cached-proof'?Math.min(Date.now()+3600000,Date.parse(data.creatorCheckedAt)+7*86400000):Date.now()+(data?3600000:60000)});return data;
  }finally{pending.delete(mid)}})();pending.set(mid,task);return task;
 }
 return async function verify(items,{retainRejected=false}={}){const output=new Array(items.length);let cursor=0,unavailable=0;await Promise.all(Array.from({length:Math.min(3,items.length)},async()=>{while(cursor<items.length){const i=cursor++,item=items[i];if(item.kind==='article'){output[i]=item;continue}const data=await creator(item.mid);if(!data){unavailable++;if(retainRejected)output[i]={...item,followers:null,creatorVerified:false,creatorStatus:'unavailable'};continue}if(retainRejected||data.followers>10000)output[i]={...item,...data,creatorStatus:data.creatorProofSource}}}));return {items:output.filter(Boolean),unavailable,filtered:items.length-output.filter(Boolean).length}}
}
export const verifyCreators=createCreatorVerifier();
