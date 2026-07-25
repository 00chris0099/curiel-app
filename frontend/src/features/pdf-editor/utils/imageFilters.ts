import { filters } from 'fabric';

export interface ImageFilterConfig {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: boolean;
  sepia: boolean;
  invert: boolean;
}

export const DEFAULT_FILTER_CONFIG: ImageFilterConfig = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  blur: 0,
  grayscale: false,
  sepia: false,
  invert: false,
};

export function createFilters(config: ImageFilterConfig): unknown[] {
  const activeFilters: unknown[] = [];

  if (config.brightness !== 0) {
    activeFilters.push(new filters.Brightness({ brightness: config.brightness / 100 }));
  }

  if (config.contrast !== 0) {
    activeFilters.push(new filters.Contrast({ contrast: config.contrast / 100 }));
  }

  if (config.saturation !== 0) {
    activeFilters.push(new filters.Saturation({ saturation: config.saturation / 100 }));
  }

  if (config.blur > 0) {
    activeFilters.push(new filters.Blur({ blur: config.blur / 100 }));
  }

  if (config.grayscale) {
    activeFilters.push(new filters.Grayscale());
  }

  if (config.sepia) {
    activeFilters.push(new filters.Sepia());
  }

  if (config.invert) {
    activeFilters.push(new filters.Invert());
  }

  return activeFilters;
}

export function applyFilters(
  fabricImage: { filters: unknown[]; applyFilters: () => void },
  config: ImageFilterConfig
): void {
  fabricImage.filters = createFilters(config);
  fabricImage.applyFilters();
}

export function brightness(fabricImage: { filters: unknown[]; applyFilters: () => void }, value: number): void {
  applyFilters(fabricImage, { ...DEFAULT_FILTER_CONFIG, brightness: value });
}

export function contrast(fabricImage: { filters: unknown[]; applyFilters: () => void }, value: number): void {
  applyFilters(fabricImage, { ...DEFAULT_FILTER_CONFIG, contrast: value });
}

export function saturation(fabricImage: { filters: unknown[]; applyFilters: () => void }, value: number): void {
  applyFilters(fabricImage, { ...DEFAULT_FILTER_CONFIG, saturation: value });
}

export function blur(fabricImage: { filters: unknown[]; applyFilters: () => void }, value: number): void {
  applyFilters(fabricImage, { ...DEFAULT_FILTER_CONFIG, blur: value });
}

export function grayscale(fabricImage: { filters: unknown[]; applyFilters: () => void }): void {
  applyFilters(fabricImage, { ...DEFAULT_FILTER_CONFIG, grayscale: true });
}

export function sepia(fabricImage: { filters: unknown[]; applyFilters: () => void }): void {
  applyFilters(fabricImage, { ...DEFAULT_FILTER_CONFIG, sepia: true });
}

export function invert(fabricImage: { filters: unknown[]; applyFilters: () => void }): void {
  applyFilters(fabricImage, { ...DEFAULT_FILTER_CONFIG, invert: true });
}

export function resetFilters(fabricImage: { filters: unknown[]; applyFilters: () => void }): void {
  applyFilters(fabricImage, DEFAULT_FILTER_CONFIG);
}
