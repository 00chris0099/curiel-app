import { memo, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import { CustomIcon } from '../../components/CustomIcon';
import type { InspectionExecutionData } from '../../types';
import type { OfflineSyncItem } from '../../utils/offlineDb';

type ModuleEdificioProps = {
    photos: InspectionExecutionData['photos'];
    busyAction: string | null;
    canEdit: boolean;
    getEntitySyncState: (entityType: OfflineSyncItem['entityType'], entityId: string) => 'pending' | 'failed' | 'synced';
    onUploadPhoto: (event: FormEvent<HTMLFormElement>, type: 'edificio' | 'plano', caption: string, file: File | null) => void;
    onDeletePhoto: (photoId: string) => void;
};

export const ModuleEdificio = memo(({
    photos,
    busyAction,
    canEdit,
    getEntitySyncState,
    onUploadPhoto,
    onDeletePhoto,
}: ModuleEdificioProps) => {
    const [caption, setCaption] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const edificioPhotos = photos.filter((p) => p.type === 'edificio');
    const mainPhoto = edificioPhotos[0] || null;

    const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Fake form event for parent compatibility
        const fakeEvent = { preventDefault: () => {} } as FormEvent<HTMLFormElement>;
        onUploadPhoto(fakeEvent, 'edificio', caption, file);
        setCaption('');
        if (e.target) e.target.value = '';
    };

    const handleDelete = async (photoId: string) => {
        setDeletingId(photoId);
        try {
            await onDeletePhoto(photoId);
        } finally {
            setDeletingId(null);
        }
    };

    const isUploading = busyAction === 'photo-edificio';

    return (
        <div className="space-y-4">
            {mainPhoto ? (
                <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                    <img
                        src={mainPhoto.url}
                        alt="Foto del edificio"
                        className="h-48 w-full object-cover sm:h-64"
                    />
                    <div className="flex items-center justify-between p-3">
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{mainPhoto.caption || 'Foto del edificio'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {getEntitySyncState('photo', mainPhoto.id) === 'pending' && 'Pendiente de sincronizar'}
                                {getEntitySyncState('photo', mainPhoto.id) === 'failed' && 'Error al sincronizar'}
                                {(getEntitySyncState('photo', mainPhoto.id) === 'synced' || getEntitySyncState('photo', mainPhoto.id) === undefined) && 'Guardado'}
                            </p>
                        </div>
                        {canEdit && (
                            <button
                                type="button"
                                onClick={() => handleDelete(mainPhoto.id)}
                                disabled={deletingId === mainPhoto.id}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                                aria-label="Eliminar foto del edificio"
                            >
                                <CustomIcon name="trash" size="xs" tone="rose" />
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-900/40">
                    <CustomIcon name="buildings" size="md" tone="mist" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No hay foto del edificio registrada.</p>
                </div>
            )}

            {canEdit && (
                <div className="space-y-3">
                    <input
                        type="text"
                        className="input w-full"
                        placeholder="Descripción u observaciones del edificio..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                    />

                    {/* Hidden inputs */}
                    <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelected}
                    />
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileSelected}
                    />

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            disabled={isUploading}
                            className="btn btn-secondary flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-xs font-semibold"
                        >
                            <CustomIcon name={isUploading ? 'sync' : 'image'} size="xs" tone="mist" spin={isUploading} />
                            Subir foto
                        </button>

                        <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={isUploading}
                            className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-xs font-semibold"
                        >
                            <CustomIcon name={isUploading ? 'sync' : 'camera'} size="xs" tone="white" spin={isUploading} />
                            Tomar foto
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});
ModuleEdificio.displayName = 'ModuleEdificio';
