'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
function bindProfile(profile,bridge,appDir,dataDir){
 let timer=null,page=null,client=null,binding=null,download=null,enabled=false;
 const channel=crypto.randomUUID(),exposed=new WeakSet(),folder=path.join(dataDir,'flow-downloads');
 const code=fs.readFileSync(path.join(appDir,'dist/flow-bridge/content.js'),'utf8');
 async function receive(m){
  if(!enabled)return{error:'Cầu nối Chrome riêng đã dừng.'};
  if(m.type==='armDownload'){
   if(download&&!download.done&&download.jobId!==m.jobId)throw Error('Một lượt tải Flow khác đang chạy.');
   download={jobId:m.jobId,started:Date.now()};return{armed:true};
  }
  if(m.type==='downloadState'){
   if(download?.jobId!==m.jobId)return{error:'Sai lượt tải'};
   if(download.error)return{error:download.error};
   if(!download.done)return{done:false};
   const file=path.join(folder,download.guid+'.mp4');
   if(!fs.existsSync(file))return{done:false};
   return{done:true,path:file};
  }
  if(m.type==='tick'){bridge.heartbeat({...m.state,channel});return{command:bridge.next(channel)}}
  if(m.type==='result')return{accepted:bridge.result(m.result,channel)};
  return{error:'Lệnh cầu nối không hợp lệ.'};
 }
 async function bindOnce(){
  const next=await profile.page();
  if(page!==next||!client){
   if(client)await client.detach().catch(()=>{});
   page=next;client=await page.createCDPSession();
   fs.mkdirSync(folder,{recursive:true,mode:0o700});
   // GUID filenames identify this download without guessing from directory timestamps.
   await client.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:folder,eventsEnabled:true});
   client.on('Browser.downloadWillBegin',e=>{
    if(download&&!download.guid&&Date.now()-download.started<30000&&/^https:\/\/flow\.google\.com\//.test(page.url()))download.guid=e.guid;
   });
   client.on('Browser.downloadProgress',e=>{
    if(download?.guid!==e.guid)return;
    if(e.state==='canceled')download.error='Chrome đã hủy tải video Flow.';
    if(e.state==='completed'){
     const source=path.join(folder,e.guid),target=source+'.mp4';
     try{if(fs.existsSync(source))fs.renameSync(source,target);download.done=fs.existsSync(target)}catch{download.error='Không lưu được video Flow vừa tải.'}
    }
   });
  }
  if(!exposed.has(page)){await page.exposeFunction('__mondayFlow',receive);exposed.add(page)}
  // A navigation replaces the document even when Puppeteer returns the same Page.
  await page.evaluate(source=>{
   if(window.__mondayFlowProfileInjected)return;
   window.__mondayFlowProfileInjected=true;
   const runtime={sendMessage:m=>window.__mondayFlow(m),onMessage:{addListener(){}}};
   const run=new Function('chrome',source);run({runtime});
  },code);
 }
 async function bind(){if(binding)return binding;binding=bindOnce();try{return await binding}finally{binding=null}}
 return{
  async start(){enabled=true;try{await bind()}catch(e){enabled=false;throw e}if(!timer){timer=setInterval(()=>bind().catch(()=>{}),3000);timer.unref()}},
  stop(){enabled=false;clearInterval(timer);timer=null;page=null;if(client)client.detach().catch(()=>{});client=null}
 };
}
module.exports={bindProfile};
