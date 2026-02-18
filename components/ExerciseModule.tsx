
import React, { useState, useEffect } from 'react';
import { generateExercises, generateLearningImage } from '../services/geminiService';
import { ExerciseItem } from '../types';
import { CheckCircle2, XCircle, RefreshCw, Trophy, Star } from 'lucide-react';

export const ExerciseModule: React.FC<{ category: string, onError?: (err: any) => void }> = ({ category, onError }) => {
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const loadExercises = async () => {
    setLoading(true);
    setCurrentIndex(0);
    setScore(0);
    try {
      const data = await generateExercises(category);
      setExercises(data);
      if (data.length > 0) {
        await loadTaskImage(data[0]);
      }
    } catch (e) {
      console.error(e);
      if (onError) onError(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskImage = async (task: ExerciseItem) => {
    setCurrentImage(null);
    if (task.promptForImage) {
      try {
        const img = await generateLearningImage(`Hoạt hình dễ thương cho bé lớp 1: ${task.promptForImage}`);
        setCurrentImage(img);
      } catch (e) {
        if (onError) onError(e);
      }
    }
  };

  useEffect(() => {
    loadExercises();
  }, [category]);

  const handleSelect = (option: string) => {
    if (isCorrect !== null) return;
    setSelectedOption(option);
    const correct = option === exercises[currentIndex].correctAnswer;
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);
  };

  const nextTask = async () => {
    const next = currentIndex + 1;
    if (next < exercises.length) {
      setCurrentIndex(next);
      setSelectedOption(null);
      setIsCorrect(null);
      setLoading(true);
      await loadTaskImage(exercises[next]);
      setLoading(false);
    } else {
      setCurrentIndex(exercises.length); // Show result
    }
  };

  if (loading && exercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="animate-spin text-blue-500 mb-4" size={48} />
        <p className="text-xl font-bold text-gray-700">Đang chuẩn bị bài tập cho bé...</p>
      </div>
    );
  }

  if (currentIndex >= exercises.length && exercises.length > 0) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center shadow-xl animate-fadeIn">
        <Trophy className="mx-auto text-yellow-500 mb-6" size={80} />
        <h2 className="text-3xl font-bold mb-4">Tuyệt vời! Bé đã hoàn thành!</h2>
        <p className="text-2xl text-gray-600 mb-8">Số sao bé đạt được: <span className="text-blue-500 font-bold">{score}/{exercises.length}</span> <Star className="inline text-yellow-400" fill="currentColor" /></p>
        <button onClick={loadExercises} className="bg-blue-500 text-white px-10 py-4 rounded-full font-bold text-xl hover:bg-blue-600 shadow-lg">Làm lại nhé!</button>
      </div>
    );
  }

  const task = exercises[currentIndex];

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden animate-fadeIn">
      <div className="bg-blue-500 p-4 flex justify-between items-center text-white font-bold">
        <span>Câu hỏi {currentIndex + 1} / {exercises.length}</span>
        <div className="flex gap-1">
           {Array.from({ length: exercises.length }).map((_, i) => (
             <div key={i} className={`w-3 h-3 rounded-full ${i <= currentIndex ? 'bg-white' : 'bg-blue-300'}`} />
           ))}
        </div>
      </div>
      
      <div className="p-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">{task.question}</h3>
        
        <div className="mb-8 flex justify-center">
          {loading ? (
             <div className="w-64 h-64 bg-gray-100 animate-pulse rounded-2xl flex items-center justify-center">
               <RefreshCw className="animate-spin text-gray-400" />
             </div>
          ) : currentImage ? (
            <img src={currentImage} alt="Task" className="w-64 h-64 object-cover rounded-2xl shadow-md" />
          ) : (
             <div className="w-64 h-64 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">Không có hình</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {task.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSelect(opt)}
              disabled={isCorrect !== null}
              className={`py-4 px-6 rounded-2xl font-bold text-xl transition-all border-2 
                ${selectedOption === opt 
                  ? (isCorrect ? 'bg-green-100 border-green-500 text-green-700' : 'bg-red-100 border-red-500 text-red-700')
                  : 'bg-white border-gray-200 hover:border-blue-400 text-gray-700'}`}
            >
              {opt}
            </button>
          ))}
        </div>

        {isCorrect !== null && (
          <div className="mt-8 flex flex-col items-center animate-bounce">
            {isCorrect ? (
              <div className="flex items-center gap-2 text-green-600 font-bold text-2xl">
                <CheckCircle2 /> Bé giỏi lắm! Đúng rồi!
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-500 font-bold text-2xl">
                <XCircle /> Ôi, chưa đúng rồi. Đáp án là: {task.correctAnswer}
              </div>
            )}
            <button onClick={nextTask} className="mt-6 bg-blue-500 text-white px-8 py-3 rounded-full font-bold shadow-md">Tiếp tục thôi!</button>
          </div>
        )}
      </div>
    </div>
  );
};
