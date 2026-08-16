import type {
    ContactChannel,
    DepartmentServiceType,
    InspectionPriority,
    LimaDistrict,
    PropertyCondition,
    PropertyType,
    ReviewPoint,
    YesNoOption,
} from '../../types';

export const contactChannelOptions: ContactChannel[] = ['WhatsApp', 'Llamada', 'Facebook', 'Referido', 'Otro'];
export const districtOptions: LimaDistrict[] = [
    'Miraflores',
    'San Isidro',
    'Santiago de Surco',
    'San Borja',
    'La Molina',
    'Jesús María',
    'Magdalena',
    'Pueblo Libre',
    'Lince',
    'Barranco',
    'Chorrillos',
    'San Miguel',
    'Cercado de Lima',
    'Otro',
];
export const propertyTypeOptions: PropertyType[] = ['Departamento', 'Dúplex', 'Penthouse'];
export const yesNoOptions: YesNoOption[] = ['Sí', 'No'];
export const propertyConditionOptions: PropertyCondition[] = [
    'Nuevo / entrega de constructora',
    'Usado',
    'En remodelación',
    'Remodelado recientemente',
];
export const reviewPointOptions: ReviewPoint[] = [
    'Humedad / filtraciones',
    'Instalaciones eléctricas',
    'Instalaciones sanitarias',
    'Pisos y acabados',
    'Puertas y ventanas',
    'Grietas o fisuras',
    'Cocina',
    'Baños',
    'Balcón / terraza',
    'Otro',
];
export const priorityOptions: InspectionPriority[] = ['Normal', 'Alta', 'Urgente'];

export type DepartmentInspectionFormState = {
    serviceType: DepartmentServiceType;
    scheduledDate: string;
    scheduledTime: string;
    clientFullName: string;
    clientPhone: string;
    clientEmail: string;
    contactChannel: ContactChannel;
    district: LimaDistrict | '';
    exactAddress: string;
    buildingName: string;
    arrivalReference: string;
    propertyType: PropertyType;
    apartmentNumber: string;
    propertyCondition: PropertyCondition;
    reviewPoints: ReviewPoint[];
    reviewPointOther: string;
    inspectorId: string;
    priority: InspectionPriority;
    observations: string;
    technicalReport: YesNoOption;
    squareMeters: string;
};

export const initialFormState: DepartmentInspectionFormState = {
    serviceType: 'Entrega de departamento',
    scheduledDate: '',
    scheduledTime: '',
    clientFullName: '',
    clientPhone: '',
    clientEmail: '',
    contactChannel: 'WhatsApp',
    district: '',
    exactAddress: '',
    buildingName: '',
    arrivalReference: '',
    propertyType: 'Departamento',
    apartmentNumber: '',
    propertyCondition: 'Nuevo / entrega de constructora',
    reviewPoints: [],
    reviewPointOther: '',
    inspectorId: '',
    priority: 'Normal',
    observations: '',
    technicalReport: 'Sí',
    squareMeters: '',
};
