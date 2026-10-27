// Measurements shared by the render harnesses: level statistics of an AudioBuffer
// and a WAV encoder, so renders can be checked and listened to outside the browser.

export function stats(buffer) {
  let peak = 0;
  let sum = 0;
  let n = 0;
  let firstSound = -1;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
      sum += v * v;
      if (firstSound < 0 && v > 0.01) firstSound = i / buffer.sampleRate;
    }
    n += data.length;
  }
  return { peak: Number(peak.toFixed(3)), rms: Number(Math.sqrt(sum / n).toFixed(4)), firstSound: Number(firstSound.toFixed(3)) };
}

/** 16-bit PCM WAV of an AudioBuffer, as base64, for listening and spectral analysis outside the browser. */
export function toWav(buffer) {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const bytes = new ArrayBuffer(44 + frames * channels * 2);
  const view = new DataView(bytes);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, 36 + frames * channels * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true);
  str(36, 'data'); view.setUint32(40, frames * channels * 2, true);
  let o = 44;
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  for (let i = 0; i < frames; i++) for (let c = 0; c < channels; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); view.setInt16(o, v < 0 ? v * 32768 : v * 32767, true); o += 2; }
  const u8 = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
