// Format/size packaging only. The artwork itself is generated with built-in imagegen.
import {mkdir,stat,copyFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root=path.resolve('public/illustrations/icons-v1');
const originals=path.resolve('artifacts/illustration-concepts/icons-v1/originals');
const names=['journey','library','reader','question','theater','studio','records','classroom','listen','bookmark','upload','pdf','print','team','ideas','home'];
await mkdir(originals,{recursive:true});
for(const name of names){
  const source=path.join(root,`${name}.png`);
  await stat(source); // Fail honestly if an approved generation is still pending.
  await copyFile(source,path.join(originals,`${name}.png`));
  const output=path.join(root,`${name}.webp`);
  await sharp(source).resize(256,256,{fit:'inside',withoutEnlargement:true}).webp({quality:90,alphaQuality:100,effort:6}).toFile(output);
  const m=await sharp(output).metadata();
  if(!m.hasAlpha)throw new Error(`Transparency lost: ${name}`);
  console.log(`${name}: ${m.width}x${m.height}, ${(await stat(output)).size} bytes, alpha`);
}
