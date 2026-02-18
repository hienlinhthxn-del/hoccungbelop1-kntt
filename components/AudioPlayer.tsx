
import React from 'react';

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const playSpeech = async (base64Audio: string) => {
  if (!base64Audio) {
    console.error("Dữ liệu âm thanh trống!");
    return;
  }

  console.log("Đang chuẩn bị phát âm thanh, độ dài dữ liệu:", base64Audio.length);

  try {
    // Cách 1: Thử chơi như một file audio chuẩn (WAV/AAC) bằng Blob
    const bytes = decode(base64Audio);
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onended = () => URL.revokeObjectURL(url);

    console.log("Bắt đầu phát âm thanh qua Blob URL...");
    await audio.play();
    console.log("Phát âm thanh thành công!");
  } catch (err) {
    console.warn("Phát bằng Audio Object thất bại, thử sang Web Audio API...", err);

    // Cách 2: Fallback sang Web Audio API cho PCM thô
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      console.log("Phát âm thanh qua Web Audio API thành công!");
    } catch (pcmErr) {
      console.error("Tất cả các phương thức phát âm thanh đều thất bại:", pcmErr);
    }
  }
};
