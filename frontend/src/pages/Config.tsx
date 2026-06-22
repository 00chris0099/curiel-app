import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon } from '../components/CustomIcon';
import apiKeyService, { type ApiKey } from '../services/apiKey.service';

type TabType = 'api_keys' | 'secret_tokens';

export const Config = () => {
    const [activeTab, setActiveTab] = useState<TabType>('api_keys');
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyData, setNewKeyData] = useState<{ key: string; name: string } | null>(null);
    const [formData, setFormData] = useState({ name: '', type: 'api_key', description: '', expiresAt: '' });
    const [filter, setFilter] = useState<'all' | 'active' | 'revoked'>('all');

    const loadKeys = useCallback(async () => {
        setIsLoading(true);
        try {
            const typeFilter = activeTab === 'secret_tokens' ? 'secret_token' : 'api_key';
            const response = await apiKeyService.getAll({ type: typeFilter });
            setKeys(response.data);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar API keys'));
        } finally {
            setIsLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        loadKeys();
    }, [loadKeys]);

    const filteredKeys = keys.filter((k) => {
        if (filter === 'active') return k.isActive && !k.isExpired;
        if (filter === 'revoked') return !k.isActive;
        return true;
    });

    const handleCreate = async () => {
        if (!formData.name.trim()) {
            toast.error('El nombre es requerido');
            return;
        }
        try {
            const type = activeTab === 'secret_tokens' ? 'secret_token' : 'api_key';
            const response = await apiKeyService.create({
                name: formData.name,
                type,
                description: formData.description || undefined,
                expiresAt: formData.expiresAt || undefined,
            });
            setNewKeyData({ key: response.data.key, name: response.data.name });
            setFormData({ name: '', type: 'api_key', description: '', expiresAt: '' });
            setShowCreateModal(false);
            loadKeys();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al crear API key'));
        }
    };

    const handleRevoke = async (id: string) => {
        if (!confirm('¿Revocar esta key? No podra usarse mas.')) return;
        try {
            await apiKeyService.revoke(id);
            toast.success('API key revocada');
            loadKeys();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al revocar'));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta key permanentemente?')) return;
        try {
            await apiKeyService.delete(id);
            toast.success('API key eliminada');
            loadKeys();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al eliminar'));
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copiado al portapapeles');
    };

    const getTypeConfig = () => ({
        api_keys: {
            title: 'API Keys',
            description: 'Tokens para autenticar aplicaciones externas contra el backend.',
            icon: 'database' as const,
            prefix: 'curiel_',
        },
        secret_tokens: {
            title: 'Secret Tokens',
            description: 'Secretos para validar webhooks de n8n y servicios internos.',
            icon: 'warning-circle' as const,
            prefix: 'sk_live_',
        },
    });

    const typeConfig = getTypeConfig()[activeTab];

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <section className="card overflow-hidden">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="section-eyebrow">Configuracion</p>
                        <h1 className="mt-2 font-display text-3xl text-slate-900 dark:text-slate-100">API Keys y Tokens</h1>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">
                            Gestiona los tokens de acceso para servicios externos, webhooks y automatizaciones.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary flex items-center gap-2 self-start"
                    >
                        <CustomIcon name="plus" size="xs" tone="white" variant="plain" />
                        Crear {typeConfig.title}
                    </button>
                </div>
            </section>

            {/* Tabs */}
            <div className="flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                {(['api_keys', 'secret_tokens'] as TabType[]).map((tab) => {
                    const cfg = getTypeConfig()[tab];
                    return (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setFilter('all'); }}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                                activeTab === tab
                                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                        >
                            <CustomIcon name={cfg.icon} size="xs" variant="plain" tone={activeTab === tab ? 'blue' : 'mist'} />
                            {cfg.title}
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                {(['all', 'active', 'revoked'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                            filter === f
                                ? 'bg-[#17324a] text-white dark:bg-primary-600'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                        }`}
                    >
                        {f === 'all' ? 'Todas' : f === 'active' ? 'Activas' : 'Revocadas'}
                    </button>
                ))}
                <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{filteredKeys.length} resultado(s)</span>
            </div>

            {/* Keys list */}
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="card animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                                    <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredKeys.length === 0 ? (
                <div className="card py-16 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <CustomIcon name={typeConfig.icon} size="md" tone="mist" variant="plain" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        No hay {typeConfig.title.toLowerCase()} {filter !== 'all' ? `(${filter})` : ''}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredKeys.map((apiKey) => (
                        <div key={apiKey.id} className="card group">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${apiKey.isActive && !apiKey.isExpired ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                        <CustomIcon
                                            name={apiKey.type === 'secret_token' ? 'warning-circle' : 'database'}
                                            size="sm"
                                            tone={apiKey.isActive && !apiKey.isExpired ? 'sage' : 'mist'}
                                            variant="plain"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{apiKey.name}</h3>
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                apiKey.isActive && !apiKey.isExpired
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                    : apiKey.isExpired
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                                {apiKey.isActive && !apiKey.isExpired ? 'Activa' : apiKey.isExpired ? 'Expirada' : 'Revocada'}
                                            </span>
                                        </div>
                                        {apiKey.description && (
                                            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 truncate">{apiKey.description}</p>
                                        )}
                                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                                            <code className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono dark:bg-slate-800">{apiKey.keyPreview}</code>
                                            {apiKey.expiresAt && (
                                                <span>Expira: {new Date(apiKey.expiresAt).toLocaleDateString('es-PE')}</span>
                                            )}
                                            {apiKey.lastUsedAt && (
                                                <span>Ultimo uso: {new Date(apiKey.lastUsedAt).toLocaleDateString('es-PE')}</span>
                                            )}
                                            <span>Creada: {new Date(apiKey.createdAt).toLocaleDateString('es-PE')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => handleCopy(apiKey.key)}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                        title="Copiar key completa"
                                    >
                                        Copiar
                                    </button>
                                    {apiKey.isActive && (
                                        <button
                                            onClick={() => handleRevoke(apiKey.id)}
                                            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                                        >
                                            Revocar
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(apiKey.id)}
                                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowCreateModal(false)} />
                    <div className="relative z-10 w-full max-w-md overflow-auto rounded-[28px] bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] dark:bg-slate-900">
                        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                            Nueva {activeTab === 'secret_tokens' ? 'Secret Token' : 'API Key'}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {typeConfig.description}
                        </p>

                        <div className="mt-6 space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Ej: n8n-webhooks, Backend externo"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Descripcion (opcional)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Para que se usa esta key"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Expira (opcional)</label>
                                <input
                                    type="datetime-local"
                                    className="input"
                                    value={formData.expiresAt}
                                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                />
                                <p className="mt-1 text-xs text-slate-400">Vacio = nunca expira</p>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">
                                Cancelar
                            </button>
                            <button onClick={handleCreate} className="btn btn-primary flex-1">
                                Crear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Key Display Modal */}
            {newKeyData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setNewKeyData(null)} />
                    <div className="relative z-10 w-full max-w-lg overflow-auto rounded-[28px] bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                                <CustomIcon name="check-circle" size="sm" tone="sage" variant="plain" />
                            </div>
                            <div>
                                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">Key creada</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{newKeyData.name}</p>
                            </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                Guarda esta key. No podras verla de nuevo.
                            </p>
                        </div>

                        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                            <code className="flex-1 break-all font-mono text-xs text-slate-800 dark:text-slate-200">{newKeyData.key}</code>
                            <button
                                onClick={() => handleCopy(newKeyData.key)}
                                className="shrink-0 rounded-xl bg-[#17324a] px-3 py-2 text-xs font-semibold text-white dark:bg-primary-600"
                            >
                                Copiar
                            </button>
                        </div>

                        <button
                            onClick={() => setNewKeyData(null)}
                            className="btn btn-primary mt-6 w-full"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
