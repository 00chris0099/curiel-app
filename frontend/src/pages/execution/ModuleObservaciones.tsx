import { memo, useState, useRef, type FormEvent } from 'react';
import { CustomIcon } from '../../components/CustomIcon';
import type { InspectionArea, InspectionObservation } from '../../types';
import type { InspectionExecutionData } from '../../types';

type ModuleObservacionesProps = {
    areas: InspectionArea[];
    observations: InspectionObservation[];
    photos: InspectionExecutionData['photos'];
    busyAction: string | null;
    canEdit: boolean;
    onSaveObservation: (form: { areaId: string; title: string; description: string; severity: 'leve'; type: 'otro'; status: 'pendiente' }, editingId?: string) => void;
    onDeleteObservation: (observationId: string) => void;
    onUploadPhoto: (event: FormEvent<HTMLFormElement>, type: string, caption: string, file: File | null, areaId?: string) => void;
    onDeletePhoto: (photoId: string) => void;
};

export const ModuleObservaciones = memo(({
    areas,
    observations,
    photos,
    canEdit,
    onDeleteObservation,
    onUploadPhoto,
    onDeletePhoto,
}: ModuleObservacionesProps) => {
    const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const selectedArea = areas.find((a) => a.id === selectedAreaId);
    const areaObservations = observations.filter((o) => o.areaId === selectedAreaId);
    const areaPhotos = photos.filter((p) => p.areaId === selectedAreaId);

    const handleSubmitPhoto = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedAreaId || !file || !description.trim()) return;
        onUploadPhoto(e, 'area', description.trim(), file, selectedAreaId);
        setFile(null);
        setDescription('');
    };

    const handleCapture = (source: 'camera' | 'gallery') => {
        if (source === 'camera') {
            cameraInputRef.current?.click();
        } else {
            galleryInputRef.current?.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    if (!selectedAreaId) {
        return (
            <div className="space-y-2">
                {areas.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-900/40">
                        <CustomIcon name="rooms" size="md" tone="mist" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Crea áreas primero para agregar observaciones.
                        </p>
                    </div>
                ) : (
                    areas.map((area) => {
                        const photoCount = photos.filter((p) => p.areaId === area.id).length;
                        return (
                            <button
                                key={area.id}
                                type="button"
                                onClick={() => setSelectedAreaId(area.id)}
                                className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 px-3 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/80"
                            >
                                <CustomIcon name="rooms" size="xs" tone="mist" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{area.name}</p>
                                    <p className="text-[11px] text-gray-400">{photoCount} foto{photoCount !== 1 ? 's' : ''}</p>
                                </div>
                                <CustomIcon name="arrow-right" size="xs" tone="mist" />
                            </button>
                        );
                    })
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <button
                type="button"
                onClick={() => { setSelectedAreaId(null); setDescription(''); setFile(null); }}
                className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
                <CustomIcon name="arrow-left" size="xs" tone="blue" />
                Volver a áreas
            </button>

            <div className="flex items-center gap-2">
                <CustomIcon name="rooms" size="sm" tone="cream" />
                <h3 className="font-bold text-gray-900 dark:text-white">{selectedArea?.name}</h3>
            </div>

            {canEdit && (
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => handleCapture('camera')}
                        className="btn btn-secondary flex items-center gap-2 text-sm"
                    >
                        <CustomIcon name="camera" size="xs" tone="cream" />
                        Cámara
                    </button>
                    <button
                        type="button"
                        onClick={() => handleCapture('gallery')}
                        className="btn btn-secondary flex items-center gap-2 text-sm"
                    >
                        <CustomIcon name="image" size="xs" tone="cream" />
                        Galería
                    </button>
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            )}

            {file && (
                <form onSubmit={handleSubmitPhoto} className="space-y-3 rounded-2xl border border-dashed border-primary-300 bg-primary-50/50 p-3 dark:border-primary-700 dark:bg-primary-900/10">
                    <img src={URL.createObjectURL(file)} alt="Preview" className="h-32 w-full rounded-xl object-cover" />
                    <input
                        className="input text-sm"
                        placeholder="Descripción de la observación (requerido)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                    <div className="flex gap-2">
                        <button type="submit" className="btn btn-primary text-sm flex-1" disabled={!description.trim()}>
                            Guardar
                        </button>
                        <button type="button" onClick={() => { setFile(null); setDescription(''); }} className="btn btn-secondary text-sm">
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {areaPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {areaPhotos.map((photo) => (
                        <div key={photo.id} className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                            <img src={photo.url} alt={photo.caption || ''} className="h-24 w-full object-cover" />
                            <div className="flex items-center justify-between px-2 py-1">
                                <p className="truncate text-[10px] text-gray-500 dark:text-gray-400">{photo.caption || 'Foto'}</p>
                                {canEdit && (
                                    <button type="button" onClick={() => onDeletePhoto(photo.id)} className="text-red-400 hover:text-red-600">
                                        <CustomIcon name="trash" size="xs" tone="rose" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {areaObservations.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Observaciones</p>
                    {areaObservations.map((obs) => (
                        <div key={obs.id} className="rounded-2xl border border-gray-200 px-3 py-2.5 dark:border-gray-700">
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-gray-700 dark:text-gray-200">{obs.description}</p>
                                {canEdit && (
                                    <button type="button" onClick={() => onDeleteObservation(obs.id)} className="shrink-0 text-red-400 hover:text-red-600">
                                        <CustomIcon name="trash" size="xs" tone="rose" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});
ModuleObservaciones.displayName = 'ModuleObservaciones';
