import { memo, useState, type FormEvent } from 'react';
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
    const [file, setFile] = useState<File | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const edificioPhotos = photos.filter((p) => p.type === 'edificio');
    const mainPhoto = edificioPhotos[0] || null;

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onUploadPhoto(e, 'edificio', caption, file);
        setCaption('');
        setFile(null);
    };

    const handleDelete = async (photoId: string) => {
        setDeletingId(photoId);
        try {
            await onDeletePhoto(photoId);
        } finally {
            setDeletingId(null);
        }
    };

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
                <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                    <input
                        className="input flex-1"
                        placeholder="Descripción o referencia"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        className="input px-3 py-2 sm:w-auto"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <button
                        type="submit"
                        className="btn btn-secondary flex items-center justify-center gap-2"
                        disabled={busyAction === 'photo-edificio' || !file}
                    >
                        {busyAction === 'photo-edificio' ? (
                            <CustomIcon name="sync" size="xs" tone="cream" spin />
                        ) : (
                            <CustomIcon name="buildings" size="xs" tone="cream" />
                        )}
                        Subir foto
                    </button>
                </form>
            )}
        </div>
    );
});
ModuleEdificio.displayName = 'ModuleEdificio';
