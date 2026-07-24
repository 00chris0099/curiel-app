import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { apiClient } from '../api/axios';
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
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
    const [isUploadingSignature, setIsUploadingSignature] = useState(false);
    const signatureInputRef = useRef<HTMLInputElement>(null);

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

    const loadSignature = useCallback(async () => {
        try {
            const response = await apiClient.get('/admin/settings/signature');
            setSignatureUrl(response.data.data?.url || null);
        } catch {
            // silently ignore — signature might not exist yet
        }
    }, []);

    useEffect(() => {
        loadSignature();
    }, [loadSignature]);

    const handleUploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'image/png') {
            toast.error('Solo se aceptan archivos PNG');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('El archivo no puede superar 2MB');
            return;
        }

        setIsUploadingSignature(true);
        try {
            const formData = new FormData();
            formData.append('signature', file);
            await apiClient.put('/admin/settings/signature', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Firma actualizada');
            loadSignature();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al subir firma'));
        } finally {
            setIsUploadingSignature(false);
            if (signatureInputRef.current) signatureInputRef.current.value = '';
        }
    };

    const handleDeleteSignature = async () => {
        if (!confirm('¿Eliminar la firma del administrador?')) return;
        try {
            await apiClient.delete('/admin/settings/signature');
            setSignatureUrl(null);
            toast.success('Firma eliminada');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al eliminar firma'));
        }
    };

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
        <div className="space-y-6 pb-10 animate-in fade-in duration-300">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Configuracion</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">API Keys, tokens y configuracion del administrador.</p>
                </div>
            </div>

            {/* Firma del administrador */}
            <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-3 mb-4">
                    <CustomIcon name="note-pencil" size="sm" tone="cream" />
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Firma del Administrador</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Imagen que aparece al final de los informes de inspeccion.</p>
                    </div>
                </div>

                {signatureUrl ? (
                    <div className="flex items-center gap-4">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                            <img src={signatureUrl} alt="Firma del admin" className="h-16 w-auto object-contain" />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => signatureInputRef.current?.click()}
                                disabled={isUploadingSignature}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            >
                                {isUploadingSignature ? 'Subiendo...' : 'Cambiar firma'}
                            </button>
                            <button
                                onClick={handleDeleteSignature}
                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => signatureInputRef.current?.click()}
                        disabled={isUploadingSignature}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 w-full justify-center"
                    >
                        <CustomIcon name="plus" size="xs" tone="mist" />
                        {isUploadingSignature ? 'Subiendo...' : 'Subir firma (PNG, max 2MB)'}
                    </button>
                )}

                <input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={handleUploadSignature}
                />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2">
                    <CustomIcon name="plus" size="xs" tone="white" />
                    Crear {typeConfig.title}
                </button>
            </div>

            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                {(['api_keys', 'secret_tokens'] as TabType[]).map((tab) => {
                    const cfg = getTypeConfig()[tab];
                    return (
                        <button key={tab} onClick={() => { setActiveTab(tab); setFilter('all'); }} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                            <CustomIcon name={cfg.icon} size="xs" variant="plain" tone={activeTab === tab ? 'blue' : 'mist'} />
                            {cfg.title}
                        </button>
                    );
                })}
            </div>

            <div className="flex items-center gap-2">
                {(['all', 'active', 'revoked'] as const).map((f) => (
                    <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? 'bg-[#17324a] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {f === 'all' ? 'Todas' : f === 'active' ? 'Activas' : 'Revocadas'}
                    </button>
                ))}
                <span className="ml-auto text-xs text-gray-400">{filteredKeys.length} resultado(s)</span>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex items-center gap-4"><div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" /><div className="flex-1 space-y-2"><div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" /><div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" /></div></div>
                        </div>
                    ))}
                </div>
            ) : filteredKeys.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No hay {typeConfig.title.toLowerCase()} {filter !== 'all' ? `(${filter})` : ''}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredKeys.map((apiKey) => (
                        <div key={apiKey.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${apiKey.isActive && !apiKey.isExpired ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                        <CustomIcon name={apiKey.type === 'secret_token' ? 'warning-circle' : 'database'} size="xs" tone={apiKey.isActive && !apiKey.isExpired ? 'sage' : 'mist'} variant="plain" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{apiKey.name}</h3>
                                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${apiKey.isActive && !apiKey.isExpired ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                {apiKey.isActive && !apiKey.isExpired ? 'Activa' : apiKey.isExpired ? 'Expirada' : 'Revocada'}
                                            </span>
                                        </div>
                                        {apiKey.description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{apiKey.description}</p>}
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                                            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-800">{apiKey.keyPreview}</code>
                                            {apiKey.expiresAt && <span>Expira: {new Date(apiKey.expiresAt).toLocaleDateString('es-PE')}</span>}
                                            <span>Creada: {new Date(apiKey.createdAt).toLocaleDateString('es-PE')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button onClick={() => handleCopy(apiKey.key)} className="rounded px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">Copiar</button>
                                    {apiKey.isActive && <button onClick={() => handleRevoke(apiKey.id)} className="rounded px-2 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20">Revocar</button>}
                                    <button onClick={() => handleDelete(apiKey.id)} className="rounded px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">Eliminar</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                    <div className="relative z-10 w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nueva {activeTab === 'secret_tokens' ? 'Secret Token' : 'API Key'}</h2>
                        <div className="mt-5 space-y-3">
                            <div><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Nombre</label><input type="text" className="input" placeholder="Ej: n8n-webhooks" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} autoFocus /></div>
                            <div><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Descripcion</label><input type="text" className="input" placeholder="Para que se usa" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                            <div><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Expira</label><input type="datetime-local" className="input" value={formData.expiresAt} onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })} /><p className="mt-1 text-[11px] text-gray-400">Vacio = nunca expira</p></div>
                        </div>
                        <div className="mt-5 flex gap-3">
                            <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">Cancelar</button>
                            <button onClick={handleCreate} className="btn btn-primary flex-1">Crear</button>
                        </div>
                    </div>
                </div>
            )}

            {newKeyData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setNewKeyData(null)} />
                    <div className="relative z-10 w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Key creada</h2>
                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                            Guarda esta key. No podras verla de nuevo.
                        </div>
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                            <code className="flex-1 break-all font-mono text-xs text-gray-800 dark:text-gray-200">{newKeyData.key}</code>
                            <button onClick={() => handleCopy(newKeyData.key)} className="shrink-0 rounded bg-[#17324a] px-3 py-1.5 text-xs font-semibold text-white">Copiar</button>
                        </div>
                        <button onClick={() => setNewKeyData(null)} className="btn btn-primary mt-5 w-full">Entendido</button>
                    </div>
                </div>
            )}
        </div>
    );
};
