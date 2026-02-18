
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { LessonContent } from '../types';
import { generateLearningImage, generateSpeech } from '../services/geminiService';
import { playSpeech } from './AudioPlayer';
import { Volume2, BookOpen, PenTool, Lightbulb, RefreshCw, Mic, MessageCircle, Play, ChevronRight, Sparkles, Star, Square, Trash2, MicOff, Image as ImageIcon } from 'lucide-react';

interface Props {
  lesson: LessonContent;
  onBack: () => void;
  onError?: (err: any) => void;
}

// Tách riêng component hiển thị ảnh để tối ưu hóa việc render
const LessonImage = memo(({ url, loading, prompt }: { url: string | null, loading: boolean, prompt: string }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-orange-50/50 animate-pulse">
        <RefreshCw className="animate-spin text-orange-400 mb-2" size={32} />
        <span className="text-xs text-orange-400 font-black uppercase tracking-widest">Đang vẽ tranh...</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50 text-gray-300">
        <ImageIcon size={48} strokeWidth={1.5} />
        <p className="text-[10px] mt-2 font-bold uppercase">Chưa có ảnh</p>
      </div>
    );
  }

  return (
    <img 
      src={url} 
      alt={prompt} 
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover transition-all duration-700 ease-out hover:scale-105"
      onLoad={(e) => {
        (e.target as HTMLImageElement).classList.add('opacity-100');
      }}
    />
  );
});

