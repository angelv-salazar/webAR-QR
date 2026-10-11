// Validación preliminar de imágenes para patrones AR.js.
// Los valores de corte son criterios editoriales, NO garantías de detección AR.
const accepted=new Set(['image/png','image/jpeg','image/webp']);
const MIN=512,RECOMMENDED=1024,MAX_BYTES=10*1024*1024,MAX_EDGE=8192;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rotateVector(data,turns){
  let current=data;
  for(let n=0;n<turns;n++){
    const result=new Array(256);
    for(let y=0;y<16;y++)for(let x=0;x<16;x++)result[y*16+x]=current[(15-x)*16+y];
    current=result;
  }
  return current;
}
export function compareFingerprints(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==256||b.length!==256)return null;
  let best=1;
  for(let t=0;t<4;t++){
    const rotated=rotateVector(b,t);
    let sum=0;
    for(let i=0;i<256;i++)sum+=Math.abs(a[i]-rotated[i]);
    best=Math.min(best,sum/(256*255));
  }
  return best;
}
export async function inspectMarkerImage(file){
  const errors=[],warnings=[],tips=[];
  if(!file)throw new Error('No se eligió una imagen.');
  if(!accepted.has(file.type))errors.push('Formato incompatible. Exportá la imagen como PNG, JPG o WebP.');
  if(file.size>MAX_BYTES)errors.push('El archivo excede 10 MB. Exportalo nuevamente con menor peso.');
  if(file.size===0)errors.push('El archivo está vacío.');
  if(errors.length)return {ok:false,errors,warnings,tips,info:{name:file.name,bytes:file.size}};
  let bitmap=null,objectUrl=null;
  try{
    let image,width,height;
    if(typeof createImageBitmap==='function'){
      bitmap=await createImageBitmap(file);
      image=bitmap;width=bitmap.width;height=bitmap.height;
    }else{
      objectUrl=URL.createObjectURL(file);
      const img=new Image();
      img.src=objectUrl;
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('No es posible abrir esta imagen.'))});
      image=img;width=img.naturalWidth;height=img.naturalHeight;
    }
    if(width<MIN||height<MIN)errors.push('Resolución insuficiente: se requieren al menos 512 × 512 px.');
    if(width>MAX_EDGE||height>MAX_EDGE)errors.push('Resolución demasiado grande: máximo 8192 px por lado.');
    if(Math.abs(width-height)/Math.max(width,height)>0.02)errors.push('La imagen debe ser cuadrada (1:1, tolerancia máxima de 2 %).');
    if(Math.min(width,height)<RECOMMENDED)warnings.push('Resolución admisible, pero recomendamos 1024 × 1024 px para preparar impresiones de calidad.');
    const canvas=document.createElement('canvas');
    canvas.width=128;canvas.height=128;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw new Error('El navegador no pudo analizar la imagen.');
    ctx.clearRect(0,0,128,128);
    ctx.drawImage(image,0,0,128,128);
    let pixels=ctx.getImageData(0,0,128,128).data;
    let transparent=0;
    for(let i=3;i<pixels.length;i+=4)if(pixels[i]<250)transparent++;
    if(transparent/pixels.length*4>.01){
      warnings.push('La imagen contiene transparencia. Se imprimirá sobre fondo blanco; revisá el resultado.');
    }
    const sample=document.createElement('canvas');
    sample.width=16;sample.height=16;
    const sc=sample.getContext('2d',{willReadFrequently:true});
    sc.fillStyle='#fff';sc.fillRect(0,0,16,16);
    sc.drawImage(image,0,0,16,16);
    pixels=sc.getImageData(0,0,16,16).data;
    const gray=[];
    for(let i=0;i<pixels.length;i+=4)gray.push(Math.round(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2]));
    const sorted=[...gray].sort((a,b)=>a-b);
    const contrast=sorted[230]-sorted[25]; // diferencia de percentiles aproximados 90–10
    let dark=0,bright=0,edges=0,edgePairs=0;
    for(let i=0;i<256;i++){
      if(gray[i]<95)dark++;
      if(gray[i]>190)bright++;
      const x=i%16,y=Math.floor(i/16);
      if(x<15){edgePairs++;if(Math.abs(gray[i]-gray[i+1])>45)edges++;}
      if(y<15){edgePairs++;if(Math.abs(gray[i]-gray[i+16])>45)edges++;}
    }
    const edgeDensity=edges/edgePairs;
    let asym=1;
    for(let t=1;t<4;t++){
      const rv=rotateVector(gray,t);
      let sum=0;for(let i=0;i<256;i++)sum+=Math.abs(rv[i]-gray[i]);
      asym=Math.min(asym,sum/(256*255));
    }
    if(contrast<65)warnings.push('Contraste bajo después de reducir a 16 × 16. Usá formas claras y oscuras más diferenciadas.');
    if(dark/256<.055||bright/256<.055)warnings.push('Predomina casi un solo tono. Agregá zonas claras y oscuras bien definidas.');
    if(asym<.055)warnings.push('Diseño demasiado simétrico: podría dificultar distinguir su orientación. Usá formas asimétricas.');
    if(edgeDensity<.035)warnings.push('Muy poca estructura visible a baja resolución: agregá una forma distintiva.');
    if(edgeDensity>.44)warnings.push('Demasiados cambios de detalle a baja resolución: simplificá la imagen.');
    tips.push('El marco negro, la franja blanca exterior y el QR se compondrán en el cartel final de 15 × 15 cm.');
    tips.push('Este análisis es orientativo: el patrón .patt debe generarse y probarse con la imagen impresa.');
    return {
      ok:errors.length===0, errors, warnings, tips,
      info:{name:file.name,bytes:file.size,width,height,
        contrast, asymmetry:Math.round(asym*1000)/1000,
        edgeDensity:Math.round(edgeDensity*1000)/1000,
        transparentPercent:Math.round(transparent/(128*128)*100),
        fingerprint:gray}
    };
  }catch(error){
    return {ok:false,errors:[...errors,'La imagen no pudo procesarse: '+error.message],warnings,tips,info:{name:file.name,bytes:file.size}};
  }finally{
    if(bitmap)bitmap.close();
    if(objectUrl)URL.revokeObjectURL(objectUrl);
  }
}
export function checkPatt(text){
  const numbers=text.trim().split(/\s+/);
  if(numbers.length!==3072)throw new Error('El archivo .patt debe contener 3072 valores numéricos (16×16, RGB, 4 orientaciones).');
  if(!numbers.every(s=>/^\d+$/.test(s)&&Number(s)>=0&&Number(s)<=255))throw new Error('El archivo .patt contiene datos inválidos (solo enteros entre 0 y 255).');
  return true;
}