import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||4177);
const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  // 仅预览交付文件；不通过 HTTP 暴露源码、原型及开发文档。
  if(!['/','/index.html','/favicon.ico'].includes(pathname)){res.writeHead(404);res.end('Not found');return;}
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  try {const body=await readFile(path.join(root,'index.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(body);}
  catch {res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8'});res.end('请先执行 npm run build。');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
