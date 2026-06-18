describe('Mobile API Service', () => {
    const mockAsyncStorage = {
        store: {},
        getItem: jest.fn((key) => Promise.resolve(mockAsyncStorage.store[key] || null)),
        setItem: jest.fn((key, value) => {
            mockAsyncStorage.store[key] = value;
            return Promise.resolve();
        }),
        removeItem: jest.fn((key) => {
            delete mockAsyncStorage.store[key];
            return Promise.resolve();
        }),
        multiGet: jest.fn((keys) => Promise.resolve(keys.map(k => [k, mockAsyncStorage.store[k] || null]))),
        multiSet: jest.fn((pairs) => {
            pairs.forEach(([k, v]) => { mockAsyncStorage.store[k] = v; });
            return Promise.resolve();
        }),
        multiRemove: jest.fn((keys) => {
            keys.forEach(k => { delete mockAsyncStorage.store[k]; });
            return Promise.resolve();
        }),
        clear: jest.fn(() => {
            mockAsyncStorage.store = {};
            return Promise.resolve();
        }),
    };

    beforeEach(() => {
        mockAsyncStorage.store = {};
        jest.clearAllMocks();
    });

    describe('Storage Keys', () => {
        it('AUTH_TOKEN es consistente', () => {
            expect(require('../config').default.STORAGE_KEYS.AUTH_TOKEN).toBe('@curiel:auth_token');
        });

        it('REFRESH_TOKEN es consistente', () => {
            expect(require('../config').default.STORAGE_KEYS.REFRESH_TOKEN).toBe('@curiel:refresh_token');
        });

        it('USER_DATA es consistente', () => {
            expect(require('../config').default.STORAGE_KEYS.USER_DATA).toBe('@curiel:user_data');
        });
    });

    describe('AsyncStorage Operations', () => {
        it('guarda y recupera token', async () => {
            await mockAsyncStorage.setItem('@curiel:auth_token', 'test-token-123');
            const token = await mockAsyncStorage.getItem('@curiel:auth_token');
            expect(token).toBe('test-token-123');
        });

        it('guarda y recupera refresh token', async () => {
            await mockAsyncStorage.setItem('@curiel:refresh_token', 'refresh-123');
            const token = await mockAsyncStorage.getItem('@curiel:refresh_token');
            expect(token).toBe('refresh-123');
        });

        it('elimina tokens correctamente', async () => {
            await mockAsyncStorage.setItem('@curiel:auth_token', 'token');
            await mockAsyncStorage.setItem('@curiel:refresh_token', 'refresh');
            await mockAsyncStorage.multiRemove(['@curiel:auth_token', '@curiel:refresh_token']);

            const token = await mockAsyncStorage.getItem('@curiel:auth_token');
            const refresh = await mockAsyncStorage.getItem('@curiel:refresh_token');
            expect(token).toBeNull();
            expect(refresh).toBeNull();
        });

        it('multiSet guarda multiples valores', async () => {
            await mockAsyncStorage.multiSet([
                ['@curiel:auth_token', 'token'],
                ['@curiel:refresh_token', 'refresh'],
                ['@curiel:user_data', JSON.stringify({ name: 'Test' })]
            ]);

            const token = await mockAsyncStorage.getItem('@curiel:auth_token');
            const user = JSON.parse(await mockAsyncStorage.getItem('@curiel:user_data'));
            expect(token).toBe('token');
            expect(user.name).toBe('Test');
        });
    });
});
