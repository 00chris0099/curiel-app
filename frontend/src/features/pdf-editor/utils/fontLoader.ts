const loadedFonts = new Set<string>();

const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2';

const FONT_FAMILIES: Record<string, string[]> = {
  'Inter': ['300', '400', '500', '600', '700'],
  'Roboto': ['300', '400', '500', '700'],
  'Open Sans': ['300', '400', '600', '700'],
  'Montserrat': ['300', '400', '500', '600', '700'],
  'Source Sans 3': ['300', '400', '600', '700'],
};

export async function loadGoogleFont(family: string, weights: string[] = ['400', '700']): Promise<void> {
  if (loadedFonts.has(family)) return;

  const existingLink = document.querySelector(`link[href*="${family.replace(/ /g, '+')}"]`);
  if (existingLink) {
    loadedFonts.add(family);
    return;
  }

  const params = `family=${family.replace(/ /g, '+')}:wght@${weights.join(';')}`;
  const url = `${GOOGLE_FONTS_URL}?${params}&display=swap`;

  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => {
      loadedFonts.add(family);
      resolve();
    };
    link.onerror = () => reject(new Error(`Failed to load font: ${family}`));
    document.head.appendChild(link);
  });
}

export async function loadDefaultFonts(): Promise<void> {
  const promises = Object.entries(FONT_FAMILIES).map(([family, weights]) =>
    loadGoogleFont(family, weights).catch((err) => {
      console.warn(`Failed to load font ${family}:`, err);
    })
  );
  await Promise.allSettled(promises);
}

export function getFontFamilies(): Record<string, string[]> {
  return { ...FONT_FAMILIES };
}

export function isFontLoaded(family: string): boolean {
  return loadedFonts.has(family);
}

export function waitForFont(family: string, timeout = 3000): Promise<void> {
  return new Promise((resolve) => {
    if (loadedFonts.has(family)) {
      resolve();
      return;
    }

    const start = Date.now();
    const check = () => {
      if (loadedFonts.has(family) || Date.now() - start > timeout) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}
