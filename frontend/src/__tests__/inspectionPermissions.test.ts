import { describe, it, expect } from 'vitest';
import {
    isAdminOrArchitect,
    canCreateInspection,
    canManageUsers,
    isAssignedInspector,
    canAccessInspectionExecution,
    canManageExecutionContent,
    canSendExecutionToReview,
    canApproveInspectionReport,
    canGenerateInspectionReport,
} from '../utils/inspectionPermissions';
import type { User, Inspection } from '../types';

const makeUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-1',
    email: 'test@test.com',
    fullName: 'Test User',
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

describe('isAdminOrArchitect', () => {
    it('retorna true para masterAdmin', () => {
        expect(isAdminOrArchitect(makeUser({ isMasterAdmin: true }))).toBe(true);
    });

    it('retorna true para admin', () => {
        expect(isAdminOrArchitect(makeUser({ role: 'admin' }))).toBe(true);
    });

    it('retorna true para arquitecto', () => {
        expect(isAdminOrArchitect(makeUser({ role: 'arquitecto' }))).toBe(true);
    });

    it('retorna false para inspector', () => {
        expect(isAdminOrArchitect(makeUser({ role: 'inspector' }))).toBe(false);
    });

    it('retorna false para null', () => {
        expect(isAdminOrArchitect(null)).toBe(false);
    });

    it('retorna false para undefined', () => {
        expect(isAdminOrArchitect(undefined)).toBe(false);
    });
});

describe('canCreateInspection', () => {
    it('admin puede crear', () => {
        expect(canCreateInspection(makeUser({ role: 'admin' }))).toBe(true);
    });

    it('arquitecto puede crear', () => {
        expect(canCreateInspection(makeUser({ role: 'arquitecto' }))).toBe(true);
    });

    it('inspector no puede crear', () => {
        expect(canCreateInspection(makeUser({ role: 'inspector' }))).toBe(false);
    });
});

describe('canManageUsers', () => {
    it('admin puede gestionar', () => {
        expect(canManageUsers(makeUser({ role: 'admin' }))).toBe(true);
    });

    it('masterAdmin puede gestionar', () => {
        expect(canManageUsers(makeUser({ isMasterAdmin: true }))).toBe(true);
    });

    it('arquitecto no puede gestionar', () => {
        expect(canManageUsers(makeUser({ role: 'arquitecto' }))).toBe(false);
    });

    it('inspector no puede gestionar', () => {
        expect(canManageUsers(makeUser({ role: 'inspector' }))).toBe(false);
    });
});

describe('isAssignedInspector', () => {
    it('retorna true si es el inspector asignado', () => {
        const user = makeUser({ id: 'user-1', role: 'inspector' });
        const insp = makeInspection({ inspectorId: 'user-1' });
        expect(isAssignedInspector(insp, user)).toBe(true);
    });

    it('retorna false si es otro inspector', () => {
        const user = makeUser({ id: 'user-2', role: 'inspector' });
        const insp = makeInspection({ inspectorId: 'user-1' });
        expect(isAssignedInspector(insp, user)).toBe(false);
    });

    it('retorna false si no es inspector', () => {
        const user = makeUser({ id: 'user-1', role: 'admin' });
        const insp = makeInspection({ inspectorId: 'user-1' });
        expect(isAssignedInspector(insp, user)).toBe(false);
    });

    it('retorna false si inspection es null', () => {
        expect(isAssignedInspector(null, makeUser())).toBe(false);
    });
});

describe('canAccessInspectionExecution', () => {
    it('admin puede acceder', () => {
        expect(canAccessInspectionExecution(makeInspection(), makeUser({ role: 'admin' }))).toBe(true);
    });

    it('inspector asignado puede acceder', () => {
        const user = makeUser({ id: 'user-1', role: 'inspector' });
        expect(canAccessInspectionExecution(makeInspection({ inspectorId: 'user-1' }), user)).toBe(true);
    });

    it('inspector no asignado no puede acceder', () => {
        const user = makeUser({ id: 'user-2', role: 'inspector' });
        expect(canAccessInspectionExecution(makeInspection({ inspectorId: 'user-1' }), user)).toBe(false);
    });
});

