import {load} from 'cheerio';
import {publicFetch} from './public-fetch.mjs';
import {text,inferTopic,relevant} from './knowledge.js';
import {rotatePool,unseen} from './discovery.mjs';
export const youtubeChannels=[{id:'UCYO_jab_esuFRV4b17AJtAw',name:'3Blue1Brown'}];
let cache,pending;
export function parseChannelProfile(html,channel){
 const match=html.match(/(?:var\s+)?ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);if(!match)throw Error('YouTube未提供公开频道资料');
 const data=JSON.parse(match[1]),meta=data.metadata?.channelMetadataRenderer;if(meta?.externalId!==channel.id||channel.name&&meta.title.toLowerCase()!==channel.name.toLowerCase())throw Error('YouTube频道身份不匹配');
 const counts=[...JSON.stringify(data.header||{}).matchAll(/(\d+(?:[.,]\d+)?)\s*(K|M|B|thousand|million|billion)?\s*subscribers/gi)].map(m=>Number(m[1].replace(',','.'))*({k:1e3,m:1e6,b:1e9,thousand:1e3,million:1e6,billion:1e9}[m[2]?.toLowerCase()]||1));
 const followers=Math.max(0,...counts);if(followers<=10000)throw Error('YouTube订阅数不足或无法核实');return {followers,creatorName:meta.title,creatorCheckedAt:new Date().toISOString(),creatorProofSource:'youtube-public-profile'};
}
const searchCache=new Map(),profileCache=new Map(),searchPending=new Map();
export function parseYoutubeSearch(html){
 const match=html.match(/(?:var\s+)?ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);if(!match)throw Error('YouTube未提供公开搜索结果');
 const data=JSON.parse(match[1]),rows=data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.flatMap(x=>x.itemSectionRenderer?.contents||[])||[];
 const label=x=>text(x?.simpleText||x?.runs?.map(r=>r.text).join('')||'');
 return rows.flatMap(row=>{const v=row.videoRenderer;if(!v||!/^[\w-]{11}$/.test(v.videoId)||v.upcomingEventData||/members only|premium/i.test(JSON.stringify(v.badges||[])))return [];const owner=(v.ownerText||v.longBylineText)?.runs?.find(x=>x.navigationEndpoint?.browseEndpoint?.browseId),channelId=owner?.navigationEndpoint?.browseEndpoint?.browseId;if(!/^UC[\w-]{22}$/.test(channelId||''))return [];
 const desc=label(v.detailedMetadataSnippets?.[0]?.snippetText||v.descriptionSnippet);return [{id:'youtube:'+v.videoId,youtubeId:v.videoId,channelId,author:owner.text,kind:'video',provider:'youtube',source:'YouTube',title:label(v.title),desc,cover:'https://i.ytimg.com/vi/'+v.videoId+'/hqdefault.jpg',url:'https://www.youtube.com/watch?v='+v.videoId,publishedAt:'',publishedLabel:label(v.publishedTimeText),duration:v.lengthText?label(v.lengthText).split(':').reduce((n,x)=>n*60+(Number(x)||0),0):null,parts:1,isCollection:false,curated:false,creatorVerified:false}];
 });
}
export async function youtubeSearch(query,{exclude=[],language='all',page=1}={}){
 if(page>1)return {items:[],hasMore:false,warnings:['YouTube公开网页搜索只提供首屏结果；更换关键词可继续搜索']};
 const key=query+':'+language,hit=searchCache.get(key);if(hit&&hit.until>Date.now())return {...hit.data,items:unseen(hit.data.items,exclude)};
 if(searchPending.has(key)){const data=await searchPending.get(key);return {...data,items:unseen(data.items,exclude)}}
 const task=(async()=>{const target=new URL('https://www.youtube.com/results');target.search=new URLSearchParams({search_query:query,hl:language==='zh'?'zh-CN':'en'});const response=await publicFetch(target.href,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('YouTube全站搜索暂不可读取');const rows=parseYoutubeSearch(await response.text()).slice(0,8),items=[];let cursor=0;
 await Promise.all(Array.from({length:2},async()=>{while(cursor<rows.length){const row=rows[cursor++];try{let profile=profileCache.get(row.channelId);if(!profile||profile.until<Date.now()){const r=await publicFetch('https://www.youtube.com/channel/'+row.channelId+'/about',{signal:AbortSignal.timeout(7000)});if(!r.ok)continue;profile={data:parseChannelProfile(await r.text(),{id:row.channelId}),until:Date.now()+3600000};profileCache.set(row.channelId,profile)}items.push({...row,...profile.data,author:profile.data.creatorName||row.author,reserve:row.channelId===youtubeChannels[0].id?{approvedSeries:true,type:'series',name:'3Blue1Brown 数学可视化'}:undefined})}catch{}}}));
 const data={items,hasMore:false,warnings:items.length?[]:['YouTube本次没有取得订阅数可核实且超过1万的搜索结果'],searchMode:'public-web'};searchCache.set(key,{data,until:Date.now()+180000});if(searchCache.size>100)searchCache.delete(searchCache.keys().next().value);return data;
 })().finally(()=>searchPending.delete(key));searchPending.set(key,task);const data=await task;return {...data,items:unseen(data.items,exclude)};
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
