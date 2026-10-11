/* Estudio WebAR: marcador compacto 15 cm, QR integrado, patternRatio 0.88. */
import {checkPatt} from './marker-validation.js';

export const MARKER_RATIO=0.88;
export const MARKER_OUTER_MARGIN=0.045; // 4.5% blanco alrededor del marco
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
 // El QR es fijo y forma parte del mismo patrón que codificamos en el .patt.
 const size=1024,canvas=document.createElement('canvas');
 canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d');
 const normalized=normalizeArtwork(image);
 ctx.drawImage(normalized,0,0,size,size);
 // La caja del QR toca prácticamente el extremo inferior derecho del área útil.
 // Conservar una quiet zone de aproximadamente 4 módulos para lectura con celulares.
 const qrSide=Math.round(size*.29);
 const offset=Math.round(size*.006);
 const quiet=Math.round(qrSide*.105);
 const x=size-qrSide-offset,y=size-qrSide-offset;
 ctx.fillStyle='#fff';ctx.fillRect(x,y,qrSide,qrSide);
 ctx.imageSmoothingEnabled=false;
 ctx.drawImage(qr,x+quiet,y+quiet,qrSide-2*quiet,qrSide-2*quiet);
 ctx.imageSmoothingEnabled=true;
 return canvas;
}
function buildPrint(inner){
 const edge=MARKER_PRINT_PX,canvas=document.createElement('canvas');
 canvas.width=canvas.height=edge;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,edge,edge);
 // AR.js detecta el contorno negro completo y extrae solo el patrón interior.
 // 4.5% blanco + 5.46% negro a cada lado, y 80.08% imagen interna.
 const outer=edge*MARKER_OUTER_MARGIN;
 const black=edge*(1-2*MARKER_OUTER_MARGIN);
 ctx.fillStyle='#000';ctx.fillRect(outer,outer,black,black);
 const innerSize=black*MARKER_RATIO;
 const innerXY=(edge-innerSize)/2;
 ctx.imageSmoothingEnabled=false;ctx.drawImage(inner,innerXY,innerXY,innerSize,innerSize);
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
function detectContentBox(image){
 // Detecta colores distintos al fondo de las esquinas, ignorando líneas aisladas.
 const S=384;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=S;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.fillStyle='#fff';ctx.fillRect(0,0,S,S);
 ctx.drawImage(image,0,0,S,S);
 const data=ctx.getImageData(0,0,S,S).data;
 const corners=[[4,4],[S-20,4],[4,S-20],[S-20,S-20]];
 const samples=[];
 for(const [cx,cy] of corners){
   for(let y=cy;y<cy+16;y+=3)for(let x=cx;x<cx+16;x+=3){
     const at=(y*S+x)*4;samples.push([data[at],data[at+1],data[at+2]]);
   }
 }
 const median=index=>samples.map(p=>p[index]).sort((a,b)=>a-b)[Math.floor(samples.length/2)];
 const bg=[median(0),median(1),median(2)];
 const background='rgb('+bg.join(',')+')';
 const threshold=36;
 const countsX=new Uint16Array(S),countsY=new Uint16Array(S);
 let total=0;
 for(let y=0;y<S;y+=2)for(let x=0;x<S;x+=2){
   const i=(y*S+x)*4;
   const delta=Math.max(Math.abs(data[i]-bg[0]),Math.abs(data[i+1]-bg[1]),Math.abs(data[i+2]-bg[2]));
   if(delta>=threshold){countsX[x]++;countsY[y]++;total++;}
 }
 // Un patrón de borde a borde o una imagen casi uniforme se conserva completa.
 if(total<90||total>(S/2)*(S/2)*.88)
   return {x:0,y:0,w:S,h:S,background,contentFound:false};
 let minX=S,minY=S,maxX=0,maxY=0;
 const minHits=5;
 for(let x=0;x<S;x+=2)if(countsX[x]>=minHits){minX=Math.min(minX,x);maxX=Math.max(maxX,x+2);}
 for(let y=0;y<S;y+=2)if(countsY[y]>=minHits){minY=Math.min(minY,y);maxY=Math.max(maxY,y+2);}
 if(minX>=maxX||minY>=maxY)return {x:0,y:0,w:S,h:S,background,contentFound:false};
 const pad=Math.max(5,Math.round(Math.max(maxX-minX,maxY-minY)*.035));
 minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);
 maxX=Math.min(S,maxX+pad);maxY=Math.min(S,maxY+pad);
 return {x:minX,y:minY,w:maxX-minX,h:maxY-minY,background,contentFound:true};
}
function normalizeArtwork(image){
 const size=1024,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d'),box=detectContentBox(image);
 const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
 const sx=box.x*w/384,sy=box.y*h/384,sw=box.w*w/384,sh=box.h*h/384;
 // Preserva el tono del fondo original; no introduce blanco alrededor de arte negro.
 ctx.fillStyle=box.background;ctx.fillRect(0,0,size,size);
 // 96% del área útil para maximizar el diseño sin recortar su silueta.
 const fit=Math.min(size*.96/sw,size*.96/sh);
 const dw=sw*fit,dh=sh*fit;
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(image,sx,sy,sw,sh,(size-dw)/2,(size-dh)/2,dw,dh);
 return canvas;
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
