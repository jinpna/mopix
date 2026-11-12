'use strict';
const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
function createFlowProfile({directory}){
 const profile=path.join(directory,'google-flow-profile');let browser=null,child=null,starting=null;
 async function open(){if(starting)return starting;starting=(async()=>{
  if(browser?.connected)return browser;
  const executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';if(!fs.existsSync(executable))throw Error('Cần cài Google Chrome để dùng Google Flow.');
  fs.mkdirSync(profile,{recursive:true,mode:0o700});const portFile=path.join(profile,'DevToolsActivePort');
  // Never attach to the user's ordinary Chrome profiles.
  try{fs.unlinkSync(portFile)}catch{}
  child=spawn(executable,['--user-data-dir='+profile,'--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--no-first-run','--no-default-browser-check','https://flow.google.com/'],{stdio:'ignore'});child.on('error',()=>{});
  const deadline=Date.now()+20000;let endpoint;while(Date.now()<deadline){try{const [port,route]=fs.readFileSync(portFile,'utf8').trim().split('\n');if(/^\d+$/.test(port)&&route?.startsWith('/devtools/browser/')){endpoint='ws://127.0.0.1:'+port+route;break}}catch{}await new Promise(r=>setTimeout(r,250))}
  if(!endpoint)throw Error('Chrome riêng chưa khởi động được. Đóng cửa sổ Google Flow riêng rồi thử lại.');
  const puppeteer=await import('puppeteer-core');browser=await puppeteer.connect({browserWSEndpoint:endpoint,defaultViewport:null});browser.on('disconnected',()=>{browser=null});return browser;
 })();try{return await starting}finally{starting=null}}
 async function status(){if(!browser?.connected)return{connected:false,mode:'dedicated-profile',authenticated:false,projectId:null};const pages=await browser.pages();const projects=pages.filter(p=>/^https:\/\/flow\.google\.com\/project\/[a-f0-9-]+(?:\/edit\/[a-f0-9-]+)?\/?$/.test(p.url()));const page=projects.at(-1);if(!page)return{connected:true,authenticated:false,projectId:null,mode:'dedicated-profile',note:'Đăng nhập Google rồi chọn hoặc tạo dự án trong cửa sổ Flow riêng.'};const authenticated=await page.evaluate(()=>!!document.querySelector('button[aria-label^="Tài khoản Google:"],button[aria-label^="Google Account:"]')).catch(()=>false);return{connected:true,authenticated,projectId:new URL(page.url()).pathname.split('/')[2],url:page.url(),mode:'dedicated-profile'}}
 return{open,status,async close(){if(browser)await browser.close();browser=null},async page(){await open();const pages=await browser.pages();const page=pages.filter(p=>/^https:\/\/flow\.google\.com\/project\/[a-f0-9-]+(?:\/edit\/[a-f0-9-]+)?\/?$/.test(p.url())).at(-1);if(!page)throw Error('Chọn dự án trong cửa sổ Google Flow riêng trước.');return page}};
}
module.exports={createFlowProfile};
