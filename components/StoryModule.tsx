
import React, { useState } from 'react';
import { generateStory, generateLearningImage, generateSpeech } from '../services/geminiService';
import { StoryResponse } from '../types';
import { playSpeech } from './AudioPlayer';
import { BookOpen, Volume2, ChevronRight, ChevronLeft, RefreshCw, Sparkles } from 'lucide-react';

export const StoryModule: React.FC<{ onError?: (err: any) => void }> = ({ onError }) => {
  const [topic, setTopic] = useState('');
  const [story, setStory] = useState<StoryResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [partLoading, setPartLoading] = useState(false);

  const startStory = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setStory(null);
    setCurrentIndex(0);
    try {
      const data = await generateStory(topic);
      // Pre-load first image
      setPartLoading(true);
      try {
        const img = await generateLearningImage(data.parts[0].imagePrompt);
        data.parts[0].imageUrl = img || undefined;
      } catch (e) {
        if (onError) onError(e);
      }
      setStory(data);
    } catch (e) {
      console.error(e);
      if (onError) onError(e);
    } finally {
      setLoading(false);
      setPartLoading(false);
    }
  };

  const goToPart = async (index: number) => {
    if (!story) return;
    setCurrentIndex(index);
    if (!story.parts[index].imageUrl) {
      setPartLoading(true);
      try {
        const img = await generateLearningImage(story.parts[index].imagePrompt);
        const newStory = { ...story };
        newStory.parts[index].imageUrl = img || undefined;
        setStory(newStory);
      } catch (e) {
        if (onError) onError(e);
      }
      setPartLoading(false);
    }
  };

  const handleRead = async () => {
    if (!story) return;
    const text = story.parts[currentIndex].text;
    try {
      const audio = await generateSpeech(text);
      if (audio) playSpeech(audio);
    } catch (e) {
      if (onError) onError(e);
    }
  };

  const suggestions = ["Chú chó dũng cảm", "Chuyến đi tới vườn bách thú", "Ngày đầu tiên đi học", "Mèo con lười biếng"];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative">
           <BookOpen className="text-blue-500 animate-bounce" size={64} />
           <Sparkles className="absolute -top-2 -right-2 text-yellow-400 animate-pulse" />
        </div>
        <p className="mt-6 text-2xl font-bold text-gray-700">Cô giáo đang viết truyện cho bé...</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="bg-white rounded-3xl p-10 shadow-xl max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">Bé muốn nghe kể chuyện gì?</h2>
        <div className="flex gap-2 mb-8">
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Ví dụ: Chú thỏ và con rùa..."
            className="flex-1 border-2 border-blue-100 rounded-2xl px-6 py-4 text-xl focus:border-blue-400 outline-none"
          />
          <button onClick={startStory} className="bg-blue-500 text-white p-4 rounded-2xl hover:bg-blue-600 transition-all shadow-lg">
             <BookOpen />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
           {suggestions.map(s => (
             <button key={s} onClick={() => { setTopic(s); }} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full font-medium hover:bg-blue-100">
               {s}
             </button>
           ))}
        </div>
      </div>
    );
  }

  const currentPart = story.parts[currentIndex];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
      <div className="bg-blue-500 text-white p-6 text-center">
        <h2 className="text-3xl font-bold">{story.title}</h2>
      </div>

      <div className="p-8 grid md:grid-cols-2 gap-8 items-center">
        <div className="relative aspect-square bg-gray-100 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center">
          {partLoading ? (
            <RefreshCw className="animate-spin text-blue-500" size={48} />
          ) : currentPart.imageUrl ? (
            <img src={currentPart.imageUrl} alt="Part" className="w-full h-full object-cover animate-fadeIn" />
          ) : (
            <p className="text-gray-400">Đang chuẩn bị hình ảnh...</p>
          )}
        </div>

        <div className="flex flex-col h-full justify-between">
          <div>
            <p className="text-2xl text-gray-800 leading-relaxed mb-8 font-medium">
              {currentPart.text}
            </p>
            <button
              onClick={handleRead}
              className="flex items-center gap-2 bg-orange-100 text-orange-600 px-6 py-3 rounded-2xl font-bold hover:bg-orange-200 transition-all"
            >
              <Volume2 /> Nghe kể chuyện
            </button>
          </div>

          <div className="flex justify-between items-center mt-8">
            <button
              disabled={currentIndex === 0}
              onClick={() => goToPart(currentIndex - 1)}
              className="p-3 bg-gray-100 rounded-full disabled:opacity-30"
            >
              <ChevronLeft size={32} />
            </button>
            <div className="flex gap-2">
              {story.parts.map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full ${i === currentIndex ? 'bg-blue-500' : 'bg-gray-200'}`} />
              ))}
            </div>
            <button
              disabled={currentIndex === story.parts.length - 1}
              onClick={() => goToPart(currentIndex + 1)}
              className="p-3 bg-blue-500 text-white rounded-full disabled:opacity-30 shadow-md"
            >
              <ChevronRight size={32} />
            </button>
          </div>
        </div>
      </div>
      
      {currentIndex === story.parts.length - 1 && (
        <div className="bg-gray-50 p-6 text-center border-t">
          <button onClick={() => setStory(null)} className="text-blue-500 font-bold hover:underline">
            Kể một câu chuyện khác nhé!
          </button>
        </div>
      )}
    </div>
  );
};
