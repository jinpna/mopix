'use strict';
const crypto=require('crypto'),fs=require('fs'),path=require('path');
function createBridge({directory,now=Date.now,timeout=120000}){
 const keyFile=path.join(directory,'flow-bridge-pairing');fs.mkdirSync(directory,{recursive:true});
 let key;try{key=fs.readFileSync(keyFile,'utf8').trim()}catch{key=crypto.randomBytes(32).toString('hex');fs.writeFileSync(keyFile,key,{mode:0o600})}
 if(!/^[a-f0-9]{64}$/.test(key))throw Error('Khóa cầu nối Flow không hợp lệ.');
 let session=null,last=0;const queue=[],waiting=new Map();
 function status(){return session&&now()-last<90000?{connected:true,...session}:{connected:false,authenticated:false,credits:null,error:'Chưa kết nối tab Flow. Mở hướng dẫn kết nối trong Cài đặt.'}}
 function rejectAll(message){for(const w of waiting.values()){clearTimeout(w.timer);w.reject(Error(message))}waiting.clear();queue.length=0}
 function authenticate(value){const b=Buffer.from(String(value||'').replace(/^Bearer /,''));return b.length===64&&crypto.timingSafeEqual(b,Buffer.from(key))}
 function heartbeat(input){const url=new URL(input.url);if(url.protocol!=='https:'||!['flow.google.com','labs.google'].includes(url.hostname))throw Error('Chỉ nhận trạng thái từ Google Flow.');if(!/^[a-f0-9-]{36}$/.test(input.channel||''))throw Error('Kênh kết nối không hợp lệ.');if(session&&session.channel!==input.channel&&waiting.size)throw Error('Tab Flow khác đang xử lý tác vụ.');session={channel:input.channel,url:url.origin+url.pathname,authenticated:input.authenticated===true,projectId:typeof input.projectId==='string'?input.projectId.slice(0,100):null,projectName:typeof input.projectName==='string'?input.projectName.slice(0,200):null,credits:Number.isFinite(input.credits)&&input.credits>=0?input.credits:null,email:typeof input.email==='string'?input.email.slice(0,200):null};last=now();return status()}
 function request(op,args){const s=status();if(!s.connected)return Promise.reject(Error(s.error));if(!['inspect','prepare','generate','collect','download','recover'].includes(op))return Promise.reject(Error('Lệnh không được hỗ trợ.'));return new Promise((resolve,reject)=>{const id=crypto.randomUUID(),timer=setTimeout(()=>{waiting.delete(id);const i=queue.findIndex(c=>c.id===id);if(i>=0)queue.splice(i,1);reject(Error('Tab Flow không phản hồi. Kiểm tra Flow; không tự gửi lại để tránh tính phí hai lần.'))},timeout);waiting.set(id,{resolve,reject,timer,channel:s.channel});queue.push({id,op,args})})}
 function next(channel){if(channel!==status().channel)throw Error('Sai tab Flow.');return queue.shift()||null}
 function result(input,channel){const w=waiting.get(input.id);if(!w||w.channel!==channel)return false;clearTimeout(w.timer);waiting.delete(input.id);input.error?w.reject(Error(String(input.error).slice(0,1000))):w.resolve(input.value);return true}
 function disconnect(){rejectAll('Đã ngắt cầu nối Flow. Tác vụ đã gửi trên Google có thể vẫn chạy.');session=null;last=0;key=crypto.randomBytes(32).toString('hex');fs.writeFileSync(keyFile,key,{mode:0o600});return true}
 return{status,authenticate,heartbeat,request,next,result,disconnect,pairingKey:()=>key,close:()=>rejectAll('Cầu nối đã dừng.')};
}
module.exports={createBridge};