export const LessonDetail: React.FC<Props> = ({ lesson, onBack, onError }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingImg, setLoadingImg] = useState(false);
  
  // Multi-part recording states
  const [recordingTarget, setRecordingTarget] = useState<string | null>(null);
  const [recordedUrls, setRecordedUrls] = useState<Record<string, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const loadIllustration = useCallback(async () => {
    setImageUrl(null);
    setLoadingImg(true);
    try {
      // Tối ưu prompt để model tạo ảnh nhanh và phù hợp hơn
      const optimizedPrompt = `Hoạt hình thiếu nhi Việt Nam, nét vẽ 2D trong sáng, màu sắc tươi tắn, không có văn bản: ${lesson.imagePrompt}`;
      const url = await generateLearningImage(optimizedPrompt);
      setImageUrl(url);
    } catch (e) {
      console.error(e);
      if (onError) onError(e);
    } finally {
      setLoadingImg(false);
    }
  }, [lesson.imagePrompt, onError]);

  useEffect(() => {
    loadIllustration();
    return () => {
      (Object.values(recordedUrls) as string[]).forEach(url => URL.revokeObjectURL(url));
    };
  }, [lesson, loadIllustration]);

  const handleSpeak = async (text: string) => {
    try {
      const audio = await generateSpeech(text);
      if (audio) playSpeech(audio);
    } catch (e) {
      if (onError) onError(e);
    }
  };

  const startRecording = async (targetId: string) => {
    if (recordingTarget) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedUrls(prev => {
          if (prev[targetId]) URL.revokeObjectURL(prev[targetId]);
          return { ...prev, [targetId]: url };
        });
        setRecordingTarget(null);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingTarget(targetId);
    } catch (err) {
      alert("Bé ơi, ứng dụng cần quyền truy cập Micro để ghi âm nhé!");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingTarget) {
      mediaRecorderRef.current.stop();
    }
  };

  const playRecording = (targetId: string) => {
    const url = recordedUrls[targetId];
    if (url) {
      const audio = new Audio(url);
      audio.play();
    }
  };

  const deleteRecording = (targetId: string) => {
    setRecordedUrls(prev => {
      const newUrls = { ...prev };
      if (newUrls[targetId]) {
        URL.revokeObjectURL(newUrls[targetId]);
        delete newUrls[targetId];
      }
      return newUrls;
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp border-4 border-orange-100 flex flex-col">
      <div className={`p-8 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 ${lesson.id >= 100 ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gradient-to-r from-orange-400 to-orange-600'}`}>
        <div>
          <h2 className="text-4xl font-black mb-2 drop-shadow-md flex items-center gap-2">
            {lesson.id >= 100 && <Star fill="white" className="text-yellow-300" />} {lesson.title}
          </h2>
          <p className="opacity-90 font-bold text-lg">Chương trình Kết nối tri thức</p>
        </div>
        <div className="flex gap-3">
           {lesson.letters.map(l => (
             <span key={l} className={`w-14 h-14 flex items-center justify-center rounded-2xl text-3xl font-black shadow-xl transform rotate-3 ${lesson.id >= 100 ? 'bg-white text-blue-600' : 'bg-white text-orange-600'}`}>
               {l}
             </span>
           ))}
        </div>
      </div>

      <div className="p-6 md:p-10 space-y-12">
        {/* 1. Nhận biết */}
        <section className="animate-fadeIn">
          <h3 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${lesson.id >= 100 ? 'text-blue-600' : 'text-orange-600'}`}>
            <span className={`text-white w-8 h-8 rounded-full flex items-center justify-center text-sm ${lesson.id >= 100 ? 'bg-blue-500' : 'bg-orange-500'}`}>1</span>
            Nhận biết
          </h3>
          <div className={`grid lg:grid-cols-2 gap-8 items-center p-8 rounded-[2.5rem] border-2 ${lesson.id >= 100 ? 'bg-blue-50/30 border-blue-50' : 'bg-orange-50/30 border-orange-50'}`}>
            <div className="aspect-[4/3] bg-white rounded-3xl overflow-hidden shadow-xl relative border-4 border-white group">
              <LessonImage url={imageUrl} loading={loadingImg} prompt={lesson.imagePrompt} />
              {imageUrl && (
                <div className="absolute top-4 right-4 bg-white/90 p-2 rounded-xl shadow-sm pointer-events-none">
                  <Sparkles size={20} className="text-yellow-400" />
                </div>
              )}
            </div>
            <div className="space-y-6">
              <p className="text-4xl font-black text-gray-800 leading-tight">
                {lesson.recognitionSentence}
              </p>
              <button 
                onClick={() => handleSpeak(lesson.recognitionSentence)}
                className={`flex items-center gap-3 bg-white font-black hover:shadow-xl px-8 py-4 rounded-[2rem] transition-all border-4 ${lesson.id >= 100 ? 'text-blue-600 border-blue-100 hover:border-blue-400' : 'text-orange-600 border-orange-100 hover:border-orange-400'}`}
              >
                <Volume2 size={24} /> Nghe cô giáo đọc
              </button>
            </div>
          </div>
        </section>

        {/* 2. Đọc */}
        <section>
          <h3 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${lesson.id >= 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
            <span className={`text-white w-8 h-8 rounded-full flex items-center justify-center text-sm ${lesson.id >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}>2</span>
            Tập Đọc
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lesson.vocabulary.map((word, idx) => {
              const vocabId = `vocab-${idx}`;
              const isThisRecording = recordingTarget === vocabId;
              const hasRecording = !!recordedUrls[vocabId];
              
              return (
                <div 
                  key={idx}
                  className={`relative p-6 bg-white border-2 rounded-[2.5rem] shadow-sm flex flex-col items-center gap-4 transition-all ${isThisRecording ? 'border-red-400 ring-4 ring-red-50' : (lesson.id >= 100 ? 'border-emerald-50 hover:border-emerald-200' : 'border-blue-50 hover:border-blue-200')}`}
                >
                  <button
                    onClick={() => handleSpeak(word)}
                    className="text-3xl font-black text-gray-700 hover:text-gray-900 flex items-center gap-2"
                  >
                    {word} <Volume2 size={20} className="text-gray-300" />
                  </button>

                  <div className="flex gap-2 w-full pt-2 border-t border-gray-50">
                    {!isThisRecording ? (
                      <button 
                        onClick={() => startRecording(vocabId)}
                        disabled={!!recordingTarget}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl font-bold text-xs transition-all ${recordingTarget ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'}`}
                        title="Ghi âm từ này"
                      >
                        <Mic size={16} /> Ghi âm
                      </button>
                    ) : (
                      <button 
                        onClick={stopRecording}
                        className="flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl font-bold text-xs bg-red-500 text-white animate-pulse"
                      >
                        <Square size={14} fill="currentColor" /> Dừng
                      </button>
                    )}

                    {hasRecording && !isThisRecording && (
                      <>
                        <button 
                          onClick={() => playRecording(vocabId)}
                          className="flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl font-bold text-xs bg-green-500 text-white hover:bg-green-600 shadow-md"
                        >
                          <Play size={14} fill="currentColor" /> Nghe lại
                        </button>
                        <button 
                          onClick={() => deleteRecording(vocabId)}
                          className="p-3 rounded-2xl bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Tô và viết */}
        {lesson.id < 100 && (
          <section className="bg-emerald-50/50 p-8 rounded-[2.5rem] border-2 border-emerald-50">
            <h3 className="text-2xl font-bold text-emerald-600 mb-6 flex items-center gap-3">
              <span className="bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              Tô và viết
            </h3>
            <div className="flex flex-wrap gap-6">
               {lesson.letters.map(l => (
                 <div key={l} className="bg-white p-8 rounded-[2rem] border-4 border-emerald-100 text-center shadow-xl w-36 transform hover:-rotate-2 transition-transform">
                   <p className="text-7xl font-serif text-gray-800 mb-2 border-b-4 border-emerald-50 border-dashed pb-4">{l}</p>
                   <p className="text-xs text-emerald-400 font-black uppercase tracking-widest mt-2">Mẫu chữ</p>
                 </div>
               ))}
               <div className="flex-1 bg-white/60 rounded-[2.5rem] border-4 border-dashed border-emerald-200 flex items-center justify-center p-8">
                  <div className="text-center">
                    <PenTool className="mx-auto text-emerald-400 mb-4" size={48} />
                    <p className="text-emerald-700 text-xl font-bold italic">Bé hãy lấy bảng con và phấn tập viết các chữ trên nhé!</p>
                  </div>
               </div>
            </div>
          </section>
        )}

        {/* 4. Luyện đọc đoạn văn */}
        {lesson.readingText && (
          <section>
            <h3 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${lesson.id >= 100 ? 'text-indigo-600' : 'text-purple-600'}`}>
              <span className={`text-white w-8 h-8 rounded-full flex items-center justify-center text-sm ${lesson.id >= 100 ? 'bg-indigo-500' : 'bg-purple-500'}`}>
                {lesson.id >= 100 ? '3' : '4'}
              </span>
              Luyện đọc đoạn văn
            </h3>
            <div className={`p-10 rounded-[3rem] border-4 relative shadow-inner ${lesson.id >= 100 ? 'bg-indigo-50/50 border-indigo-100' : 'bg-purple-50/50 border-purple-100'}`}>
              <p className="text-3xl text-gray-800 leading-relaxed font-bold whitespace-pre-wrap mb-10">
                {lesson.readingText}
              </p>
              
              <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-100">
                <button 
                  onClick={() => handleSpeak(lesson.readingText!)}
                  className={`flex items-center gap-3 bg-white font-black px-8 py-4 rounded-[2rem] shadow-md hover:scale-105 transition-all border-4 ${lesson.id >= 100 ? 'text-indigo-600 border-indigo-50 hover:border-indigo-400' : 'text-purple-600 border-purple-50 hover:border-purple-400'}`}
                >
                  <Play size={24} fill="currentColor" /> Nghe cô giáo đọc mẫu
                </button>

                {recordingTarget !== 'reading' ? (
                  <button 
                    onClick={() => startRecording('reading')}
                    disabled={!!recordingTarget}
                    className={`flex items-center gap-3 font-black px-8 py-4 rounded-[2rem] shadow-xl transition-all border-4 border-white ${recordingTarget ? 'bg-gray-300 text-gray-500' : 'bg-red-500 text-white hover:bg-red-600 hover:scale-105 active:scale-95'}`}
                  >
                    <Mic size={24} /> Bé tập đọc & Ghi âm
                  </button>
                ) : (
                  <button 
                    onClick={stopRecording}
                    className="flex items-center gap-3 bg-gray-800 text-white font-black px-8 py-4 rounded-[2rem] shadow-xl animate-pulse scale-105 transition-all border-4 border-red-500"
                  >
                    <Square size={24} fill="currentColor" /> Đang ghi âm... (Bấm để dừng)
                  </button>
                )}

                {recordedUrls['reading'] && recordingTarget !== 'reading' && (
                  <div className="flex items-center gap-2 animate-fadeIn">
                    <button 
                      onClick={() => playRecording('reading')}
                      className="flex items-center gap-3 bg-green-500 text-white font-black px-8 py-4 rounded-[2rem] shadow-xl hover:bg-green-600 hover:scale-105 transition-all active:scale-95 border-4 border-white"
                    >
                      <Play size={24} fill="currentColor" /> Nghe lại giọng bé
                    </button>
                    <button 
                      onClick={() => deleteRecording('reading')}
                      className="p-4 bg-gray-100 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 5. Luyện nói */}
        {lesson.speakingTopic && (
          <section>
            <h3 className="text-2xl font-bold text-pink-600 mb-6 flex items-center gap-3">
              <span className="bg-pink-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">
                {lesson.id >= 100 ? '4' : '5'}
              </span>
              Luyện nói
            </h3>
            <div className="bg-pink-50 p-10 rounded-[3rem] border-4 border-pink-100 flex flex-col md:flex-row items-center gap-8 shadow-sm">
              <div className="bg-white p-6 rounded-[2rem] shadow-xl text-pink-500">
                <Mic size={48} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="text-2xl font-black text-pink-700 mb-2">Chủ đề: {lesson.speakingTopic}</h4>
                <p className="text-pink-600 font-bold text-lg italic opacity-80">Bé hãy nhấn nút và cùng trò chuyện với Cô giáo nhé!</p>
              </div>
              <button 
                onClick={() => handleSpeak(`Chào bé! Chúng ta hãy cùng nhau thảo luận về chủ đề: ${lesson.speakingTopic} nhé.`)}
                className="bg-pink-500 text-white px-10 py-5 rounded-[2.5rem] font-black text-xl shadow-xl shadow-pink-100 hover:scale-110 active:scale-95 transition-all flex items-center gap-3"
              >
                Bắt đầu thảo luận <ChevronRight />
              </button>
            </div>
          </section>
        )}
      </div>
      
      <div className="bg-gray-50/50 p-10 text-center border-t border-gray-100 flex justify-center">
        <button 
          onClick={onBack} 
          className="bg-white text-gray-400 font-black hover:text-orange-500 hover:border-orange-500 transition-all flex items-center gap-3 px-8 py-4 rounded-2xl border-4 border-gray-100 shadow-sm"
        >
          <ChevronRight className="rotate-180" /> Quay lại danh sách
        </button>
      </div>
    </div>
  );
};
