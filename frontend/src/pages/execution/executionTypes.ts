import type {
    ExecutionAreaStatus,
    ExecutionPhotoType,
    ExecutionReportStatus,
    ObservationResolutionStatus,
    ObservationSeverity,
    ObservationType,
} from '../../types';

export type AreaFormState = {
    name: string;
    category: string;
    lengthM: string;
    widthM: string;
    ceilingHeightM: string;
    status: ExecutionAreaStatus;
    notes: string;
};

export type ObservationFormState = {
    title: string;
    description: string;
    severity: ObservationSeverity;
    type: ObservationType;
    recommendation: string;
    metricValue: string;
    metricUnit: string;
    status: ObservationResolutionStatus;
};

export type SummaryFormState = {
    generalConclusion: string;
    finalRecommendations: string;
    reportStatus: ExecutionReportStatus;
};

export type PhotoFormState = {
    type: ExecutionPhotoType;
    caption: string;
    file: File | null;
    observationId: string;
};

export const emptyAreaForm: AreaFormState = {
    name: '',
    category: 'interior',
    lengthM: '',
    widthM: '',
    ceilingHeightM: '',
    status: 'pendiente',
    notes: '',
};

export const emptyObservationForm: ObservationFormState = {
    title: '',
    description: '',
    severity: 'leve',
    type: 'acabados',
    recommendation: '',
    metricValue: '',
    metricUnit: '',
    status: 'pendiente',
};

export const emptySummaryForm: SummaryFormState = {
    generalConclusion: '',
    finalRecommendations: '',
    reportStatus: 'borrador',
};

export const emptyGeneralPhotoForm: PhotoFormState = {
    type: 'edificio',
    caption: '',
    file: null,
    observationId: '',
};

export const emptyAreaPhotoForm: PhotoFormState = {
    type: 'area',
    caption: '',
    file: null,
    observationId: '',
};
