import {load} from 'cheerio';
import {publicFetch} from './public-fetch.mjs';
import {text,inferTopic,relevant} from './knowledge.js';
import {rotatePool,unseen} from './discovery.mjs';
export const youtubeChannels=[{id:'UCYO_jab_esuFRV4b17AJtAw',name:'3Blue1Brown'}];
let cache,pending;
export function parseChannelProfile(html,channel){
 const match=html.match(/(?:var\s+)?ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);if(!match)throw Error('YouTube未提供公开频道资料');
 const data=JSON.parse(match[1]),meta=data.metadata?.channelMetadataRenderer;if(meta?.externalId!==channel.id||meta.title.toLowerCase()!==channel.name.toLowerCase())throw Error('YouTube频道身份不匹配');
 const counts=[...JSON.stringify(data.header||{}).matchAll(/(\d+(?:[.,]\d+)?)\s*(K|M|B|thousand|million|billion)?\s*subscribers/gi)].map(m=>Number(m[1].replace(',','.'))*({k:1e3,m:1e6,b:1e9,thousand:1e3,million:1e6,billion:1e9}[m[2]?.toLowerCase()]||1));
 const followers=Math.max(0,...counts);if(followers<=10000)throw Error('YouTube订阅数不足或无法核实');return {followers,creatorCheckedAt:new Date().toISOString(),creatorProofSource:'youtube-public-profile'};
}
export function parseYoutubeFeed(xml,channel,profile){
 const dom=load(xml,{xmlMode:true}),tag=(node,name)=>node.find('*').filter((_,el)=>el.name===name).first().text();
 const feedId=tag(dom('feed'),'yt:channelId');if(![channel.id,channel.id.slice(2)].includes(feedId)||dom('feed > author > uri').text()!=='https://www.youtube.com/channel/'+channel.id)throw Error('YouTube订阅源身份不匹配');
 return dom('entry').toArray().flatMap(el=>{const entry=dom(el);if(tag(entry,'yt:channelId')!==channel.id)return [];const videoId=tag(entry,'yt:videoId'),title=text(entry.find('title').first().text()),desc=text(tag(entry,'media:description')).slice(0,1800);if(!/^[\w-]{11}$/.test(videoId)||!title||!desc)return [];
 return [{id:'youtube:'+videoId,youtubeId:videoId,isShort:entry.find('link').attr('href')?.includes('/shorts/')===true,kind:'video',provider:'youtube',source:'YouTube',author:channel.name,title,desc,cover:'https://i.ytimg.com/vi/'+videoId+'/hqdefault.jpg',url:'https://www.youtube.com/watch?v='+videoId,publishedAt:entry.find('published').text(),topic:inferTopic(title+' '+desc),tags:'',duration:null,parts:1,isCollection:false,curated:false,creatorVerified:false,...profile,reserve:{sourceKey:'youtube:'+channel.id,type:'series',name:'3Blue1Brown 数学可视化',approvedSeries:true}}]});
}
export async function youtubeFeed(query='',{exclude=[],seed=''}={}){
 if(!cache||cache.until<Date.now()){if(!pending)pending=(async()=>{const outcomes=await Promise.allSettled(youtubeChannels.map(async channel=>{const [profileResponse,feedResponse]=await Promise.all([publicFetch('https://www.youtube.com/channel/'+channel.id+'/about',{signal:AbortSignal.timeout(12000)}),publicFetch('https://www.youtube.com/feeds/videos.xml?channel_id='+channel.id,{signal:AbortSignal.timeout(12000)})]);if(!profileResponse.ok||!feedResponse.ok)throw Error('YouTube公开资料暂不可读取');return parseYoutubeFeed(await feedResponse.text(),channel,parseChannelProfile(await profileResponse.text(),channel))}));const items=outcomes.flatMap(r=>r.status==='fulfilled'?r.value:[]);if(!items.length)throw Error('YouTube未取得可验证的公开视频');cache={items,until:Date.now()+300000,warnings:outcomes.flatMap((r,i)=>r.status==='rejected'?[youtubeChannels[i].name+'：'+r.reason.message]:[])}})().finally(()=>{pending=null});await pending}
 const items=rotatePool(unseen(cache.items,exclude).filter(x=>relevant(x,query)),seed);return {items:items.slice(0,12),hasMore:items.length>12,warnings:cache.warnings};
}
