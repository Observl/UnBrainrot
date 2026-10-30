import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await fs.cp('../web/dist','public',{recursive:true});
await fs.writeFile('public/config.js',"export const API_BASE = '';\n");
const check=spawnSync(process.execPath,['--check','cloud-functions/api/search.js'],{stdio:'inherit'});if(check.status!==0)process.exit(check.status||1);
console.log('Built same-origin website and API assets');
