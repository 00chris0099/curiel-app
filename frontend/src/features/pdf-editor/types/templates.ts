export interface PdfTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'inspeccion' | 'reporte' | 'custom';
  layoutJson: TemplateLayout;
  thumbnailUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateLayout {
  pages: TemplatePage[];
  globalStyles: TemplateGlobalStyles;
}

export interface TemplatePage {
  id: string;
  width: number;
  height: number;
  elements: TemplateElement[];
}

export interface TemplateElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'table' | 'field';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  styles: Record<string, unknown>;
  content?: string;
  placeholder?: string;
  isEditable: boolean;
}

export interface TemplateGlobalStyles {
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  headerText?: string;
  footerText?: string;
}
