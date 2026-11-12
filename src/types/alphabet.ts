export type LetterCategory = 'vowel' | 'consonant' | 'english';

export interface AlphabetItem {
  id: string;
  letter: string;
  name: string; // e.g., "প", "A"
  word: string; // e.g., "পাখি", "Apple (আপেল)"
  rhyme: string; // e.g., "পাখির গানে ঘুম ভাঙে", "A for Apple"
  category: LetterCategory;
  isPaToChand?: boolean; // Highlighted group: প to ঁ
  phoneticEn: string;
  colorScheme: {
    bgGradient: string;
    border: string;
    textLetter: string;
    accent: string;
  };
  sampleSvg: string; // Key of illustration or icon
  customImage?: string; // Optional generated high-res image
}

export type ViewTab = 'board' | 'flashcard' | 'tracing' | 'quiz';
