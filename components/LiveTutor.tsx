
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Mic, MicOff, Volume2 } from 'lucide-react';

// Helper functions for audio encoding/decoding as required by guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

export const LiveTutor: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Sẵn sàng học bài cùng bé!');
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const startTutor = async () => {
    try {
      // Lấy API Key linh hoạt
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY ||
        (window as any).process?.env?.API_KEY ||
        (window as any).aistudio?.getApiKey?.() || "";

      if (!apiKey) {
        setStatus('Thiếu API Key để bắt đầu');
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.0-flash-exp', // Model chuẩn cho trải nghiệm Live Audio hiện tại
        callbacks: {
          onopen: () => {
            setStatus('Đang lắng nghe bé...');
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              // CRITICAL: Always use sessionPromise to ensure data is sent after connection is established
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64EncodedAudioString) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => console.error('Live session error', e),
          onclose: () => {
            setStatus('Tạm biệt bé!');
            setIsActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          systemInstruction: 'Bạn là một cô giáo tiểu học có giọng nói ấm áp, nhẹ nhàng và truyền cảm. Hãy giúp bé lớp 1 học chữ, ghép vần và động viên bé một cách dịu dàng.'
        }
      });
      sessionRef.current = await sessionPromise;
      setIsActive(true);
    } catch (err) {
      console.error(err);
      setStatus('Lỗi kết nối micro');
    }
  };

  const stopTutor = () => {
    sessionRef.current?.close();
    setIsActive(false);
    setStatus('Nghỉ ngơi một lát nhé!');
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl flex flex-col items-center">
      <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${isActive ? 'bg-green-100 animate-pulse' : 'bg-gray-100'}`}>
        <Volume2 size={64} className={isActive ? 'text-green-500' : 'text-gray-400'} />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{status}</h3>
      <button
        onClick={isActive ? stopTutor : startTutor}
        className={`px-8 py-4 rounded-full font-bold text-white shadow-lg transition-all ${isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
      >
        {isActive ? <div className="flex items-center gap-2"><MicOff /> Dừng học</div> : <div className="flex items-center gap-2"><Mic /> Bắt đầu trò chuyện</div>}
      </button>
      <p className="mt-4 text-sm text-gray-500 italic">Bé có thể hỏi về bảng chữ cái hoặc nhờ cô giáo kể chuyện nhé!</p>
    </div>
  );
};
