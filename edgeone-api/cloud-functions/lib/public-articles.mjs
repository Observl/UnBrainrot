import {publicFetch} from './public-fetch.mjs';
import {load} from 'cheerio';
import {text,inferTopic,relevant} from './knowledge.js';
import {unseen,rotatePool} from './discovery.mjs';

// Read public HTML only: no site API, RSS, login, cookies, or wall bypass.
export const publicSites=[
 {id:'quanta',name:'Quanta Magazine',url:'https://www.quantamagazine.org/',paths:/\/[^/]+-\d{8}\/?$/},
 {id:'american-scholar',name:'The American Scholar',url:'https://theamericanscholar.org/',paths:/^\/[^/]+\/?$/,exclude:/^\/(?:web-only|past-issues|podcasts|subscribe|about-us|contact|daily-scholar|privacy-policy|submissions|donate|search)\/?$/i},
 {id:'the-dial',name:'The Dial',url:'https://www.thedial.world/',paths:/^\/articles\/[^/]+\/[^/]+\/?$/},
 {id:'guardian',name:'The Guardian',url:'https://www.theguardian.com/science',paths:/^\/[^/]+\/\d{4}\/[a-z]{3}\/\d{1,2}\/[^/]+\/?$/i},
 {id:'longreads',name:'Longreads',url:'https://longreads.com/',paths:/^\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/?$/},
 {id:'noema',name:'Noema Magazine',url:'https://www.noemamag.com/',paths:/^\/[^/]+\/?$/,exclude:/^\/(?:about|contact|subscribe|newsletter|privacy|terms|category|author|issues?|search|donate)\/?$/i},
 {id:'aeon',name:'Aeon',url:'https://aeon.co/',paths:/^\/(?:essays|ideas)\/[^/]+\/?$/},
 {id:'promarket',name:'ProMarket',url:'https://www.promarket.org/',paths:/^\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/?$/},
 {id:'works-in-progress',name:'Works in Progress',url:'https://worksinprogress.co/',paths:/^\/issue\/[^/]+\/?$/}
];
const headers={'User-Agent':'UnBrainrot/0.7 Public Article Reader','Accept':'text/html, text/plain;q=0.8'};
const pageCache=new Map(),robotCache=new Map(),pending=new Map();
let listingCache,listingPending,expansionPending;
const frontier=new Map(),containerQueue=[],containerQueued=new Set(),containersRead=new Set();
function enqueue(address,site){try{const u=new URL(address,site.url);u.hash='';if(u.protocol!=='https:'||u.hostname!==new URL(site.url).hostname||containerQueued.has(u.href)||containerQueued.size>=300)return;containerQueued.add(u.href);containerQueue.push({url:u.href,site})}catch{}}
function collectLinks(body,site,rules){const $=load(body,{xmlMode:/^\s*<\?xml|<sitemapindex|<urlset/i.test(body)});const addresses=[...$('a[href]').toArray().map(el=>$(el).attr('href')),...$('loc').toArray().map(el=>$(el).text())];for(const value of addresses){try{const u=new URL(value,site.url);u.hash='';if(u.hostname!==new URL(site.url).hostname||u.protocol!=='https:'||!permitted(u.href,rules))continue;if(/\.xml(?:$|\?)/i.test(u.href)||/\/(?:page\/\d+|archive|archives|category|topics|essays|ideas)(?:\/|$)/i.test(u.pathname)||u.searchParams.has('page'))enqueue(u.href,site);if(/\.xml$/i.test(u.pathname)||!site.paths.test(u.pathname)||site.exclude?.test(u.pathname))continue;u.search='';if(frontier.size>=2500)frontier.delete(frontier.keys().next().value);frontier.set(u.href,{id:site.id+':'+u.href,url:u.href,site,provider:site.id})}catch{}}}
for(const site of publicSites){enqueue('sitemap.xml',site);enqueue('sitemap_index.xml',site);enqueue('page/2/',site)}
async function expandFrontier(fetcher){if(expansionPending)return expansionPending;const containers=containerQueue.splice(0,2);expansionPending=Promise.allSettled(containers.map(async entry=>{if(containersRead.has(entry.url))return;containersRead.add(entry.url);const rules=await robots(entry.site,fetcher);if(!permitted(entry.url,rules))return;const {body}=await readHTML(entry.url,entry.site,fetcher);collectLinks(body,entry.site,rules)})).finally(()=>{expansionPending=null});return expansionPending}

