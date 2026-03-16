// 🎯 TIPOS GLOBALES DE LA APLICACIÓN
// Centralizar todos los tipos aquí evita dependencias circulares

// ============================================
// AUTH & USER TYPES
// ============================================

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'arquitecto' | 'inspector';
    phone?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        user: User;
        token: string;
    };
}

export interface ProfileResponse {
    success: boolean;
    data: User;
}

// ============================================
// INSPECTION TYPES
// ============================================

export type InspectionStatus = 'pendiente' | 'en_proceso' | 'finalizada' | 'cancelada';
export type InspectionType = 'estructural' | 'electrica' | 'hidraulica' | 'integral';

export interface Inspection {
    id: string;
    projectName: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    address: string;
    city?: string;
    inspectionType: InspectionType;
    status: InspectionStatus;
    scheduledDate: string;
    completedDate?: string;
    inspectorId: string;
    createdBy: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    inspector?: User;
}

export interface InspectionStats {
    total: number;
    pendiente: number;
    en_proceso: number;
    finalizada: number;
    cancelada: number;
}

export interface CreateInspectionDto {
    projectName: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    address: string;
    city?: string;
    inspectionType: InspectionType;
    scheduledDate: string;
    inspectorId: string;
    notes?: string;
}

export interface UpdateInspectionDto extends Partial<CreateInspectionDto> {
    status?: InspectionStatus;
    completedDate?: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: {
        message: string;
        code?: string;
    };
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// ============================================
// FILTER & QUERY TYPES  
// ============================================

export interface InspectionFilters {
    status?: InspectionStatus;
    inspectionType?: InspectionType;
    inspectorId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
}
