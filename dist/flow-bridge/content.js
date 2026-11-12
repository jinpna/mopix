'use strict';
(()=>{
 const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 const label=e=>{const direct=e.getAttribute('aria-label');if(direct)return direct.trim().replace(/\s+/g,' ');const ids=e.getAttribute('aria-labelledby');if(ids){const name=ids.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim();if(name)return name.replace(/\s+/g,' ')}const copy=e.cloneNode(true);copy.querySelectorAll('svg,i,[aria-hidden=true],[class*=material-symbol],[class*=material-icon]').forEach(n=>n.remove());return(copy.textContent||'').trim().replace(/\s+/g,' ')};
 const controls=()=>[...document.querySelectorAll('button,[role=button],[role=radio],[role=option]')].filter(visible);
 const fields=()=>[...document.querySelectorAll('textarea,[contenteditable=true],[role=textbox]')].filter(visible).filter(e=>!e.disabled&&!e.closest('[role=dialog]'));
 function exact(labels){const a=controls().filter(e=>labels.includes(label(e))&&!e.disabled&&e.getAttribute('aria-disabled')!=='true');const radios=a.filter(e=>e.getAttribute('role')==='radio'||e.type==='radio');if(radios.length===1)return radios[0];if(a.length!==1)throw Error('Không xác định được nút Flow: '+labels.join(' / ')+'. Mở Flow và kiểm tra chế độ.');return a[0]}
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 function state(){const account=controls().map(label).find(s=>/Tài khoản Google:|Google Account:/i.test(s));const body=document.body.innerText;const credit=body.match(/(?:AI credits remaining|Tín dụng còn lại)\s*[:：]?\s*([\d.,]+)/i);return{url:location.origin+location.pathname,authenticated:!!account&&fields().length===1,email:account?.match(/\(([^()\s]+@[^()\s]+)\)/)?.[1]||null,credits:credit?Number(credit[1].replace(/[,\.]/g,'')):null,projectId:location.pathname.match(/\/project\/([^/]+)/)?.[1]||null,projectName:document.querySelector('h1')?.textContent?.trim()||null}}
 function media(type){return [...document.querySelectorAll(type==='image'?'img':'video')].filter(e=>type==='video'||visible(e)).filter(e=>(e.naturalWidth||e.videoWidth||0)>=256&&(e.naturalHeight||e.videoHeight||0)>=256).map(e=>({src:e.currentSrc||e.src,width:e.naturalWidth||e.videoWidth,height:e.naturalHeight||e.videoHeight})).filter(m=>/^(https:|blob:)/.test(m.src))}
 const thumbs=()=>[...document.querySelectorAll('img')].filter(visible).filter(e=>/Hình thu nhỏ của video đã tạo|generated video thumbnail/i.test(e.alt||''));
 let prepared=null,generated=null,busy=false;const verifiedRefs=new Map();
 async function prepare(a){
  prepared=null;if(!state().authenticated||!/^\/project\/[^/]+\/?$/.test(location.pathname))throw Error('Mở dự án Flow đã đăng nhập trước.');
  exact(['Điều kiện kích hoạt cài đặt','Settings trigger','Settings']).click();await wait(250);
  const mode=exact(a.mediaType==='image'?['Hình ảnh','Image','Images']:['Video']);mode.click();await wait(250);
  if(a.mediaType==='video'){exact(['Thành phần','Ingredients']).click();await wait(150);exact(['Chọn nhóm mô hình','Select model family']).click();await wait(150);exact(['Omni 1.2 Flash']).click();await wait(150);const model=exact(['Chọn nhóm mô hình','Select model family']);if(!/Omni 1\.2 Flash/.test(model.textContent))throw Error('Chưa xác nhận Omni 1.2 Flash. Chưa bấm tạo.');}
  const ratio=exact([a.ratio]);ratio.click();const quantity=exact(['x1']);quantity.click();await wait(200);
  const selected=e=>e.getAttribute('aria-checked')==='true'||e.getAttribute('data-state')==='checked'||e.checked===true;
  if(!selected(exact(a.mediaType==='image'?['Hình ảnh','Image','Images']:['Video']))||!selected(exact([a.ratio]))||!selected(exact(['x1'])))throw Error('Flow chưa xác nhận đúng loại media, tỷ lệ hoặc số lượng x1.');
  if(a.mediaType==='video'){
   const readSeconds=el=>{const m=(el.innerText||'').match(/(?:Độ dài|Length|Duration)\s*(\d+)\s*(?:giây|seconds?|s)\b/i);return m?Number(m[1]):null};
   const bodySeconds=()=>readSeconds(document.body);
   if(bodySeconds()!==a.duration){
    const sliders=[...document.querySelectorAll('[role=slider],input[type=range]')].filter(visible).filter(e=>/Độ dài|Length|Duration/i.test(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')?.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ')||''));
    if(sliders.length!==1)throw Error('Không xác định được điều khiển thời lượng Flow. Chưa bấm tạo.');
    const slider=sliders[0],track=(slider.parentElement?.getBoundingClientRect().width||0)>slider.getBoundingClientRect().width+20?slider.parentElement:slider,rect=track.getBoundingClientRect(),y=rect.top+rect.height/2;
    const min=3,max=15,ratio=Math.max(0,Math.min(1,(a.duration-min)/(max-min)));
    let scopeEl=slider;while(scopeEl&&!/Độ dài|Length|Duration/i.test(scopeEl.innerText||''))scopeEl=scopeEl.parentElement;
    const seconds=()=>{const v=scopeEl?readSeconds(scopeEl):null;return v??bodySeconds()};
    const setDirect=()=>{try{const rangeEl=slider.tagName==='INPUT'?slider:slider.querySelector('input[type=range]');const lo=Number(rangeEl?.min??slider.getAttribute('aria-valuemin')??3),hi=Number(rangeEl?.max??slider.getAttribute('aria-valuemax')??15);const val=Number.isFinite(lo)&&Number.isFinite(hi)&&hi>lo?String(lo+ratio*(hi-lo)):String(a.duration);if(rangeEl){const desc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');if(desc&&desc.set)desc.set.call(rangeEl,val);else rangeEl.value=val;rangeEl.dispatchEvent(new Event('input',{bubbles:true}));rangeEl.dispatchEvent(new Event('change',{bubbles:true}));return true}if('value'in slider){slider.value=val;slider.dispatchEvent(new Event('input',{bubbles:true}));slider.dispatchEvent(new Event('change',{bubbles:true}));return true}slider.setAttribute('aria-valuenow',val);slider.dispatchEvent(new Event('input',{bubbles:true}));slider.dispatchEvent(new Event('change',{bubbles:true}));return true}catch{return false}};
    const dragTo=async()=>{const r=track.getBoundingClientRect(),yy=r.top+r.height/2,cur=seconds();if(cur===null)return;const x0=r.left+Math.max(4,Math.min(r.width-4,r.width*Math.max(0,Math.min(1,(cur-min)/(max-min))))),x1=r.left+Math.max(4,Math.min(r.width-4,r.width*ratio));const o=(x,down)=>({bubbles:true,cancelable:true,composed:true,clientX:x,clientY:yy,pointerId:1,isPrimary:true,button:0,buttons:down?1:0});slider.dispatchEvent(new PointerEvent('pointerdown',o(x0,true)));slider.dispatchEvent(new MouseEvent('mousedown',o(x0,true)));for(let i=1;i<=8;i++){const x=x0+(x1-x0)*i/8;slider.dispatchEvent(new PointerEvent('pointermove',o(x,true)));slider.dispatchEvent(new MouseEvent('mousemove',o(x,true)));await wait(30)}slider.dispatchEvent(new PointerEvent('pointerup',o(x1,false)));slider.dispatchEvent(new MouseEvent('mouseup',o(x1,false)));slider.dispatchEvent(new MouseEvent('click',o(x1,false)));await wait(250)};
    const sendKey=(el,k)=>{const code=k==='ArrowRight'?39:37;for(const type of ['keydown','keyup']){const e=new KeyboardEvent(type,{key:k,code:k,bubbles:true,cancelable:true});try{Object.defineProperty(e,'keyCode',{value:code});Object.defineProperty(e,'which',{value:code})}catch{}el.dispatchEvent(e)}};
    const nudgeKeys=async()=>{slider.focus();let keyTarget=slider;if(document.activeElement!==slider){const inner=slider.querySelector('input,[tabindex]');if(inner){inner.focus();if(document.activeElement===inner)keyTarget=inner}}if(document.activeElement&&slider.contains(document.activeElement))keyTarget=document.activeElement;let unchanged=0;for(let step=0;step<20;step++){const cur=seconds();if(cur===null||cur===a.duration)break;sendKey(keyTarget,cur<a.duration?'ArrowRight':'ArrowLeft');await wait(200);if(seconds()===cur){unchanged++;if(unchanged>=3)break}else unchanged=0}};
    setDirect();await wait(250);
    if(seconds()!==a.duration){
     for(const x of [rect.left+Math.max(4,Math.min(rect.width-4,rect.width*ratio)),...Array.from({length:13},(_,i)=>rect.left+Math.max(4,Math.min(rect.width-4,rect.width*(i/12))))]){
      if(seconds()===a.duration)break;
      const target=document.elementFromPoint(x,y)||track;
      for(const type of ['pointerdown','mousedown','pointerup','mouseup','click'])target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,composed:true,clientX:x,clientY:y,pointerId:1,isPrimary:true,button:0,buttons:type.includes('down')?1:0}));
      await wait(120);
     }
    }
    if(seconds()!==a.duration)await dragTo();
    if(seconds()!==a.duration)await nudgeKeys();
    if(seconds()!==a.duration)throw Error('Flow hiện chưa nhận thời lượng '+a.duration+' giây (đang '+(seconds()??'chưa đọc được')+'). Chọn thời lượng được mô hình hỗ trợ; chưa bấm tạo.');
   }
  }
  exact(['Điều kiện kích hoạt cài đặt','Settings trigger','Settings']).click();await wait(100);
  const composer=()=>{let node=fields()[0];while(node&&node!==document.body){if([...node.querySelectorAll('button')].some(e=>['Bắt đầu tạo','Start generation','Generate'].includes(label(e))))return node;node=node.parentElement}return null};
  const sources=node=>{
   if(!node)return[];
   const media=[...node.querySelectorAll('img,video')].filter(e=>e.tagName==='VIDEO'?e.readyState>=2:e.complete&&e.naturalWidth>0).map(e=>e.currentSrc||e.src||e.poster).filter(Boolean);
   for(const e of [node,...node.querySelectorAll('*')]){const bg=getComputedStyle(e).backgroundImage;for(const match of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g))media.push(match[1])}
   return [...new Set(media)];
  };
  const clearBtn=controls().filter(e=>['Xoá câu lệnh','Xóa câu lệnh','Clear prompt'].includes(label(e)));
  if(clearBtn.length===1){clearBtn[0].click();await wait(250)}
  if(a.files?.length){
   const pending=a.files.filter(file=>![...document.querySelectorAll('[aria-label],[title]')].filter(visible).some(e=>(e.getAttribute('aria-label')===file.name||e.getAttribute('title')===file.name)&&sources(e).length&&!/\b\d{1,3}%/.test(e.innerText)));
   if(pending.length){
   let uploads=[...document.querySelectorAll('input[type=file]')];
   if(!uploads.length){exact(['Thêm thành phần vào ô nhập câu lệnh','Add to prompt']).click();await wait(200);const button=controls().filter(e=>/^(Tải nội dung nghe nhìn lên|Tải lên|Upload media|Upload)(?:\b|$)/i.test(label(e)));if(button.length===1)button[0].click();await wait(150);uploads=[...document.querySelectorAll('input[type=file]')];}
   if(uploads.length!==1)throw Error('Không xác định được ô tải tham chiếu trong Flow. Chọn chế độ tham chiếu rồi thử lại.');
   const transfer=new DataTransfer();for(const f of pending){const bytes=Uint8Array.from(atob(f.base64),c=>c.charCodeAt(0));transfer.items.add(new File([bytes],f.name,{type:f.mime}))}uploads[0].files=transfer.files;uploads[0].dispatchEvent(new Event('change',{bubbles:true}));
   }
   const expected=[];
   for(const file of a.files){
    let card=null,referenceSources=[];
    for(let attempt=0;attempt<90;attempt++){
     const cards=[...document.querySelectorAll('[aria-label],[title]')].filter(visible).filter(e=>e.getAttribute('aria-label')===file.name||e.getAttribute('title')===file.name);
     const loading=cards.some(e=>/\b\d{1,3}%|đang tải|uploading/i.test(e.innerText)||e.getAttribute('aria-busy')==='true');
     const ready=cards.filter(e=>sources(e).length);
     if(!loading&&ready.length){card=ready[0];referenceSources=[...sources(card),...(verifiedRefs.get(file.name)||[])];break}
     await wait(500);
    }
    if(!card)throw Error('Ảnh/video '+file.name+' chưa sẵn sàng trong thư viện dự án Flow. Chưa bấm tạo.');
    const attached=()=>sources(composer()).some(src=>referenceSources.includes(src));
    if(!attached()){
     let lists=[...document.querySelectorAll('[role=listbox]')].filter(visible);
     if(!lists.length){exact(['Thêm thành phần vào ô nhập câu lệnh','Add to prompt']).click();await wait(250);lists=[...document.querySelectorAll('[role=listbox]')].filter(visible)}
     if(lists.length!==1)throw Error('Chưa mở được danh sách thành phần Flow. Chưa bấm tạo.');
     const names=[...lists[0].querySelectorAll('*')].filter(visible).filter(e=>e.textContent.trim()===file.name&&!Array.from(e.children).some(c=>c.textContent.trim()===file.name));
     if(!names.length)throw Error('Không tìm thấy đúng tên file '+file.name+' trong bộ chọn thành phần. Chưa bấm tạo.');
     const before=sources(composer());
     names[0].click();await wait(300);
     const confirm=controls().filter(e=>['Thêm vào câu lệnh','Add to prompt'].includes(label(e)));
     if(confirm.length===1)confirm[0].click();
     for(let attempt=0;attempt<20;attempt++){
      const added=sources(composer()).filter(src=>!before.includes(src));
      if(added.length===1){referenceSources.push(added[0]);verifiedRefs.set(file.name,[added[0]]);break}
      await wait(250);
     }
    }
    const matched=sources(composer()).find(src=>referenceSources.includes(src));
    if(!matched)throw Error('Chưa xác minh được thumbnail của '+file.name+' sau khi chọn đúng tên file. Chưa bấm tạo.');
    if(!expected.includes(matched))expected.push(matched);
   }
   const currentSources=sources(composer());
   if(currentSources.length!==expected.length)throw Error('Ô câu lệnh đang có '+currentSources.length+' thành phần thay vì '+expected.length+'. Chưa bấm tạo.');
  }
  const f=fields();if(f.length!==1)throw Error('Không xác định được ô prompt duy nhất.');const el=f[0];el.focus();
  const norm=s=>String(s||'').replace(/\r/g,'').replace(/\s+/g,' ').trim();
  if(el.tagName==='TEXTAREA'){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,a.prompt);el.dispatchEvent(new Event('input',{bubbles:true}))}else{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);document.execCommand('insertText',false,a.prompt)}
  await wait(150);if(norm(el.value||el.innerText||'')!==norm(a.prompt))throw Error('Prompt chưa được chuyển đầy đủ sang Flow.');
  const start=exact(['Bắt đầu tạo','Start generation','Generate']);if(start.disabled)throw Error('Flow chưa sẵn sàng tạo.');
  prepared={jobId:a.jobId,mediaType:a.mediaType,baseline:media(a.mediaType).map(m=>m.src),thumbnails:thumbs().map(e=>e.currentSrc||e.src),url:location.href};return{ready:true,projectId:state().projectId,referencesVerified:a.files?.length||0,model:a.mediaType==='video'?'Omni 1.2 Flash':null};
 }
 async function execute(c){switch(c.op){
  case'inspect':return state();
  case'recover':{if(location.href!==c.args.url||!location.pathname.includes('/edit/')||!document.body.innerText.includes(c.args.prompt))throw Error('Trang video chưa khớp đúng prompt và kết quả cần nhập.');generated={jobId:c.args.jobId,mediaType:'video',baseline:[],thumbnails:[],openedResult:true,url:location.href};return{ready:true};}
  case'prepare':return prepare(c.args);
  case'generate':{if(!prepared||prepared.jobId!==c.args.jobId||prepared.url!==location.href||generated?.jobId===c.args.jobId)throw Error('Lượt tạo không hợp lệ hoặc đã gửi; không tự gửi lại.');generated={...prepared};prepared=null;const button=exact(['Bắt đầu tạo','Start generation','Generate']);button.click();await wait(1200);const prompt=fields()[0];const cleared=prompt&&!(prompt.value||prompt.innerText||'').trim();const progress=/đang tạo|generating|creating|\b[0-9]{1,2}%/i.test(document.body.innerText);const added=media(generated.mediaType).some(m=>!generated.baseline.includes(m.src));if(!cleared&&!progress&&!added)throw Error('Chưa xác nhận Google đã bắt đầu tạo. Kiểm tra tab Flow trước khi chạy lại; app không tự gửi lần hai.');return{submitted:true};}
  case'collect':{if(!generated||generated.jobId!==c.args.jobId||generated.url!==location.href)throw Error('Tab Flow đã đổi; kiểm tra kết quả trên Google trước khi gửi lại.');const errors=[...document.querySelectorAll('[role=alert]')].filter(visible).map(label).filter(t=>/failed|error|không thể|thất bại|lỗi/i.test(t));if(errors.length)throw Error(errors.join(' '));let candidates=media(generated.mediaType).filter(m=>!generated.baseline.includes(m.src));if(generated.mediaType==='video'&&!candidates.length&&!generated.openedResult){const fresh=thumbs().filter(e=>!generated.thumbnails.includes(e.currentSrc||e.src));if(fresh.length===1){generated.openedResult=true;fresh[0].click();await wait(800);if(location.pathname.startsWith(new URL(generated.url).pathname+'/edit/'))generated.url=location.href;else throw Error('Chưa mở được video kết quả trong Flow.');candidates=media('video').filter(m=>!generated.baseline.includes(m.src));}}if(generated.mediaType==='video'&&candidates.length===1&&!generated.openedResult){const fresh=thumbs().filter(t=>!generated.thumbnails.includes(t.currentSrc||t.src));if(fresh.length===1){generated.openedResult=true;fresh[0].click();await wait(800);if(location.pathname.startsWith(new URL(generated.url).pathname+'/edit/'))generated.url=location.href;candidates=media('video').filter(m=>!generated.baseline.includes(m.src));}else generated.openedResult=true;}if(generated.mediaType==='video'&&generated.openedResult){
 if(!generated.downloadArmed){const a=await chrome.runtime.sendMessage({type:'armDownload',jobId:generated.jobId});if(!a?.armed)throw Error(a?.error||'Chưa bật nhận tải xuống.');exact(['Tải nội dung nghe nhìn xuống','Download media']).click();await wait(200);exact(['720p Kích thước gốc','720p Kích thước gốc','720p Original size']).click();generated.downloadArmed=true;}
 const d=await chrome.runtime.sendMessage({type:'downloadState',jobId:generated.jobId});if(d?.error)throw Error(d.error);if(d?.done){generated.downloadPath=d.path;return{done:true,media:{src:'chrome-download'}}}return{done:false};
 }if(candidates.length>1)throw Error('Có nhiều kết quả mới. Nhập thủ công để tránh lấy sai tác vụ.');if(candidates[0])return{done:true,media:candidates[0]};return{done:false};}
  case'download':{if(c.args.url==='chrome-download'){if(!generated||generated.jobId!==c.args.jobId||!generated.downloadPath)throw Error('Chưa tải xong video.');return{downloadPath:generated.downloadPath};}if(!generated||generated.jobId!==c.args.jobId||!media(generated.mediaType).some(m=>m.src===c.args.url)||generated.baseline.includes(c.args.url))throw Error('Kết quả không thuộc lượt tạo hiện tại.');let blob=null;try{const r=await fetch(c.args.url);if(!r.ok)throw Error('Không tải được kết quả Flow.');blob=await r.blob();}catch(e){if(generated.mediaType!=='video')throw e;if(!generated.openedResult){const fresh=thumbs().filter(t=>!generated.thumbnails.includes(t.currentSrc||t.src));if(fresh.length===1){generated.openedResult=true;fresh[0].click();await wait(800);if(location.pathname.startsWith(new URL(generated.url).pathname+'/edit/'))generated.url=location.href;}}if(!generated.downloadArmed){const a=await chrome.runtime.sendMessage({type:'armDownload',jobId:generated.jobId});if(!a?.armed)throw Error(a?.error||'Chưa bật nhận tải xuống.');exact(['Tải nội dung nghe nhìn xuống','Download media']).click();await wait(200);exact(['720p Kích thước gốc','720p Kích thước gốc','720p Original size']).click();generated.downloadArmed=true;}const deadline=Date.now()+90000;for(;;){const d=await chrome.runtime.sendMessage({type:'downloadState',jobId:generated.jobId});if(d?.error)throw Error(d.error);if(d?.done){generated.downloadPath=d.path;return{downloadPath:d.path};}if(Date.now()>deadline)throw Error('Chưa tải xong video từ Flow sau 90 giây.');await wait(1000);}}if(blob.size>30*1024*1024)throw Error('Kết quả trên 30 MB; tải thủ công từ Flow.');return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({data:reader.result,mime:blob.type});reader.onerror=reject;reader.readAsDataURL(blob)})}
  default:throw Error('Lệnh không được hỗ trợ.');
 }}
 async function tick(){if(busy)return;busy=true;try{const r=await chrome.runtime.sendMessage({type:'tick',state:state()});if(r?.command){const result={id:r.command.id};try{result.value=await execute(r.command)}catch(e){result.error=e.message}await chrome.runtime.sendMessage({type:'result',result})}}catch{}finally{busy=false}}
 chrome.runtime.onMessage.addListener((m,sender,respond)=>{if(m.type==='monday-flow-ping'){respond({pong:true});return}if(m.type==='monday-flow-wake'){respond({woke:true});tick()}});
 setInterval(tick,1500);tick();
})();