async function readHTML(address,site,fetcher,limit=2000000){
 let url=new URL(address);const host=new URL(site.url).hostname;
 for(let redirects=0;redirects<4;redirects++){
  if(url.protocol!=='https:'||url.hostname!==host||url.username||url.password||url.port)throw Error('非允许的公开来源');
  const cachedRules=robotCache.get(url.origin)?.rules;if(url.pathname!=='/robots.txt'&&cachedRules&&!permitted(url.href,cachedRules))throw Error('来源禁止抓取此路径');
  const response=await fetcher(url.href,{headers,redirect:'manual',signal:AbortSignal.timeout(7000)});
  if([301,302,303,307,308].includes(response.status)){url=new URL(response.headers.get('location'),url);continue}
  if(!response.ok)throw Error('公开页面不可读取（'+response.status+'）');
  const type=response.headers.get('content-type')||'';if(!/text\/html|text\/plain|application\/(?:xml|xhtml\+xml)|text\/xml/i.test(type))throw Error('非公开文本页面');
  const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0,body='';
  try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit)throw Error('页面过大');body+=decoder.decode(value,{stream:true})}body+=decoder.decode()}finally{await reader.cancel().catch(()=>{})}
  return {body,url:url.href};
 }
 throw Error('跳转过多');
}
async function robots(site,fetcher){
 const origin=new URL(site.url).origin,hit=robotCache.get(origin);if(hit&&hit.until>Date.now())return hit.rules;
 let body;try{({body}=await readHTML(origin+'/robots.txt',site,fetcher,200000))}catch(error){if(/404/.test(error.message))body='';else throw error}const groups=[];let group=null;
 for(const raw of body.split(/\r?\n/)){const line=raw.replace(/#.*/,'').trim(),match=line.match(/^([\w-]+)\s*:\s*(.*)$/);if(!match)continue;const [,key,value]=match;if(key.toLowerCase()==='user-agent'){if(!group||group.hasDirectives){group={agents:[],rules:[],hasDirectives:false};groups.push(group)}group.agents.push(value.toLowerCase())}else if(group&&['allow','disallow'].includes(key.toLowerCase())){group.hasDirectives=true;if(value)group.rules.push({allow:key.toLowerCase()==='allow',path:value})}}
 const named=groups.filter(g=>g.agents.some(a=>a!=='*'&&'unbrainrot'.includes(a))),rules=(named.length?named:groups.filter(g=>g.agents.includes('*'))).flatMap(g=>g.rules);robotCache.set(origin,{rules,until:Date.now()+3600000});return rules;
}
function permitted(address,rules){const u=new URL(address),path=u.pathname+u.search;let best=null;for(const rule of rules){const pattern=rule.path.replace(/[.+?^{}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*');if(new RegExp('^'+pattern).test(path)&&(!best||rule.path.length>best.path.length||rule.path.length===best.path.length&&rule.allow))best=rule}return !best||best.allow}
function wallDetected($){
 let gated=false;for(const el of $('script[type="application/ld+json"]').toArray()){try{const visit=value=>{if(!value||typeof value!=='object')return;if(value.isAccessibleForFree===false||value.isAccessibleForFree==='False'||value.isAccessibleForFree==='false')gated=true;for(const child of Object.values(value))if(typeof child==='object')Array.isArray(child)?child.forEach(visit):visit(child)};visit(JSON.parse($(el).text()))}catch{}}
 if($('[class*="paywall"], [id*="paywall"], [class*="subscription-wall"], [class*="registration-wall"], [data-paywall]').length)gated=true;
 const copy=$('main,article').text();if(/subscribe to (?:continue|unlock|read (?:the full|this))|sign in to (?:continue|read this)|订阅后(?:阅读|查看)|付费(?:后|解锁)|登录后(?:阅读|查看)/i.test(copy))gated=true;
 return gated;
}
export function parsePublicArticle(html,address,site){
 const $=load(html);if(wallDetected($))throw Error('跳过内容墙页面');
 const title=text($('h1').first().text()||$('meta[property="og:title"]').attr('content'));if(!title)throw Error('缺少文章标题');
 $('script,style,noscript,nav,header,footer,aside,form,button,[hidden],[aria-hidden="true"],[style*="display:none"],[style*="display: none"],.related,.related-posts,.newsletter,.advertisement').remove();
 const choices=['[itemprop="articleBody"]','.article__body','.article-body','.article-content','.entry-content','.post-content','.sqs-html-content','.article-body-commercial-selector','article','main'];let paragraphs=[];
 for(const selector of choices){const root=$(selector).first();if(!root.length)continue;const candidate=root.find('p,h2,h3,blockquote').toArray().map(el=>text($(el).text())).filter(p=>p.length>20);if(candidate.join('\n').length>=800&&candidate.length>=5){paragraphs=candidate;break}}
 if(!paragraphs.length)throw Error('未取得可公开阅读的实质正文');
 const contentText=[...new Set(paragraphs)].join('\n\n').slice(0,24000),desc=contentText.slice(0,1800);
 const canonical=$('link[rel="canonical"]').attr('href');let url=address;try{const u=new URL(canonical||address,address);if(u.protocol==='https:'&&u.hostname===new URL(site.url).hostname){u.search='';u.hash='';url=u.href}}catch{}
 const image=$('meta[property="og:image"]').attr('content')||'',author=text($('meta[name="author"]').attr('content')||$('[rel="author"]').first().text())||site.name;
 return {id:site.id+':'+url,kind:'article',provider:site.id,source:site.name,title,desc,description:desc,contentText,contentAccess:'public-html',url,cover:image.startsWith('https://')?image:'',author,publishedAt:$('meta[property="article:published_time"]').attr('content')||'',tags:'',topic:inferTopic(title+' '+desc),curated:true};
}
async function listings(fetcher){
 if(listingCache&&listingCache.until>Date.now())return listingCache;
 if(!listingPending)listingPending=(async()=>{const responses=await Promise.allSettled(publicSites.map(async site=>{const rules=await robots(site,fetcher);if(!permitted(site.url,rules))throw Error('来源禁止抓取目录');const {body}=await readHTML(site.url,site,fetcher);collectLinks(body,site,rules);const $=load(body),links=new Map();for(const el of $('a[href]').toArray()){try{const u=new URL($(el).attr('href'),site.url);u.hash='';u.search='';if(u.protocol!=='https:'||u.hostname!==new URL(site.url).hostname||!site.paths.test(u.pathname)||site.exclude?.test(u.pathname)||!permitted(u.href,rules))continue;links.set(u.href,{id:site.id+':'+u.href,url:u.href,site,provider:site.id})}catch{}}if(!links.size)throw Error('未发现公开文章链接');return [...links.values()].slice(0,60)}));const links=responses.flatMap(r=>r.status==='fulfilled'?r.value:[]),warnings=responses.flatMap((r,i)=>r.status==='rejected'?[publicSites[i].name+'：'+r.reason.message]:[]);if(!links.length)throw Error(warnings.join('；')||'公开图文来源暂不可用');listingCache={links,warnings,until:Date.now()+300000};return listingCache})().finally(()=>{listingPending=null});
 return listingPending;
}
async function article(link,fetcher){
 const hit=pageCache.get(link.url);if(hit&&hit.until>Date.now())return hit.item;if(pending.has(link.url))return pending.get(link.url);
 const task=(async()=>{try{const {body,url}=await readHTML(link.url,link.site,fetcher);if(!permitted(url,await robots(link.site,fetcher)))throw Error('来源禁止抓取文章');const item=parsePublicArticle(body,url,link.site);collectLinks(body,link.site,await robots(link.site,fetcher));if(pageCache.size>=240)pageCache.delete(pageCache.keys().next().value);pageCache.set(link.url,{item,until:Date.now()+21600000});return item}catch{pageCache.set(link.url,{item:null,until:Date.now()+300000});return null}finally{pending.delete(link.url)}})();pending.set(link.url,task);return task;
}
export async function publicArticleFeed(query,page=1,fetcher=publicFetch,{exclude=[],seed=''}={}){
 const listing=await listings(fetcher);for(const link of listing.links)frontier.set(link.url,link);
 const batchNumber=Number(String(seed).split(':').at(-1))||page;if(batchNumber>1)await expandFrontier(fetcher);
 const pool=rotatePool(unseen([...frontier.values()],exclude).filter(link=>{const hit=pageCache.get(link.url);return !hit||hit.until<Date.now()||hit.item}),seed),candidates=pool.slice((page-1)*6,page*6),items=[];if(seed&&page===1){const reliable=pool.find(x=>x.provider==='quanta');if(reliable&&!candidates.some(x=>x.id===reliable.id))candidates.splice(0,candidates.length,reliable,...candidates.slice(0,5))}let cursor=0;
 await Promise.all(Array.from({length:3},async()=>{while(cursor<candidates.length){const index=cursor++,item=await article(candidates[index],fetcher);if(item&&relevant(item,query))items[index]=item}}));
 return {items:items.filter(Boolean),hasMore:pool.length>page*6||containerQueue.length>0,warnings:[...listing.warnings,...(items.some(Boolean)?[]:['本批没有可展示的新正文，继续查找其他公开页面'])]};
}
