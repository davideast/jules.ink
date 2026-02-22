import thermal from '../print.js';

const hw = thermal();

export async function printImage(buffer: Buffer): Promise<void> {
  const target = await hw.find();

  if (target) {
    console.log(`🖨️  routing: ${target.name}`);
    hw.print(target.name, buffer, { fit: true })
      .catch(err => console.warn('print error:', err));
  } else {
    console.warn('⚠️  no usb found');
  }
}

export function watchPrinter(signal: AbortSignal) {
  hw.watch(signal);
}
