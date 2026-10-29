// Import metadata JSON produced by yt-dlp --skip-download --dump-single-json.
// No video downloads, credentials, or model calls. A series must be explicitly approved.
import fs from 'node:fs/promises';
import {normalizeVideo} from '../web/dist/knowledge.js';
const args=Object.fromEntries(process.argv.slice(2).map(x=>{const at=x.indexOf('=');return [x.slice(0,at),x.slice(at+1)]}));
if(!args['--file']||!args['--mid']||!/^\d+$/.test(args['--mid'])||!args['--name'])throw Error('Required: --file=metadata.json --mid=123 --name=Creator [--series=approved-series-name]');
const file='edgeone-api/cloud-functions/data/reserve.json',data=JSON.parse(await fs.readFile(file,'utf8')),input=JSON.parse(await fs.readFile(args['--file'],'utf8'));
const sourceKey=(args['--series']?'series:':'creator:')+args['--mid']+(args['--series']?':'+args['--series']:''),rows=input.entries||input.items||[input],incoming=[];
for(const row of rows){try{const bvid=row.bvid||row.id;if(!/^BV[0-9A-Za-z]{10}$/.test(bvid))continue;if(row.uploader_id&&String(row.uploader_id)!==args['--mid'])continue;const cover=row.pic||row.cover||row.thumbnail||row.thumbnails?.at(-1)?.url;const item=normalizeVideo({...row,bvid,pic:cover,desc:row.description||row.desc||'',owner:{mid:args['--mid'],name:args['--name']}},{curated:true});incoming.push({...item,metadataComplete:Boolean(item.desc),reserve:{sourceKey,type:args['--series']?'series':'creator',approvedSeries:Boolean(args['--series']),name:args['--series']||args['--name'],collectedAt:new Date().toISOString()}})}catch{}}
if(!incoming.length)throw Error('No valid Bilibili video metadata');
data.items=[...new Map([...data.items,...incoming].map(x=>[x.id,x])).values()];data.updatedAt=new Date().toISOString();data.sources=data.sources.filter(x=>x.key!==sourceKey);data.sources.push({key:sourceKey,name:args['--series']||args['--name'],mid:args['--mid'],collected:incoming.length,complete:false,warning:'导入成功不代表完整性已核对；需与源站总数核对'});
await fs.writeFile(file,JSON.stringify(data,null,2)+'\n');await fs.writeFile('edgeone-api/cloud-functions/data/reserve-data.mjs','export const reserveData='+JSON.stringify(data)+';\n');console.log(JSON.stringify({imported:incoming.length,total:data.items.length,complete:false}));
