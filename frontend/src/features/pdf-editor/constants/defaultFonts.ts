export interface FontDefinition {
  family: string;
  label: string;
  weights: string[];
  url?: string;
}

export const DEFAULT_FONTS: FontDefinition[] = [
  { family: 'Inter', label: 'Inter', weights: ['300', '400', '500', '600', '700'] },
  { family: 'Roboto', label: 'Roboto', weights: ['300', '400', '500', '700'] },
  { family: 'Open Sans', label: 'Open Sans', weights: ['300', '400', '600', '700'] },
  { family: 'Arial', label: 'Arial', weights: ['400', '700'] },
  { family: 'Helvetica', label: 'Helvetica', weights: ['400', '700'] },
  { family: 'Times New Roman', label: 'Times New Roman', weights: ['400', '700'] },
  { family: 'Courier New', label: 'Courier New', weights: ['400', '700'] },
];

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96];

export const FONT_WEIGHTS: Record<string, string[]> = {
  Inter: ['300', '400', '500', '600', '700'],
  Roboto: ['300', '400', '500', '700'],
  'Open Sans': ['300', '400', '600', '700'],
  Arial: ['400', '700'],
  Helvetica: ['400', '700'],
  'Times New Roman': ['400', '700'],
  'Courier New': ['400', '700'],
};
