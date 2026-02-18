
import React, { useState, useEffect, useCallback } from 'react';
import { Book, Calculator, Palette, Mic, Search, Home, ChevronRight, Send, Camera, Sparkles, Video, Play, RefreshCw, Layers, Star, PenTool, BookOpen, LayoutGrid, CheckCircle, AlertCircle, Menu, X } from 'lucide-react';
import { AppView, ChatMessage, GroundingChunk, LessonContent } from './types';
import { chatWithGemini, generateSpeech, analyzeMathImage, generateLearningImage, searchGrounding, generateLearningVideo, editImage } from './services/geminiService';
import { playSpeech } from './components/AudioPlayer';
import { LiveTutor } from './components/LiveTutor';
import { ExerciseModule } from './components/ExerciseModule';
import { StoryModule } from './components/StoryModule';
import { LessonDetail } from './components/LessonDetail';
import { VIETNAMESE_LESSONS } from './services/lessonData';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageConfig, setImageConfig] = useState({ aspectRatio: "1:1", size: "1K" });
  const [hasApiKey, setHasApiKey] = useState(true);
  const [showKeyOverlay, setShowKeyOverlay] = useState(false);
  const [searchResult, setSearchResult] = useState<{ text: string, sources: GroundingChunk[] } | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentLesson, setCurrentLesson] = useState<LessonContent | null>(null);
  const [filterTab, setFilterTab] = useState<'t1' | 't2'>('t1');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleError = useCallback((err: any) => {
    console.error("API Error Captured:", err);
    // Chuẩn hóa lỗi sang string để tìm kiếm từ khóa cấm
    let errMsg = "";
    if (typeof err === 'string') {
      errMsg = err;
    } else if (err instanceof Error) {
      errMsg = err.message;
    } else {
      try {
        errMsg = JSON.stringify(err);
      } catch (e) {
        errMsg = String(err);
      }
    }

    if (
      errMsg.includes("403") ||
      errMsg.includes("PERMISSION_DENIED") ||
      errMsg.includes("The caller does not have permission") ||
      errMsg.includes("Requested entity was not found")
    ) {
      setShowKeyOverlay(true);
      setHasApiKey(false);
    }
  }, []);

  useEffect(() => {
    checkApiKeyStatus();
  }, [view]);

  const checkApiKeyStatus = async () => {
    // Thử lấy key từ các nguồn khác nhau
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    const studioKey = await (window as any).aistudio?.hasSelectedApiKey?.();

    const isKeyAvailable = (envKey && envKey !== "PLACEHOLDER_API_KEY") || studioKey;

    if (!isKeyAvailable && (view === AppView.CREATIVE || view === AppView.VOICE_TUTOR)) {
      setShowKeyOverlay(true);
      setHasApiKey(false);
    } else {
      setHasApiKey(true);
    }
  };

  const handleOpenKey = async () => {
    await (window as any).aistudio?.openSelectKey();
    setShowKeyOverlay(false);
    setHasApiKey(true);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    try {
      const reply = await chatWithGemini(inputText);
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
      const audio = await generateSpeech(reply);
      if (audio) playSpeech(audio);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMathImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setLoading(true);
      try {
        const solution = await analyzeMathImage(base64);
        setMessages(prev => [...prev, { role: 'user', text: 'Nhờ cô giải giúp bài toán này ạ.' }, { role: 'model', text: solution }]);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageGen = async () => {
    if (!imagePrompt) return;
    setLoading(true);
    try {
      const url = await generateLearningImage(imagePrompt, imageConfig.aspectRatio, imageConfig.size);
      setSelectedImage(url);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoGen = async (ratio: '16:9' | '9:16') => {
    if (!imagePrompt) return;
    setLoading(true);
    setVideoUrl(null);
    try {
      const url = await generateLearningVideo(imagePrompt, ratio);
      setVideoUrl(url);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!inputText) return;
    setLoading(true);
    try {
      const result = await searchGrounding(inputText);
      setSearchResult(result as any);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  if (showKeyOverlay) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md animate-fadeIn">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-black mb-4 text-gray-800">Cần Khóa API Phù Hợp</h2>
          <p className="text-gray-600 mb-6 font-medium leading-relaxed">
            Hệ thống phát hiện lỗi phân quyền (403). Để sử dụng các tính năng cao cấp như tạo hình ảnh, video hoặc trò chuyện giọng nói, bé cần chọn một API Key từ dự án có trả phí.
          </p>
          <div className="bg-blue-50 p-4 rounded-2xl mb-6 text-left border border-blue-100">
            <h4 className="font-bold text-blue-800 text-sm mb-1 uppercase">Lưu ý cho bố mẹ:</h4>
            <ul className="text-xs text-blue-600 space-y-1 font-medium list-disc ml-4">
              <li>Cần tài khoản Google Cloud có thiết lập Billing (Thanh toán).</li>
              <li>Sử dụng Gemini 3 Pro và Veo yêu cầu quyền truy cập từ dự án có trả phí.</li>
              <li><a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline font-bold">Xem tài liệu hướng dẫn</a></li>
            </ul>
          </div>
          <button onClick={handleOpenKey} className="w-full bg-blue-500 text-white py-4 rounded-2xl font-black hover:bg-blue-600 shadow-xl shadow-blue-100 transition-all active:scale-95">
            Chọn API Key của bạn
          </button>
          <button onClick={() => { setShowKeyOverlay(false); setView(AppView.DASHBOARD); }} className="mt-4 text-gray-400 font-bold hover:text-gray-600">Để sau</button>
        </div>
      </div>
    );
  }

  const filteredLessons = VIETNAMESE_LESSONS.filter(l => {
    if (filterTab === 't1') return l.id < 100;
    if (filterTab === 't2') return l.id >= 100;
    return true;
  });

  const renderHeader = () => (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView(AppView.DASHBOARD)}>
          <div className="bg-blue-500 p-2 rounded-xl text-white shadow-lg shadow-blue-100">
            <Book size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-800 leading-none">Học Cùng Bé</h1>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tight">KNTT</span>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <button onClick={() => setView(AppView.DASHBOARD)} className={`p-2 rounded-xl transition-all ${view === AppView.DASHBOARD ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}>
            <Home size={20} />
          </button>
          <button onClick={() => setView(AppView.VOICE_TUTOR)} className={`p-2 rounded-xl transition-all ${view === AppView.VOICE_TUTOR ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:bg-gray-100'}`}>
            <Mic size={20} />
          </button>
        </nav>
      </div>
    </header>
  );

  const renderDashboard = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-fadeIn pt-6">
      <div onClick={() => { setView(AppView.VIETNAMESE); setFilterTab('t1'); }} className="child-card bg-orange-100 p-8 rounded-[2.5rem] cursor-pointer border-b-8 border-orange-200 shadow-xl">
        <div className="bg-white w-16 h-16 rounded-3xl flex items-center justify-center mb-6 text-orange-500 shadow-sm">
          <Book size={32} />
        </div>
        <h3 className="text-3xl font-black text-gray-800">Tiếng Việt Tập 1</h3>
        <p className="text-gray-600 mt-3 font-medium text-lg">Luyện âm chữ và đánh vần căn bản (83 bài).</p>
        <div className="mt-6 flex items-center text-orange-600 font-bold gap-2">
          Học ngay <ChevronRight size={20} />
        </div>
      </div>

      <div onClick={() => { setView(AppView.VIETNAMESE); setFilterTab('t2'); }} className="child-card bg-blue-100 p-8 rounded-[2.5rem] cursor-pointer border-b-8 border-blue-200 shadow-xl">
        <div className="bg-white w-16 h-16 rounded-3xl flex items-center justify-center mb-6 text-blue-500 shadow-sm">
          <BookOpen size={32} />
        </div>
        <h3 className="text-3xl font-black text-gray-800">Tiếng Việt Tập 2</h3>
        <p className="text-gray-600 mt-3 font-medium text-lg">Đọc hiểu theo 10 chủ đề khám phá thế giới.</p>
        <div className="mt-6 flex items-center text-blue-600 font-bold gap-2">
          Học ngay <ChevronRight size={20} />
        </div>
      </div>

      <div onClick={() => setView(AppView.EXERCISES)} className="child-card bg-yellow-100 p-8 rounded-[2.5rem] cursor-pointer border-b-8 border-yellow-200 shadow-xl">
        <div className="bg-white w-16 h-16 rounded-3xl flex items-center justify-center mb-6 text-yellow-500 shadow-sm">
          <PenTool size={32} />
        </div>
        <h3 className="text-3xl font-black text-gray-800">Luyện Tập Vui</h3>
        <p className="text-gray-600 mt-3 font-medium text-lg">Nối hình, điền từ theo chuẩn SGK.</p>
        <div className="mt-6 flex items-center text-yellow-600 font-bold gap-2">
          Trải nghiệm <ChevronRight size={20} />
        </div>
      </div>

      <div onClick={() => setView(AppView.STORYTELLER)} className="child-card bg-pink-100 p-8 rounded-[2.5rem] cursor-pointer border-b-8 border-pink-200 shadow-xl">
        <div className="bg-white w-16 h-16 rounded-3xl flex items-center justify-center mb-6 text-pink-500 shadow-sm">
          <Sparkles size={32} />
        </div>
        <h3 className="text-3xl font-black text-gray-800">Rừng Truyện Kể</h3>
        <p className="text-gray-600 mt-3 font-medium text-lg">Nghe cô giáo AI kể những câu chuyện mới lạ.</p>
        <div className="mt-6 flex items-center text-pink-600 font-bold gap-2">
          Xem ngay <ChevronRight size={20} />
        </div>
      </div>

      <div onClick={() => setView(AppView.MATH)} className="child-card bg-emerald-100 p-8 rounded-[2.5rem] cursor-pointer border-b-8 border-emerald-200 shadow-xl">
        <div className="bg-white w-16 h-16 rounded-3xl flex items-center justify-center mb-6 text-emerald-500 shadow-sm">
          <Calculator size={32} />
        </div>
        <h3 className="text-3xl font-black text-gray-800">Toán Học</h3>
        <p className="text-gray-600 mt-3 font-medium text-lg">Giải bài tập cộng trừ bằng hình ảnh.</p>
        <div className="mt-6 flex items-center text-emerald-600 font-bold gap-2">
          Vào học <ChevronRight size={20} />
        </div>
      </div>

      <div onClick={() => setView(AppView.CREATIVE)} className="child-card bg-purple-100 p-8 rounded-[2.5rem] cursor-pointer border-b-8 border-purple-200 shadow-xl">
        <div className="bg-white w-16 h-16 rounded-3xl flex items-center justify-center mb-6 text-purple-500 shadow-sm">
          <Palette size={32} />
        </div>
        <h3 className="text-3xl font-black text-gray-800">Góc Sáng Tạo</h3>
        <p className="text-gray-600 mt-3 font-medium text-lg">Vẽ ảnh và tạo phim hoạt hình cho riêng bé.</p>
        <div className="mt-6 flex items-center text-purple-600 font-bold gap-2">
          Sáng tạo <ChevronRight size={20} />
        </div>
      </div>
    </div>
  );

  const renderVietnameseView = () => (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar navigation */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-80 bg-white border-r transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b bg-orange-50/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-orange-600 flex items-center gap-2">
                <LayoutGrid size={20} /> Danh sách bài học
              </h3>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-gray-400">
                <X size={20} />
              </button>
            </div>
            <div className="flex bg-white rounded-xl p-1 shadow-sm border border-orange-100">
              <button
                onClick={() => setFilterTab('t1')}
                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${filterTab === 't1' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-orange-400'}`}
              >
                TẬP 1
              </button>
              <button
                onClick={() => setFilterTab('t2')}
                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${filterTab === 't2' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-blue-400'}`}
              >
                TẬP 2
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {filteredLessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => {
                  setCurrentLesson(lesson);
                  setView(AppView.LESSON_DETAIL);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`w-full text-left p-3 rounded-2xl transition-all border-2 flex items-center gap-3 ${currentLesson?.id === lesson.id ? (filterTab === 't1' ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-100' : 'bg-blue-50 border-blue-200 ring-2 ring-blue-100') : 'bg-white border-transparent hover:bg-gray-50'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-xs ${currentLesson?.id === lesson.id ? (filterTab === 't1' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white') : 'bg-gray-100 text-gray-400'}`}>
                  {lesson.id >= 100 ? (lesson.id - 100) : lesson.id}
                </div>
                <div className="overflow-hidden">
                  <p className={`font-bold text-sm truncate ${currentLesson?.id === lesson.id ? (filterTab === 't1' ? 'text-orange-700' : 'text-blue-700') : 'text-gray-700'}`}>
                    {lesson.title.split(': ')[1] || lesson.title}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium">{lesson.letters.join(', ')}</p>
                </div>
                {currentLesson?.id === lesson.id && <CheckCircle size={16} className={filterTab === 't1' ? 'text-orange-500 ml-auto' : 'text-blue-500 ml-auto'} />}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 relative overflow-y-auto p-4 md:p-8">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className={`md:hidden fixed bottom-6 left-6 z-50 bg-white p-4 rounded-full shadow-2xl border-2 border-orange-200 text-orange-500 transition-transform ${isSidebarOpen ? 'scale-0' : 'scale-100'}`}
        >
          <Menu size={24} />
        </button>

        {view === AppView.VIETNAMESE && !currentLesson && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto animate-fadeIn">
            <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl ${filterTab === 't1' ? 'bg-orange-100 text-orange-500' : 'bg-blue-100 text-blue-500'}`}>
              <Book size={64} />
            </div>
            <h2 className="text-4xl font-black text-gray-800 mb-4">
              Chào mừng bé đến với {filterTab === 't1' ? 'Tiếng Việt Tập 1' : 'Tiếng Việt Tập 2'}!
            </h2>
            <p className="text-xl text-gray-500 font-medium mb-10 leading-relaxed">
              {filterTab === 't1'
                ? 'Tại đây bé sẽ được học cách phát âm các chữ cái, đánh vần các từ đơn giản và xem những hình ảnh minh họa tuyệt đẹp.'
                : 'Tập 2 sẽ đưa bé đi khám phá những câu chuyện thú vị về tình bạn, gia đình và thế giới kì thú quanh ta.'}
            </p>
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-gray-200">
                <p className="font-black text-gray-400 text-xs uppercase tracking-widest mb-2">Số bài học</p>
                <p className="text-3xl font-black text-gray-800">{filteredLessons.length}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-gray-200">
                <p className="font-black text-gray-400 text-xs uppercase tracking-widest mb-2">Hoàn thành</p>
                <p className="text-3xl font-black text-gray-800">0%</p>
              </div>
            </div>
            <p className="mt-12 text-blue-500 font-black animate-bounce">← Bé hãy chọn một bài học ở thanh bên trái để bắt đầu nhé!</p>
          </div>
        )}

        {currentLesson && (
          <div className="max-w-4xl mx-auto pb-20">
            <LessonDetail lesson={currentLesson} onBack={() => setCurrentLesson(null)} onError={handleError} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {renderHeader()}

      <main className={view === AppView.VIETNAMESE || view === AppView.LESSON_DETAIL ? "" : "max-w-7xl mx-auto px-4 py-6"}>
        {view !== AppView.DASHBOARD && view !== AppView.VIETNAMESE && view !== AppView.LESSON_DETAIL && (
          <div className="mb-6 flex justify-between items-center">
            <button onClick={() => setView(AppView.DASHBOARD)} className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-all font-black text-sm bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
              <ChevronRight className="rotate-180" size={16} /> Quay lại
            </button>
          </div>
        )}

        {view === AppView.DASHBOARD && renderDashboard()}
        {(view === AppView.VIETNAMESE || view === AppView.LESSON_DETAIL) && renderVietnameseView()}

        {view === AppView.MATH && <div className="max-w-4xl mx-auto"><div className="bg-white rounded-[2.5rem] shadow-xl p-10 border-4 border-emerald-50">
          <h2 className="text-3xl font-black mb-6 flex items-center gap-3 text-gray-800">
            <Calculator className="text-emerald-500" size={40} /> Giải Toán Thông Minh
          </h2>
          <p className="text-gray-500 mb-8 font-medium text-xl">Bé chụp ảnh bài toán cộng trừ lớp 1 để cô giải giúp nhé!</p>
          <div className="flex flex-col items-center gap-6 py-20 border-4 border-dashed rounded-[3rem] border-emerald-100 bg-emerald-50/30">
            <label className="cursor-pointer bg-emerald-500 text-white px-12 py-5 rounded-[2rem] font-black text-xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-200 flex items-center gap-3">
              <Camera size={28} /> Tải ảnh bài toán
              <input type="file" className="hidden" accept="image/*" onChange={handleMathImageUpload} />
            </label>
            <p className="text-emerald-300 font-bold italic">Hỗ trợ các phép tính trong phạm vi 10, 20...</p>
          </div>
          {messages.length > 0 && (
            <div className="mt-12 space-y-6 animate-slideUp">
              {messages.filter(m => m.role === 'model').map((m, i) => (
                <div key={i} className="bg-emerald-50 p-8 rounded-[2rem] border-2 border-emerald-100 whitespace-pre-wrap text-xl font-medium leading-relaxed text-gray-800 shadow-sm">{m.text}</div>
              ))}
            </div>
          )}
        </div></div>}

        {view === AppView.CREATIVE && (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="bg-white rounded-[2.5rem] shadow-xl p-10 border-4 border-purple-50">
              <h2 className="text-3xl font-black mb-8 flex items-center gap-3 text-gray-800">
                <Palette className="text-purple-500" size={40} /> Họa Sĩ Nhí & Nhà Làm Phim
              </h2>
              <div className="grid md:grid-cols-3 gap-10">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Mô tả ý tưởng của bé</label>
                    <textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="Ví dụ: Một phi thuyền bay qua rừng cây kẹo mút..." className="w-full h-40 border-4 border-purple-50 rounded-[2rem] p-6 focus:outline-none focus:ring-4 focus:ring-purple-200 text-lg font-medium transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleImageGen} disabled={loading} className="bg-purple-500 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-100 hover:scale-105 transition-transform">
                      {loading ? <RefreshCw className="animate-spin" /> : <Sparkles size={20} />} Vẽ ảnh
                    </button>
                    <button onClick={() => handleVideoGen('16:9')} disabled={loading} className="bg-red-500 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-100 hover:scale-105 transition-transform">
                      {loading ? <RefreshCw className="animate-spin" /> : <Video size={20} />} Tạo phim
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2 bg-gray-50 rounded-[3rem] min-h-[500px] flex items-center justify-center relative border-4 border-dashed border-gray-200 overflow-hidden">
                  {selectedImage && !videoUrl && <img src={selectedImage} alt="Generated" className="max-h-full w-full object-contain shadow-2xl" />}
                  {videoUrl && <video src={videoUrl} controls className="w-full h-full object-cover shadow-2xl" />}
                  {!selectedImage && !videoUrl && !loading && (
                    <div className="text-center p-10">
                      <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner text-gray-200">
                        <Sparkles size={48} />
                      </div>
                      <p className="text-gray-400 text-xl font-bold">Hãy mô tả điều bé muốn thấy!</p>
                    </div>
                  )}
                  {loading && <div className="text-center bg-white/80 absolute inset-0 flex flex-col items-center justify-center z-10">
                    <div className="w-16 h-16 border-8 border-purple-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <p className="text-purple-600 font-black text-2xl animate-pulse">Cô đang sáng tạo phép màu...</p>
                  </div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === AppView.SCIENCE_SEARCH && (
          <div className="max-w-4xl mx-auto"><div className="bg-white rounded-[2.5rem] shadow-xl p-10 border-4 border-green-50">
            <h2 className="text-3xl font-black mb-6 flex items-center gap-3 text-gray-800"><Search className="text-green-500" size={40} /> Khám Phá Thế Giới</h2>
            <p className="text-gray-500 mb-8 font-medium text-xl">Bé thắc mắc điều gì? Hãy hỏi cô giáo nhé!</p>
            <div className="flex gap-4 mb-10">
              <input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Ví dụ: Gấu trúc ăn gì?" className="flex-1 border-4 border-green-50 rounded-[2rem] px-8 py-5 focus:outline-none focus:ring-4 focus:ring-green-100 text-xl font-medium shadow-sm transition-all" />
              <button onClick={handleSearch} disabled={loading} className="bg-green-500 text-white px-10 rounded-[2rem] font-black text-xl hover:bg-green-600 shadow-xl transition-transform">{loading ? <RefreshCw className="animate-spin" /> : 'Tra cứu'}</button>
            </div>
            {searchResult && (
              <div className="bg-green-50/50 p-10 rounded-[2.5rem] border-2 border-green-100 shadow-sm animate-fadeIn">
                <p className="text-gray-800 text-2xl leading-relaxed font-medium whitespace-pre-wrap">{searchResult.text}</p>
                {searchResult.sources.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-green-200">
                    <h4 className="text-xs font-black text-green-700 mb-4 uppercase tracking-widest">Nguồn học tập cho bé:</h4>
                    <div className="flex flex-wrap gap-3">
                      {searchResult.sources.map((s, i) => s.web?.uri && (
                        <a key={i} href={s.web.uri} target="_blank" className="text-xs bg-white text-blue-600 px-4 py-2 rounded-xl font-bold border-2 border-blue-50 hover:border-blue-200 transition-all">{s.web.title || 'Tìm hiểu thêm'}</a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div></div>
        )}

        {view === AppView.VOICE_TUTOR && <div className="max-w-3xl mx-auto pt-10"><LiveTutor /></div>}
        {view === AppView.EXERCISES && <div className="pt-10"><ExerciseModule category="Tiếng Việt Lớp 1" onError={handleError} /></div>}
        {view === AppView.STORYTELLER && <div className="pt-10"><StoryModule onError={handleError} /></div>}
      </main>

      {(view === AppView.DASHBOARD) && (
        <button
          onClick={() => setView(AppView.VOICE_TUTOR)}
          className="fixed bottom-8 right-8 bg-green-500 text-white p-6 rounded-[2rem] shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-3 z-50 border-4 border-white"
        >
          <Mic size={32} /> <span className="font-black text-xl hidden md:inline">Trò chuyện với Cô</span>
        </button>
      )}
    </div>
  );
};

export default App;
