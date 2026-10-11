/* Estudio WebAR: marcador imprimible, QR + imagen entrenada (ratio 0.72). */
import {checkPatt} from './marker-validation.js';

export const MARKER_RATIO=0.72;
export const MARKER_PRINT_PX=1800; // 15cm @ 304.8dpi (300dpi aproximados)
export const MARKER_PRINT_CM=15;

function readyImage(blob){
 return new Promise((resolve,reject)=>{
   const url=URL.createObjectURL(blob);
   const image=new Image();
   image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};
   image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('No se pudo leer la imagen.'))};
   image.src=url;
 });
}
export function routeURL(id){
 const address=new URL('./recorrido.html',location.href);
 address.searchParams.set('id',id);
 return address.href;
}
export function makeQR(text,size=512){
 return new Promise(async(resolve,reject)=>{
   try{
     if(!window.QRCode)throw new Error('No está disponible la biblioteca de códigos QR.');
     const host=document.createElement('div');
     host.style.position='fixed';host.style.left='-10000px';
     document.body.appendChild(host);
     new QRCode(host,{text,width:size,height:size,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
     await new Promise(r=>requestAnimationFrame(r));
     const original=host.querySelector('canvas')||host.querySelector('img');
     if(!original)throw new Error('No se generó el código QR.');
     if(original.tagName==='IMG'&&!original.complete){
       await new Promise((ok,fail)=>{original.onload=ok;original.onerror=()=>fail(new Error('El QR no pudo cargarse.'))});
     }
     const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
     canvas.getContext('2d').drawImage(original,0,0,size,size);
     host.remove();resolve(canvas);
   }catch(error){reject(error)}
 });
}
function paintInner(image,qr){
 const size=1024;
 const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
 ctx.drawImage(image,0,0,size,size);
 // QR fijo en la esquina inferior derecha, con margen blanco de seguridad.
 // 33% del patrón interior equivale a ~28.5 mm en un soporte de 150 mm.
 const qrSide=Math.round(size*.33);
 const offset=Math.round(size*.025);
 const x=size-qrSide-offset,y=size-qrSide-offset;
 ctx.fillStyle='#fff';ctx.fillRect(x,y,qrSide,qrSide);
 const quiet=Math.round(qrSide*.08);
 ctx.imageSmoothingEnabled=false;
 ctx.drawImage(qr,x+quiet,y+quiet,qrSide-quiet*2,qrSide-quiet*2);
 ctx.imageSmoothingEnabled=true;
 return canvas;
}
function buildPrint(inner){
 const edge=MARKER_PRINT_PX;
 const canvas=document.createElement('canvas');canvas.width=edge;canvas.height=edge;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,edge,edge);
 // Misma geometría que MarkerCreator.buildFullMarker: 10% margen,
 // área negra 80%, imagen interior 72% del área negra.
 const outer=edge*.1;
 const black=edge*.8;
 ctx.fillStyle='#000';ctx.fillRect(outer,outer,black,black);
 const imageSize=black*MARKER_RATIO;
 const imageXY=(edge-imageSize)/2;
 ctx.fillStyle='#fff';ctx.fillRect(imageXY,imageXY,imageSize,imageSize);
 ctx.imageSmoothingEnabled=true;
 ctx.drawImage(inner,imageXY,imageXY,imageSize,imageSize);
 return canvas;
}
function encodeInner(imageDataUrl){
 return new Promise((resolve,reject)=>{
   const pattern=window.MarkerCreator?.ArPatternFile;
   if(!pattern) return reject(new Error('No se cargó el generador de patrones AR.'));
   let timeout=setTimeout(()=>reject(new Error('El generador .patt no respondió.')),15000);
   try{pattern.encodeImageURL(imageDataUrl,text=>{
     clearTimeout(timeout);
     try{checkPatt(text);resolve(text)}catch(error){reject(error)}
   })}catch(error){clearTimeout(timeout);reject(error)}
 });
}
export async function composeMarker({imageBlob,sessionId}){
 if(!(imageBlob instanceof Blob))throw new Error('Primero cargá una imagen validada.');
 if(!sessionId)throw new Error('Este recorrido no tiene identificador.');
 const img=await readyImage(imageBlob);
 const qr=await makeQR(routeURL(sessionId));
 const inner=paintInner(img,qr);
 const pattern=await encodeInner(inner.toDataURL('image/png'));
 const finalCanvas=buildPrint(inner);
 const finalBlob=await new Promise((resolve,reject)=>finalCanvas.toBlob(b=>b?resolve(b):reject(new Error('No se exportó el PNG.')),'image/png'));
 return {finalBlob,pattern,ratio:MARKER_RATIO,printCm:MARKER_PRINT_CM,url:routeURL(sessionId),canvas:finalCanvas};
}