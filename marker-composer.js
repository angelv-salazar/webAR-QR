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
function paintInner(image, qr) {
  const size = 1024;
  const normalized = normalizeArtwork(image);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // primero dibujamos la imagen ya normalizada
  ctx.drawImage(normalized, 0, 0, size, size);

  // QR más pequeño y más pegado a la esquina
  const qrSide = Math.round(size * 0.26);
  const offset = Math.round(size * 0.008);   // mucho más cerca del borde
  const quiet = Math.round(qrSide * 0.055);  // margen blanco mínimo

  const x = size - qrSide - offset;
  const y = size - qrSide - offset;

  // fondo blanco del QR
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, qrSide, qrSide);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, x + quiet, y + quiet, qrSide - quiet * 2, qrSide - quiet * 2);
  ctx.imageSmoothingEnabled = true;

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
function sampleCorners(ctx, w, h, patch = 32) {
  const points = [
    [0, 0],
    [w - patch, 0],
    [0, h - patch],
    [w - patch, h - patch]
  ];

  let r = 0, g = 0, b = 0, count = 0;

  for (const [sx, sy] of points) {
    const data = ctx.getImageData(sx, sy, patch, patch).data;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  };
}

function colorDistance(r, g, b, bg) {
  return Math.sqrt(
    (r - bg.r) * (r - bg.r) +
    (g - bg.g) * (g - bg.g) +
    (b - bg.b) * (b - bg.b)
  );
}

function detectContentBox(image) {
  const ANALYSIS_SIZE = 512;
  const canvas = document.createElement('canvas');
  canvas.width = ANALYSIS_SIZE;
  canvas.height = ANALYSIS_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  ctx.drawImage(image, 0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE);

  const bg = sampleCorners(ctx, ANALYSIS_SIZE, ANALYSIS_SIZE, 24);
  const data = ctx.getImageData(0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE).data;

  let minX = ANALYSIS_SIZE;
  let minY = ANALYSIS_SIZE;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  const THRESHOLD = 38;

  for (let y = 0; y < ANALYSIS_SIZE; y++) {
    for (let x = 0; x < ANALYSIS_SIZE; x++) {
      const i = (y * ANALYSIS_SIZE + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 10) continue;

      const dist = colorDistance(r, g, b, bg);

      if (dist > THRESHOLD) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) {
    return { x: 0, y: 0, w: ANALYSIS_SIZE, h: ANALYSIS_SIZE };
  }

  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.06);

  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(ANALYSIS_SIZE, maxX + pad);
  maxY = Math.min(ANALYSIS_SIZE, maxY + pad);

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY
  };
}
function normalizeArtwork(image) {
  const size = 1024;

  const analysisBox = detectContentBox(image);

  const scaleX = image.naturalWidth / 512;
  const scaleY = image.naturalHeight / 512;

  const sx = analysisBox.x * scaleX;
  const sy = analysisBox.y * scaleY;
  const sw = analysisBox.w * scaleX;
  const sh = analysisBox.h * scaleY;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // fondo blanco por defecto
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // el contenido útil debe ocupar aprox el 84% del área interna
  const target = size * 0.84;
  const fit = Math.min(target / sw, target / sh);

  const dw = sw * fit;
  const dh = sh * fit;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);

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
