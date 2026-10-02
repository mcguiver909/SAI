import {createWorker} from './tesseract.esm.min.js';
export async function readProfileImage(file,onProgress=()=>{},signal){
 let worker,bitmap;const check=()=>{if(signal?.aborted)throw new DOMException('취소됨','AbortError');};
 const abort=()=>{worker?.terminate().catch(()=>{});};
 try{
 check();onProgress('사진 인식을 준비하고 있어요…');bitmap=await createImageBitmap(file);check();
 if(bitmap.width*bitmap.height>30_000_000)throw Error('이미지가 너무 커요. 전공·소개 부분만 잘라서 올려주세요.');
 const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();bitmap=null;
 worker=await createWorker('kor+eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/data',workerBlobURL:false,logger:m=>{if(!signal?.aborted)onProgress(m.status==='recognizing text'?'글자를 읽고 있어요… '+Math.round(m.progress*100)+'%':'사진 인식을 준비하고 있어요…');}});
 signal?.addEventListener('abort',abort,{once:true});check();const {data}=await worker.recognize(canvas);check();return data.text.trim();
 }finally{bitmap?.close();signal?.removeEventListener('abort',abort);if(worker)await worker.terminate().catch(()=>{});}
}
window.saiReadProfileImage=readProfileImage;
