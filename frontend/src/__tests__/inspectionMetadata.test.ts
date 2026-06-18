import { describe, it, expect } from 'vitest';
import {
    buildInspectionProjectName,
    buildInspectionAddress,
    buildDepartmentInspectionNotes,
    parseDepartmentInspectionNotes,
    getInspectionServiceLabel,
    getInspectionLocationLabel,
    getInspectorName,
    SERVICE_TYPE_TO_BACKEND_TYPE,
} from '../utils/inspectionMetadata';
import type { DepartmentInspectionMetadata } from '../types';

const sampleMetadata: DepartmentInspectionMetadata = {
    schema: 'department-inspection-v1',
    serviceType: 'Entrega de departamento',
    scheduledTime: '10:00',
    contactChannel: 'WhatsApp',
    district: 'Miraflores',
    exactAddress: 'Av. Larco 123',
    buildingName: 'Torre Miami',
    arrivalReference: 'Frente al parque',
    propertyType: 'Departamento',
    apartmentNumber: '501',
    floor: '5',
    bedrooms: '3',
    bathrooms: '2',
    hasParking: 'Sí',
    hasStorage: 'No',
    hasCommonAreas: 'Sí',
    propertyCondition: 'Nuevo / entrega de constructora',
    reviewPoints: ['Humedad / filtraciones'],
    priority: 'Normal',
    technicalReport: 'Sí',
};

describe('buildInspectionProjectName', () => {
    it('construye nombre con todos los campos', () => {
        const name = buildInspectionProjectName({
            propertyType: 'Departamento',
            apartmentNumber: '501',
            district: 'Miraflores',
            buildingName: 'Torre Miami',
        });
        expect(name).toBe('Departamento 501 - Miraflores - Torre Miami');
    });

    it('construye nombre sin buildingName', () => {
        const name = buildInspectionProjectName({
            propertyType: 'Departamento',
            apartmentNumber: '501',
            district: 'Miraflores',
        });
        expect(name).toBe('Departamento 501 - Miraflores');
    });
});

describe('buildInspectionAddress', () => {
    it('construye direccion con todos los campos', () => {
        const addr = buildInspectionAddress({
            exactAddress: 'Av. Larco 123',
            buildingName: 'Torre Miami',
            arrivalReference: 'Frente al parque',
        });
        expect(addr).toBe('Av. Larco 123 | Torre Miami | Referencia: Frente al parque');
    });

    it('construye direccion solo con address', () => {
        const addr = buildInspectionAddress({
            exactAddress: 'Av. Larco 123',
        });
        expect(addr).toBe('Av. Larco 123');
    });
});

describe('buildDepartmentInspectionNotes y parseDepartmentInspectionNotes', () => {
    it('round-trip: build y parse recuperan los mismos metadata', () => {
        const notes = buildDepartmentInspectionNotes(sampleMetadata);
        const { metadata, plainNotes } = parseDepartmentInspectionNotes(notes);

        expect(metadata).toEqual(sampleMetadata);
        expect(plainNotes).toBe('');
    });

    it('parse con notes sin metadata retorna null', () => {
        const { metadata, plainNotes } = parseDepartmentInspectionNotes('Notas simples');
        expect(metadata).toBeNull();
        expect(plainNotes).toBe('Notas simples');
    });

    it('parse con undefined retorna null', () => {
        const { metadata, plainNotes } = parseDepartmentInspectionNotes(undefined);
        expect(metadata).toBeNull();
        expect(plainNotes).toBe('');
    });

    it('parse con metadata corrupta retorna null', () => {
        const corrupted = '[department-inspection-meta]\n{invalid json\n[/department-inspection-meta]';
        const { metadata } = parseDepartmentInspectionNotes(corrupted);
        expect(metadata).toBeNull();
    });
});

describe('getInspectionServiceLabel', () => {
    it('retorna serviceType desde metadata', () => {
        const notes = buildDepartmentInspectionNotes(sampleMetadata);
        expect(getInspectionServiceLabel({ inspectionType: 'general', notes })).toBe('Entrega de departamento');
    });

    it('retorna fallback label sin metadata', () => {
        expect(getInspectionServiceLabel({ inspectionType: 'estructural', notes: undefined })).toBe('Estructural');
    });

    it('retorna fallback label con notes sin metadata', () => {
        expect(getInspectionServiceLabel({ inspectionType: 'electrica', notes: 'Notas simples' })).toBe('Eléctrica');
    });
});

describe('getInspectionLocationLabel', () => {
    it('retorna district y address desde metadata', () => {
        const notes = buildDepartmentInspectionNotes(sampleMetadata);
        expect(getInspectionLocationLabel({ address: 'Other', city: 'Lima', state: 'Lima', notes })).toBe('Miraflores - Av. Larco 123');
    });

    it('retorna fallback sin metadata', () => {
        expect(getInspectionLocationLabel({ address: 'Av. Larco', city: 'Lima', state: 'Lima', notes: undefined })).toBe('Lima - Lima - Av. Larco');
    });
});

describe('getInspectorName', () => {
    it('retorna fullName del inspector', () => {
        expect(getInspectorName({ inspector: { fullName: 'Juan Perez' } } as any)).toBe('Juan Perez');
    });

    it('retorna firstName + lastName si no hay fullName', () => {
        expect(getInspectorName({ inspector: { firstName: 'Juan', lastName: 'Perez' } } as any)).toBe('Juan Perez');
    });

    it('retorna inspectorName como fallback', () => {
        expect(getInspectorName({ inspectorName: 'Fallback Name' } as any)).toBe('Fallback Name');
    });

    it('retorna "Inspector asignado" si solo hay inspectorId', () => {
        expect(getInspectorName({ inspectorId: 'some-id' } as any)).toBe('Inspector asignado');
    });

    it('retorna "Sin inspector" si no hay nada', () => {
        expect(getInspectorName({} as any)).toBe('Sin inspector');
    });
});

describe('SERVICE_TYPE_TO_BACKEND_TYPE', () => {
    it('mapea correctamente', () => {
        expect(SERVICE_TYPE_TO_BACKEND_TYPE['Entrega de departamento']).toBe('general');
        expect(SERVICE_TYPE_TO_BACKEND_TYPE['Pre-compra']).toBe('estructural');
        expect(SERVICE_TYPE_TO_BACKEND_TYPE['Post-remodelación']).toBe('integral');
        expect(SERVICE_TYPE_TO_BACKEND_TYPE['General']).toBe('general');
    });
});