describe('canManageExecutionContent', () => {
    it('admin puede gestionar', () => {
        expect(canManageExecutionContent(makeInspection(), makeUser({ role: 'admin' }))).toBe(true);
    });

    it('inspector asignado puede gestionar en estado pendiente', () => {
        const user = makeUser({ id: 'user-1', role: 'inspector' });
        expect(canManageExecutionContent(makeInspection({ inspectorId: 'user-1', status: 'pendiente' }), user)).toBe(true);
    });

    it('inspector asignado NO puede gestionar en lista_revision', () => {
        const user = makeUser({ id: 'user-1', role: 'inspector' });
        expect(canManageExecutionContent(makeInspection({ inspectorId: 'user-1', status: 'lista_revision' }), user)).toBe(false);
    });

    it('inspector asignado NO puede gestionar en finalizada', () => {
        const user = makeUser({ id: 'user-1', role: 'inspector' });
        expect(canManageExecutionContent(makeInspection({ inspectorId: 'user-1', status: 'finalizada' }), user)).toBe(false);
    });

    it('inspector asignado NO puede gestionar en cancelada', () => {
        const user = makeUser({ id: 'user-1', role: 'inspector' });
        expect(canManageExecutionContent(makeInspection({ inspectorId: 'user-1', status: 'cancelada' }), user)).toBe(false);
    });
});

describe('canSendExecutionToReview', () => {
    it('puede enviar en pendiente', () => {
        const user = makeUser({ id: 'user-1', role: 'inspector' });
        expect(canSendExecutionToReview(makeInspection({ inspectorId: 'user-1', status: 'pendiente' }), user)).toBe(true);
    });

    it('NO puede enviar en lista_revision', () => {
        const user = makeUser({ id: 'user-1', role: 'inspector' });
        expect(canSendExecutionToReview(makeInspection({ inspectorId: 'user-1', status: 'lista_revision' }), user)).toBe(false);
    });

    it('NO puede enviar en finalizada', () => {
        const user = makeUser({ id: 'user-1', role: 'inspector' });
        expect(canSendExecutionToReview(makeInspection({ inspectorId: 'user-1', status: 'finalizada' }), user)).toBe(false);
    });
});

describe('canApproveInspectionReport', () => {
    it('admin puede aprobar', () => {
        expect(canApproveInspectionReport(makeUser({ role: 'admin' }))).toBe(true);
    });

    it('arquitecto puede aprobar', () => {
        expect(canApproveInspectionReport(makeUser({ role: 'arquitecto' }))).toBe(true);
    });

    it('inspector no puede aprobar', () => {
        expect(canApproveInspectionReport(makeUser({ role: 'inspector' }))).toBe(false);
    });
});

describe('canGenerateInspectionReport', () => {
    it('admin siempre puede generar', () => {
        expect(canGenerateInspectionReport(makeInspection({ status: 'pendiente' }), makeUser({ role: 'admin' }))).toBe(true);
    });

    it('inspector asignado puede generar en lista_revision', () => {
        const user = makeUser({ id: 'user-1', role: 'inspector' });
        expect(canGenerateInspectionReport(makeInspection({ inspectorId: 'user-1', status: 'lista_revision' }), user)).toBe(true);
    });

    it('inspector asignado puede generar en finalizada', () => {
        const user = makeUser({ id: 'user-1', role: 'inspector' });
        expect(canGenerateInspectionReport(makeInspection({ inspectorId: 'user-1', status: 'finalizada' }), user)).toBe(true);
    });

    it('inspector asignado NO puede generar en pendiente', () => {
        const user = makeUser({ id: 'user-1', role: 'inspector' });
        expect(canGenerateInspectionReport(makeInspection({ inspectorId: 'user-1', status: 'pendiente' }), user)).toBe(false);
    });

    it('retorna false si inspection es null', () => {
        expect(canGenerateInspectionReport(null, makeUser())).toBe(false);
    });
});
