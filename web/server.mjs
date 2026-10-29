import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js'};
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8'};
const server=http.createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname;const file=files[path];if(!file){res.writeHead(404);res.end('Not found');return}try{const data=await readFile(fileURLToPath(new URL(`./dist/${file}`,import.meta.url)));res.writeHead(200,{'Content-Type':types[file.split('.').pop()],'X-Content-Type-Options':'nosniff'});res.end(data)}catch{res.writeHead(500);res.end('Unable to load page')}});
server.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
