import { GlobalFonts } from '@napi-rs/canvas';

console.log('GlobalFonts keys:', Object.keys(GlobalFonts));
console.log('GlobalFonts prototype:', Object.getPrototypeOf(GlobalFonts));
// Check if registerFromPath exists
try {
  // @ts-ignore
  if (typeof GlobalFonts.registerFromPath === 'function') {
    console.log('registerFromPath exists');
  } else {
    console.log('registerFromPath MISSING');
  }
} catch (e) {
  console.log('Error checking GlobalFonts:', e);
}
