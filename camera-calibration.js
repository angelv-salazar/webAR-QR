// Parámetros ARToolKit (camera_para.dat) en formato binario big-endian de 176 bytes.
// Se construyen usando LAS dimensiones del detector y focales isotrópicas.
// Esta es una calibración aproximada de lente ideal: no sustituye una calibración
// individual mediante tablero, pero evita el redimensionamiento anisotrópico
// de camera_para.dat (640x480) cuando el video llega en 480x640.
export function createCalibrationData(width, height, focalMultiplier = 0.95) {
  const w=Math.round(Number(width)),h=Math.round(Number(height));
  const factor=Number(focalMultiplier);
  if(!(w>=160&&w<=4096&&h>=160&&h<=4096))throw Error('Dimensiones de detector fuera de rango');
  if(!(factor>=0.65&&factor<=1.5))throw Error('Factor focal fuera de rango');
  const f=Math.max(w,h)*factor;
  const cx=(w-1)/2,cy=(h-1)/2;
  // ARToolKit 5 camera_para.dat version 4:
  // 2 enteros de 32 bits (ancho y alto),
  // 12 doubles de matriz 3x4, y 9 doubles de distorsión.
  const bytes=new ArrayBuffer(176);
  const view=new DataView(bytes);
  view.setInt32(0,w,false);view.setInt32(4,h,false);
  const matrix=[f,0,cx,0, 0,f,cy,0, 0,0,1,0];
  matrix.forEach((number,index)=>view.setFloat64(8+index*8,number,false));
  // OpenCV distortion coefficients: k1, k2, p1, p2.
  // No inventamos distorsión para dispositivos sin calibración específica.
  // fx, fy, x0, y0 y escala de cámara según versión 4.
  const distort=[0,0,0,0,f,f,cx,cy,1];
  distort.forEach((number,index)=>view.setFloat64(104+index*8,number,false));
  return {bytes,width:w,height:h,focal:f,principalX:cx,principalY:cy};
}
export function makeCalibrationURL(width,height,focalMultiplier=0.95){
  const result=createCalibrationData(width,height,focalMultiplier);
  const url=URL.createObjectURL(new Blob([result.bytes],{type:'application/octet-stream'}));
  return {...result,url};
}
