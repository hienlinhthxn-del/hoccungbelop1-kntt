
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ExerciseItem, StoryResponse } from "../types";

// Hàm lấy API Key linh hoạt
const getApiKey = () => {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).process?.env?.API_KEY;
  if (envKey && envKey !== "PLACEHOLDER_API_KEY") return envKey;
  return (window as any).aistudio?.getApiKey?.() || "";
};

const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");
  return new GoogleGenAI({ apiKey });
};

const TEXT_MODEL = "gemini-2.0-flash";

export const generateSpeech = async (text: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: `Hãy đóng vai một cô giáo tiểu học Việt Nam ấm áp. Đọc nội dung này cho học sinh nghe: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Lỗi tạo giọng nói AI:", error);
    return null;
  }
};

export const generateExercises = async (category: string): Promise<ExerciseItem[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ role: 'user', parts: [{ text: `Tạo 5 bài tập tiếng Việt lớp 1 bộ sách Kết nối tri thức chủ đề ${category}. Trả về JSON array.` }] }],
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
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ role: 'user', parts: [{ text: `Viết truyện lớp 1 chủ đề ${topic}. Trả về JSON có title và parts (text, imagePrompt).` }] }],
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

export const chatWithGemini = async (message: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ role: 'user', parts: [{ text: message }] }],
    config: {
      systemInstruction: 'Bạn là một giáo viên tiểu học thân thiện cho học sinh lớp 1 tại Việt Nam.'
    } as any
  });
  return response.text;
};

export const analyzeMathImage = async (base64Image: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image } },
        { text: 'Giải toán lớp 1 trong ảnh.' }
      ]
    }]
  });
  return response.text;
};

export const generateLearningImage = async (prompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ role: 'user', parts: [{ text: `Vẽ tranh hoạt hình: ${prompt}` }] }]
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
    contents: [{ role: 'user', parts: [{ text: query }] }],
    config: {
      tools: [{ googleSearch: {} }] as any,
    },
  });
  return {
    text: response.text,
    sources: (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks || []
  };
};

export const generateLearningVideo = async (prompt: string, aspectRatio: '16:9' | '9:16') => {
  const ai = getAI();
  let operation = await ai.models.generateVideos({
    model: 'veo-1-fast-generate-preview',
    prompt,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
  });
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const apiKey = getApiKey();
  const videoResp = await fetch(`${downloadLink}&key=${apiKey}`);
  const blob = await videoResp.blob();
  return URL.createObjectURL(blob);
};
