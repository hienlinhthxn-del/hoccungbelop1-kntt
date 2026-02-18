
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  VIETNAMESE = 'VIETNAMESE',
  MATH = 'MATH',
  CREATIVE = 'CREATIVE',
  VOICE_TUTOR = 'VOICE_TUTOR',
  SCIENCE_SEARCH = 'SCIENCE_SEARCH',
  EXERCISES = 'EXERCISES',
  STORYTELLER = 'STORYTELLER',
  LESSON_DETAIL = 'LESSON_DETAIL'
}

// Updated GroundingChunk to match SDK types where uri and title are optional
export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string;
}

export interface ExerciseItem {
  id: string;
  type: 'matching' | 'fill_in' | 'quiz';
  question: string;
  correctAnswer: string;
  options: string[];
  imageUrl?: string;
  promptForImage?: string;
}

export interface StoryPart {
  text: string;
  imagePrompt: string;
  imageUrl?: string;
}

export interface StoryResponse {
  title: string;
  parts: StoryPart[];
}

export interface LessonContent {
  id: number;
  title: string;
  letters: string[];
  recognitionSentence: string;
  vocabulary: string[];
  readingText?: string;
  speakingTopic?: string;
  imagePrompt: string;
}
