// 🎯 TIPOS GLOBALES DE LA APLICACIÓN
// Centralizar todos los tipos aquí evita dependencias circulares

// ============================================
// AUTH & USER TYPES
// ============================================

export type UserRole = 'admin' | 'arquitecto' | 'inspector';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName?: string;
    role: UserRole;
    roles?: UserRole[];
    phone?: string;
    isActive: boolean;
    isMasterAdmin?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateUserDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
}

export interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    phone?: string;
}

export interface UserStats {
    total: number;
    active: number;
    inactive: number;
    byRole: Array<{
        role: UserRole;
        count: number | string;
    }>;
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
export type InspectionType = 'estructural' | 'electrica' | 'hidraulica' | 'integral' | 'seguridad' | 'general';
export type DepartmentServiceType = 'Entrega de departamento' | 'Pre-compra' | 'Post-remodelación' | 'General';
export type ContactChannel = 'WhatsApp' | 'Llamada' | 'Facebook' | 'Referido' | 'Otro';
export type LimaDistrict =
    | 'Miraflores'
    | 'San Isidro'
    | 'Santiago de Surco'
    | 'San Borja'
    | 'La Molina'
    | 'Jesús María'
    | 'Magdalena'
    | 'Pueblo Libre'
    | 'Lince'
    | 'Barranco'
    | 'Chorrillos'
    | 'San Miguel'
    | 'Cercado de Lima'
    | 'Otro';
export type PropertyType = 'Departamento' | 'Dúplex' | 'Penthouse';
export type YesNoOption = 'Sí' | 'No';
export type PropertyCondition =
    | 'Nuevo / entrega de constructora'
    | 'Usado'
    | 'En remodelación'
    | 'Remodelado recientemente';
export type ReviewPoint =
    | 'Humedad / filtraciones'
    | 'Instalaciones eléctricas'
    | 'Instalaciones sanitarias'
    | 'Pisos y acabados'
    | 'Puertas y ventanas'
    | 'Grietas o fisuras'
    | 'Cocina'
    | 'Baños'
    | 'Balcón / terraza'
    | 'Otro';
export type InspectionPriority = 'Normal' | 'Alta' | 'Urgente';

export interface DepartmentInspectionMetadata {
    schema: 'department-inspection-v1';
    serviceType: DepartmentServiceType;
    scheduledTime: string;
    contactChannel: ContactChannel;
    district: LimaDistrict;
    exactAddress: string;
    buildingName?: string;
    arrivalReference?: string;
    propertyType: PropertyType;
    apartmentNumber: string;
    floor?: string;
    areaSquareMeters?: string;
    bedrooms?: string;
    bathrooms?: string;
    hasParking: YesNoOption;
    hasStorage: YesNoOption;
    hasCommonAreas: YesNoOption;
    propertyCondition: PropertyCondition;
    reviewPoints: ReviewPoint[];
    reviewPointOther?: string;
    priority: InspectionPriority;
    technicalReport: YesNoOption;
    observations?: string;
}

export interface Inspection {
    id: string;
    projectName: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    address: string;
    city?: string;
    state?: string;
    zipCode?: string;
    inspectionType: InspectionType;
    status: InspectionStatus;
    scheduledDate: string;
    completedDate?: string;
    inspectorId: string;
    createdById: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    inspector?: User;
    creator?: User;
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
    state?: string;
    zipCode?: string;
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

export interface ApiResponse<T = unknown> {
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
        totalPages: number;
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
