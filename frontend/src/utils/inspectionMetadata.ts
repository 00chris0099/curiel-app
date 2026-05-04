import type {
    DepartmentInspectionMetadata,
    DepartmentServiceType,
    Inspection,
    InspectionType,
    User,
} from '../types';

const METADATA_START = '[department-inspection-meta]';
const METADATA_END = '[/department-inspection-meta]';

export const DEPARTMENT_SERVICE_OPTIONS: DepartmentServiceType[] = [
    'Entrega de departamento',
    'Pre-compra',
    'Post-remodelación',
    'General',
];

export const SERVICE_TYPE_TO_BACKEND_TYPE: Record<DepartmentServiceType, InspectionType> = {
    'Entrega de departamento': 'general',
    'Pre-compra': 'estructural',
    'Post-remodelación': 'integral',
    'General': 'general',
};

const FALLBACK_TYPE_LABELS: Record<InspectionType, string> = {
    estructural: 'Estructural',
    electrica: 'Eléctrica',
    hidraulica: 'Hidráulica',
    integral: 'Integral',
    seguridad: 'Seguridad',
    general: 'General',
};

export const buildInspectionProjectName = (metadata: Pick<DepartmentInspectionMetadata, 'propertyType' | 'apartmentNumber' | 'district' | 'buildingName'>) => {
    const pieces = [
        `${metadata.propertyType} ${metadata.apartmentNumber}`.trim(),
        metadata.district,
        metadata.buildingName?.trim(),
    ].filter(Boolean);

    return pieces.join(' - ');
};

export const buildInspectionAddress = (metadata: Pick<DepartmentInspectionMetadata, 'exactAddress' | 'buildingName' | 'arrivalReference'>) => {
    const segments = [metadata.exactAddress.trim()];

    if (metadata.buildingName?.trim()) {
        segments.push(metadata.buildingName.trim());
    }

    if (metadata.arrivalReference?.trim()) {
        segments.push(`Referencia: ${metadata.arrivalReference.trim()}`);
    }

    return segments.join(' | ');
};

export const buildDepartmentInspectionNotes = (metadata: DepartmentInspectionMetadata) => {
    return `${METADATA_START}\n${JSON.stringify(metadata)}\n${METADATA_END}`;
};

export const parseDepartmentInspectionNotes = (notes?: string) => {
    if (!notes) {
        return { metadata: null, plainNotes: '' };
    }

    const pattern = new RegExp(`${escapeRegExp(METADATA_START)}\\n([\\s\\S]*?)\\n${escapeRegExp(METADATA_END)}`);
    const match = notes.match(pattern);

    if (!match) {
        return {
            metadata: null,
            plainNotes: notes.trim(),
        };
    }

    try {
        const metadata = JSON.parse(match[1]) as DepartmentInspectionMetadata;
        const plainNotes = notes.replace(match[0], '').trim();

        return { metadata, plainNotes };
    } catch {
        return {
            metadata: null,
            plainNotes: notes.trim(),
        };
    }
};

export const getInspectionServiceLabel = (inspection: Pick<Inspection, 'inspectionType' | 'notes'>) => {
    const { metadata } = parseDepartmentInspectionNotes(inspection.notes);
    if (metadata?.serviceType) {
        return metadata.serviceType;
    }

    return FALLBACK_TYPE_LABELS[inspection.inspectionType] || inspection.inspectionType;
};

export const getInspectionLocationLabel = (inspection: Pick<Inspection, 'address' | 'city' | 'state' | 'notes'>) => {
    const { metadata } = parseDepartmentInspectionNotes(inspection.notes);
    if (metadata) {
        const segments = [metadata.district, metadata.exactAddress].filter(Boolean);
        return segments.join(' - ');
    }

    const segments = [inspection.state, inspection.city, inspection.address].filter(Boolean);
    return segments.join(' - ');
};

export const getInspectorName = (inspection: Pick<Inspection, 'inspector' | 'inspectorName' | 'inspectorId'>) => {
    const inspector = inspection.inspector as (User | undefined);

    return inspector?.fullName
        || inspector?.name
        || [inspector?.firstName, inspector?.lastName].filter(Boolean).join(' ')
        || inspection.inspectorName
        || (inspection.inspectorId ? 'Inspector asignado' : 'Sin inspector');
};

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
