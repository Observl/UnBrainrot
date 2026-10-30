import {creatorProfiles} from '../edgeone-api/cloud-functions/data/creator-profiles.mjs';
import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {reserveData} from '../edgeone-api/cloud-functions/data/reserve-data.mjs';
import {verifiedBackup} from '../edgeone-api/cloud-functions/data/verified-backup.mjs';
import {normalizeVideo,exclusionReason} from '../edgeone-api/cloud-functions/lib/knowledge.js';
const run=promisify(execFile),dir='edgeone-api/cloud-functions/data',target=500;
await fs.mkdir('.cache/backup-metadata',{recursive:true});
async function json(url){const {stdout}=await run('curl.exe',['--fail-with-body','--silent','--show-error','--max-time','12',url],{maxBuffer:3000000});return JSON.parse(stdout)}
const profiles=new Map();
for(const source of reserveData.sources){try{const body=await json('https://api.bilibili.com/x/web-interface/card?mid='+source.mid);const p={mid:body.data?.card?.mid,follower:body.data?.card?.fans};if(String(p.mid)!==String(source.mid)||!(p.follower>10000))throw Error('Invalid creator');profiles.set(String(p.mid),{followers:p.follower,creatorCheckedAt:new Date().toISOString(),creatorVerified:false,creatorProofSource:'public-profile',creatorStatus:'cached-proof'});}catch{const proof=creatorProfiles.find(x=>x.mid===String(source.mid)&&x.followers>10000&&Date.now()-Date.parse(x.checkedAt)<7*86400000);if(proof)profiles.set(proof.mid,{followers:proof.followers,creatorCheckedAt:proof.checkedAt,creatorVerified:false,creatorProofSource:'cached-profile',creatorStatus:'cached-proof'});else console.log(JSON.stringify({profileUnavailable:source.name}));}}
const items=new Map(verifiedBackup.filter(x=>!exclusionReason(x)&&Date.now()-Date.parse(x.creatorCheckedAt)<7*86400000).map(x=>[x.id,x]));
const byCreator=new Map();for(const row of reserveData.items){if(!byCreator.has(row.mid))byCreator.set(row.mid,[]);byCreator.get(row.mid).push(row)}
const queue=[];while([...byCreator.values()].some(x=>x.length))for(const rows of byCreator.values())if(rows.length)queue.push(rows.shift());
let cursor=0,attempted=0,unavailable=0;const reasons={};
await Promise.all(Array.from({length:2},async()=>{while(cursor<queue.length&&items.size<target){const row=queue[cursor++];if(items.has(row.id)||!profiles.has(row.mid))continue;try{const path='.cache/backup-metadata/'+row.id+'.json';let raw;try{raw=JSON.parse(await fs.readFile(path,'utf8'))}catch{const data=await json('https://api.bilibili.com/x/web-interface/view?bvid='+row.bvid);if(data.code!==0)throw Error('Source rejected metadata');raw=data.data;await fs.writeFile(path,JSON.stringify(raw))}
 if(raw.bvid!==row.bvid||String(raw.owner?.mid)!==String(row.mid)||raw.state!==0||raw.rights?.pay||raw.rights?.ugc_pay||raw.is_upower_exclusive||raw.is_upower_preview||raw.is_upower_play||raw.is_chargeable_season||Number(raw.copyright)!==1)throw Error('Unavailable, paid or non-original');
 const info=normalizeVideo(raw),item={...info,...profiles.get(row.mid),reserve:row.reserve,curated:false,metadataComplete:true,contentOrigin:'verified-backup',metadataCheckedAt:new Date().toISOString()};
 const reason=exclusionReason(item);if(reason)reasons[reason]=(reasons[reason]||0)+1;else if(items.size<target)items.set(item.id,item);
 }catch{unavailable++}attempted++;if(attempted%40===0)console.log(JSON.stringify({attempted,accepted:items.size,unavailable}));await new Promise(r=>setTimeout(r,450));}}));
const rows=[...items.values()].slice(0,target),imports=[];await fs.mkdir(dir+'/verified-backup-parts',{recursive:true});
for(let i=0;i<rows.length;i+=50){const name='part-'+String(i/50).padStart(3,'0')+'.mjs';await fs.writeFile(dir+'/verified-backup-parts/'+name,'export default '+JSON.stringify(rows.slice(i,i+50))+';\n');imports.push('import p'+i+' from "./verified-backup-parts/'+name+'";')}
await fs.writeFile(dir+'/verified-backup.mjs',imports.join('\n')+'\nexport const verifiedBackup=['+rows.map((_,i)=>i%50===0?'...p'+i:null).filter(Boolean).join(',')+'];\n');
const report={updatedAt:new Date().toISOString(),target,accepted:rows.length,uniqueIds:new Set(rows.map(x=>x.id)).size,attempted,unavailable,reasons,review:'current-static-rules-metadata-only',creators:[...new Set(rows.map(x=>x.author))]};
await fs.writeFile(dir+'/backup-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
if(rows.length<target)process.exitCode=2;
