import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface PdfTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  layoutJson: Record<string, unknown>;
  thumbnailUrl?: string;
  createdBy: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PdfVersion {
  id: string;
  inspectionId: string;
  versionNumber: number;
  snapshotJson: Record<string, unknown>;
  createdBy: string;
  description?: string;
  createdAt: string;
}

export interface PdfDraft {
  id: string;
  inspectionId: string;
  snapshotJson: Record<string, unknown>;
  savedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const pdfTemplateService = {
  async getAll(category?: string, search?: string): Promise<PaginatedResponse<PdfTemplate>> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    const res = await axios.get(`${API_BASE}/api/v1/pdf-templates?${params}`, {
      headers: getAuthHeaders()
    });
    return res.data;
  },

  async getById(id: string): Promise<PdfTemplate> {
    const res = await axios.get(`${API_BASE}/api/v1/pdf-templates/${id}`, {
      headers: getAuthHeaders()
    });
    return res.data.data.template;
  },

  async create(data: Omit<PdfTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<PdfTemplate> {
    const res = await axios.post(`${API_BASE}/api/v1/pdf-templates`, data, {
      headers: getAuthHeaders()
    });
    return res.data.data.template;
  },

  async update(id: string, data: Partial<PdfTemplate>): Promise<PdfTemplate> {
    const res = await axios.put(`${API_BASE}/api/v1/pdf-templates/${id}`, data, {
      headers: getAuthHeaders()
    });
    return res.data.data.template;
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`${API_BASE}/api/v1/pdf-templates/${id}`, {
      headers: getAuthHeaders()
    });
  }
};

export const pdfDraftService = {
  async getDraft(inspectionId: string): Promise<PdfDraft | null> {
    const res = await axios.get(`${API_BASE}/api/v1/inspections/${inspectionId}/pdf-draft`, {
      headers: getAuthHeaders()
    });
    return res.data.data.draft;
  },

  async saveDraft(inspectionId: string, snapshotJson: Record<string, unknown>): Promise<PdfDraft> {
    const res = await axios.post(`${API_BASE}/api/v1/inspections/${inspectionId}/pdf-draft`,
      { snapshotJson },
      { headers: getAuthHeaders() }
    );
    return res.data.data.draft;
  }
};

export const pdfVersionService = {
  async getVersions(inspectionId: string): Promise<PdfVersion[]> {
    const res = await axios.get(`${API_BASE}/api/v1/inspections/${inspectionId}/pdf-versions`, {
      headers: getAuthHeaders()
    });
    return res.data.data.versions;
  },

  async createVersion(inspectionId: string, snapshotJson: Record<string, unknown>, description?: string): Promise<PdfVersion> {
    const res = await axios.post(`${API_BASE}/api/v1/inspections/${inspectionId}/pdf-versions`,
      { snapshotJson, description },
      { headers: getAuthHeaders() }
    );
    return res.data.data.version;
  },

  async restoreVersion(inspectionId: string, versionNumber: number): Promise<Record<string, unknown>> {
    const res = await axios.post(
      `${API_BASE}/api/v1/inspections/${inspectionId}/pdf-versions/${versionNumber}/restore`,
      {},
      { headers: getAuthHeaders() }
    );
    return res.data.data.snapshot;
  }
};
