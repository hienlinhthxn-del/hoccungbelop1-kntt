
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ExerciseItem, StoryResponse } from "../types";

// Hàm lấy API Key linh hoạt: Thử từ biến môi trường của Vite, sau đó thử từ window.aistudio
const getApiKey = () => {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).process?.env?.API_KEY;
  if (envKey && envKey !== "PLACEHOLDER_API_KEY") return envKey;

  // Nếu không có trong env, có thể đang chạy trong môi trường preview có sẵn key
  return (window as any).aistudio?.getApiKey?.() || "";
};

const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

// Model Constants - Sử dụng các model ổn định nhất hiện tại
const TEXT_MODEL = "gemini-2.0-flash";
const IMAGE_MODEL = "imagen-3"; // Hoặc gemini-2.0-flash với tool call nếu được hỗ trợ
const AUDIO_MODEL = "gemini-2.0-flash";
const LIVE_MODEL = "gemini-2.0-flash-exp"; // Cho tính năng trò chuyện trực tiếp

export const generateSpeech = async (text: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ parts: [{ text: `Hãy đóng vai một cô giáo tiểu học Việt Nam có giọng nói trẻ trung, ấm áp, nhẹ nhàng và phát âm cực kỳ chuẩn xác. Hãy đọc nội dung sau đây cho học sinh lớp 1 nghe: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }, // Giọng nữ cao, phù hợp vai cô giáo
          },
        },
      },
    });
    // Trả về dữ liệu base64 của âm thanh
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Lỗi tạo giọng nói AI:", error);
    return null;
  }
};

export const generateExercises = async (category: string): Promise<ExerciseItem[]> => {
  const ai = getAI();
  const prompt = `Tạo 5 bài tập tiếng Việt lớp 1 (bộ sách Kết nối tri thức) chủ đề ${category}. 
  Các loại: matching (nối từ-hình), fill_in (điền chữ cái), quiz (chọn đáp án). 
  Trả về JSON array. promptForImage là mô tả hình ảnh đơn giản cho bé.`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['matching', 'fill_in', 'quiz'] },
            question: { type: Type.STRING },
            correctAnswer: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            promptForImage: { type: Type.STRING }
          },
          required: ['id', 'type', 'question', 'correctAnswer', 'options', 'promptForImage']
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
};

export const generateStory = async (topic: string): Promise<StoryResponse> => {
  const ai = getAI();
  const prompt = `Viết một câu chuyện ngắn 3 phần cho bé lớp 1 về chủ đề ${topic}. 
  Sử dụng câu ngắn, đơn giản. Trả về JSON gồm title và mảng parts (text, imagePrompt). 
  imagePrompt nên tả chi tiết phong cách hoạt hình dễ thương.`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          parts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                imagePrompt: { type: Type.STRING }
              },
              required: ['text', 'imagePrompt']
            }
          }
        },
        required: ['title', 'parts']
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const chatWithGemini = async (message: string, history: any[] = []) => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: TEXT_MODEL,
    config: {
      systemInstruction: 'Bạn là một giáo viên tiểu học thân thiện cho học sinh lớp 1 tại Việt Nam. Sử dụng ngôn ngữ đơn giản, dễ hiểu, khích lệ bé.',
    },
  });
  const response = await chat.sendMessage({ message });
  return response.text;
};

export const analyzeMathImage = async (base64Image: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image } },
        { text: 'Hãy giải bài toán toán lớp 1 trong ảnh này. Giải thích từng bước thật đơn giản cho bé 6 tuổi hiểu.' }
      ]
    },
  });
  return response.text;
};

export const generateLearningImage = async (prompt: string, aspectRatio: string = "1:1", imageSize: string = "1K") => {
  const ai = getAI();
  // Sử dụng imagen-3 hoặc gemini-2.0-flash để tạo ảnh
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash', // Imagen 3 thường được gọi qua tool hoặc model ID cụ thể tùy vùng
    contents: { parts: [{ text: `Generate a cute children cartoon illustration: ${prompt}` }] },
    // Lưu ý: Tùy theo cấu hình API, có thể cần sử dụng tool call cho Imagen
  });

  for (const part of response.candidates?.[0].content.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const editImage = async (base64Image: string, prompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/png' } },
        { text: prompt }
      ]
    }
  });
  for (const part of response.candidates?.[0].content.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const searchGrounding = async (query: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  return {
    text: response.text,
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

export const generateLearningVideo = async (prompt: string, aspectRatio: '16:9' | '9:16') => {
  const ai = getAI();
  // Veo model ID chuẩn thường là veo-1 hoặc tương tự
  let operation = await ai.models.generateVideos({
    model: 'veo-1-fast-generate-preview',
    prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const apiKey = getApiKey();
  const videoResp = await fetch(`${downloadLink}&key=${apiKey}`);
  const blob = await videoResp.blob();
  return URL.createObjectURL(blob);
};
