import { describe, it, expect } from 'vitest';
import {
    inspectionStatusLabels,
    inspectionStatusBadgeClasses,
    getStatusReasonOptions,
    getAllowedStatusActions,
    buildStatusUpdatePayload,
    cancellationReasonOptions,
    rescheduleReasonOptions,
    correctionReasonOptions,
} from '../utils/inspectionStatus';
import type { User, Inspection } from '../types';

const makeUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-1',
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'inspector',
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
});

const makeInspection = (overrides: Partial<Inspection> = {}): Inspection => ({
    id: 'insp-1',
    projectName: 'Test',
    clientName: 'Client',
    address: 'Address',
    inspectionType: 'general',
    status: 'pendiente',
    scheduledDate: '2026-06-20',
    inspectorId: 'user-1',
    createdById: 'admin-1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
});

describe('inspectionStatusLabels', () => {
    it('tiene labels para todos los status', () => {
        expect(inspectionStatusLabels.pendiente).toBe('Pendiente');
        expect(inspectionStatusLabels.en_proceso).toBe('En proceso');
        expect(inspectionStatusLabels.lista_revision).toBe('Lista para revisión');
        expect(inspectionStatusLabels.finalizada).toBe('Finalizada');
        expect(inspectionStatusLabels.cancelada).toBe('Cancelada');
        expect(inspectionStatusLabels.reprogramada).toBe('Reprogramada');
    });
});

describe('inspectionStatusBadgeClasses', () => {
    it('tiene clases para todos los status', () => {
        expect(inspectionStatusBadgeClasses.pendiente).toBe('badge-warning');
        expect(inspectionStatusBadgeClasses.en_proceso).toBe('badge-info');
        expect(inspectionStatusBadgeClasses.finalizada).toBe('badge-success');
        expect(inspectionStatusBadgeClasses.cancelada).toBe('badge-danger');
    });
});

describe('getStatusReasonOptions', () => {
    it('retorna cancellationReasonOptions para cancelada', () => {
        expect(getStatusReasonOptions('pendiente', 'cancelada')).toBe(cancellationReasonOptions);
    });

    it('retorna rescheduleReasonOptions para reprogramada', () => {
        expect(getStatusReasonOptions('pendiente', 'reprogramada')).toBe(rescheduleReasonOptions);
    });

    it('retorna correctionReasonOptions para lista_revision a en_proceso', () => {
        expect(getStatusReasonOptions('lista_revision', 'en_proceso')).toBe(correctionReasonOptions);
    });

    it('retorna array vacio para transiciones sin razon', () => {
        expect(getStatusReasonOptions('pendiente', 'en_proceso')).toEqual([]);
    });
});

describe('getAllowedStatusActions', () => {
    it('retorna vacio si user es null', () => {
        expect(getAllowedStatusActions(makeInspection(), null)).toEqual([]);
    });

    it('retorna vacio si status es finalizada', () => {
        expect(getAllowedStatusActions(makeInspection({ status: 'finalizada' }), makeUser({ role: 'admin' }))).toEqual([]);
    });

    it('retorna vacio si status es cancelada', () => {
        expect(getAllowedStatusActions(makeInspection({ status: 'cancelada' }), makeUser({ role: 'admin' }))).toEqual([]);
    });

    it('admin ve reviewer actions en pendiente', () => {
        const actions = getAllowedStatusActions(makeInspection({ status: 'pendiente' }), makeUser({ role: 'admin' }));
        expect(actions.length).toBe(3); // en_proceso, cancelada, reprogramada
        expect(actions.some(a => a.status === 'en_proceso')).toBe(true);
        expect(actions.some(a => a.status === 'cancelada')).toBe(true);
        expect(actions.some(a => a.status === 'reprogramada')).toBe(true);
    });

    it('inspector asignado ve inspector actions en pendiente', () => {
        const actions = getAllowedStatusActions(
            makeInspection({ status: 'pendiente', inspectorId: 'user-1' }),
            makeUser({ id: 'user-1', role: 'inspector' })
        );
        expect(actions.length).toBe(1);
        expect(actions[0].status).toBe('en_proceso');
    });

    it('inspector no asignado no ve actions', () => {
        const actions = getAllowedStatusActions(
            makeInspection({ status: 'pendiente', inspectorId: 'other' }),
            makeUser({ id: 'user-1', role: 'inspector' })
        );
        expect(actions).toEqual([]);
    });

    it('admin ve finalizar en en_proceso', () => {
        const actions = getAllowedStatusActions(makeInspection({ status: 'en_proceso' }), makeUser({ role: 'admin' }));
        expect(actions.some(a => a.status === 'finalizada')).toBe(true);
    });

    it('admin ve devolver a correccion en lista_revision', () => {
        const actions = getAllowedStatusActions(makeInspection({ status: 'lista_revision' }), makeUser({ role: 'admin' }));
        expect(actions.some(a => a.status === 'en_proceso')).toBe(true);
    });
});

describe('buildStatusUpdatePayload', () => {
    it('agrega reasonLabel desde reasonCode', () => {
        const payload = buildStatusUpdatePayload(
            { status: 'cancelada', reasonCode: 'cliente_reprogramo' },
            'pendiente',
            'cancelada'
        );
        expect(payload.reasonLabel).toBe('Cliente reprogramó la visita');
    });

    it('mantiene reasonLabel existente si no hay match', () => {
        const payload = buildStatusUpdatePayload(
            { status: 'cancelada', reasonCode: 'unknown', reasonLabel: 'Custom' },
            'pendiente',
            'cancelada'
        );
        expect(payload.reasonLabel).toBe('Custom');
    });

    it('retorna razon vacia para transicion sin opciones', () => {
        const payload = buildStatusUpdatePayload(
            { status: 'en_proceso' },
            'pendiente',
            'en_proceso'
        );
        expect(payload.reasonLabel).toBeUndefined();
    });
});
