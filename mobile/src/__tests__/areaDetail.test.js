import { areasRepo } from '../database/areas.repo';
import { observationsRepo } from '../database/observations.repo';
import { photosRepo } from '../database/photos.repo';

jest.mock('../database/schema', () => ({
    getDB: jest.fn(() => ({
        execAsync: jest.fn(),
        runAsync: jest.fn(),
        getFirstAsync: jest.fn(),
        getAllAsync: jest.fn()
    }))
}));

describe('AreaDetail dependencies', () => {
    it('areasRepo has expected exports', () => {
        expect(typeof areasRepo.upsert).toBe('function');
        expect(typeof areasRepo.getByInspection).toBe('function');
        expect(typeof areasRepo.getById).toBe('function');
        expect(typeof areasRepo.remove).toBe('function');
    });

    it('observationsRepo has expected exports', () => {
        expect(typeof observationsRepo.upsert).toBe('function');
        expect(typeof observationsRepo.getByInspection).toBe('function');
        expect(typeof observationsRepo.getByArea).toBe('function');
        expect(typeof observationsRepo.remove).toBe('function');
    });

    it('photosRepo has expected exports', () => {
        expect(typeof photosRepo.upsert).toBe('function');
        expect(typeof photosRepo.getByInspection).toBe('function');
        expect(typeof photosRepo.getPendingUpload).toBe('function');
    });
});
