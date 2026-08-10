import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, Navigation, Loader2 } from 'lucide-react';

export interface AddressMapPickerProps {
    address: string;
    latitude?: number | null;
    longitude?: number | null;
    onAddressChange: (address: string) => void;
    onLocationChange?: (lat: number, lng: number) => void;
    onDistrictDetected?: (district: string) => void;
    label?: string;
    placeholder?: string;
    required?: boolean;
    className?: string;
}

interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    address?: Record<string, string>;
}

const extractDistrictFromAddress = (addressObj: any, displayName: string): string | null => {
    const knownDistricts = [
        'Miraflores', 'San Isidro', 'Santiago de Surco', 'Surco', 'San Borja', 'La Molina',
        'Jesús María', 'Jesus Maria', 'Magdalena del Mar', 'Magdalena', 'Pueblo Libre', 'Lince',
        'Barranco', 'Chorrillos', 'San Miguel', 'Cercado de Lima', 'Lima', 'Ate', 'Ate Vitarte',
        'Santa Anita', 'San Juan de Lurigancho', 'San Juan de Miraflores', 'Villa El Salvador',
        'Villa María del Triunfo', 'Comas', 'Los Olivos', 'Independencia', 'San Martín de Porres',
        'Rímac', 'Breña', 'La Victoria', 'El Agustino', 'Callao', 'Bellavista', 'La Perla'
    ];

    const fieldsToSearch = [
        addressObj?.suburb,
        addressObj?.city_district,
        addressObj?.district,
        addressObj?.town,
        addressObj?.quarter,
        addressObj?.neighbourhood,
        addressObj?.city,
        displayName
    ];

    for (const field of fieldsToSearch) {
        if (!field) continue;
        const normalizedField = String(field).toLowerCase();
        for (const dist of knownDistricts) {
            if (normalizedField.includes(dist.toLowerCase())) {
                if (dist === 'Surco' || dist === 'Santiago de Surco') return 'Santiago de Surco';
                if (dist === 'Magdalena del Mar' || dist === 'Magdalena') return 'Magdalena';
                if (dist === 'Jesus Maria' || dist === 'Jesús María') return 'Jesús María';
                if (dist === 'Lima' || dist === 'Cercado de Lima') return 'Cercado de Lima';
                return dist;
            }
        }
    }
    return null;
};

export const AddressMapPicker: React.FC<AddressMapPickerProps> = ({
    address,
    latitude,
    longitude,
    onAddressChange,
    onLocationChange,
    onDistrictDetected,
    label = 'Dirección',
    placeholder = 'Ingresa una dirección o selecciona en el mapa...',
    required = false,
    className = ''
}) => {
    const [inputValue, setInputValue] = useState(address || '');
    const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [latInput, setLatInput] = useState<string>(latitude !== undefined && latitude !== null ? String(latitude) : '');
    const [lngInput, setLngInput] = useState<string>(longitude !== undefined && longitude !== null ? String(longitude) : '');

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Dynamic Leaflet Loader
    const [isLeafletReady, setIsLeafletReady] = useState(false);

    useEffect(() => {
        setInputValue(address || '');
    }, [address]);

    useEffect(() => {
        if (latitude !== undefined && latitude !== null) setLatInput(String(latitude));
        if (longitude !== undefined && longitude !== null) setLngInput(String(longitude));
    }, [latitude, longitude]);

    // Load Leaflet JS/CSS dynamically if not present
    useEffect(() => {
        if ((window as any).L) {
            setIsLeafletReady(true);
            return;
        }

        const existingCss = document.getElementById('leaflet-css');
        if (!existingCss) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        const existingJs = document.getElementById('leaflet-js');
        if (!existingJs) {
            const script = document.createElement('script');
            script.id = 'leaflet-js';
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => setIsLeafletReady(true);
            document.head.appendChild(script);
        } else {
            existingJs.addEventListener('load', () => setIsLeafletReady(true));
        }
    }, []);

    // Reverse geocode lat/lng to address string
    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        setIsReverseGeocoding(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'es' } }
            );
            if (response.ok) {
                const data = await response.json();
                if (data && data.display_name) {
                    const formatted = data.display_name;
                    setInputValue(formatted);
                    onAddressChange(formatted);

                    // Auto-detect district if handler passed
                    if (onDistrictDetected) {
                        const detected = extractDistrictFromAddress(data.address, formatted);
                        if (detected) {
                            onDistrictDetected(detected);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error en geocodificación inversa:', error);
        } finally {
            setIsReverseGeocoding(false);
        }
    }, [onAddressChange, onDistrictDetected]);

    // Initialize or update Map
    useEffect(() => {
        if (!isLeafletReady || !mapContainerRef.current) return;
        const L = (window as any).L;
        if (!L) return;

        const defaultLat = latitude || -12.046374; // Lima default
        const defaultLng = longitude || -77.042793;

        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(map);

            const customIcon = L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            const marker = L.marker([defaultLat, defaultLng], { draggable: true, icon: customIcon }).addTo(map);

            marker.on('dragend', () => {
                const pos = marker.getLatLng();
                setLatInput(pos.lat.toFixed(6));
                setLngInput(pos.lng.toFixed(6));
                if (onLocationChange) onLocationChange(pos.lat, pos.lng);
                reverseGeocode(pos.lat, pos.lng);
            });

            map.on('click', (e: any) => {
                const { lat, lng } = e.latlng;
                marker.setLatLng([lat, lng]);
                setLatInput(lat.toFixed(6));
                setLngInput(lng.toFixed(6));
                if (onLocationChange) onLocationChange(lat, lng);
                reverseGeocode(lat, lng);
            });

            mapInstanceRef.current = map;
            markerRef.current = marker;
        } else {
            if (latitude && longitude) {
                mapInstanceRef.current.setView([latitude, longitude], 15);
                markerRef.current.setLatLng([latitude, longitude]);
            }
        }
    }, [isLeafletReady, latitude, longitude, onLocationChange, reverseGeocode]);

    // Handle Address Search (Nominatim Geocoding)
    const handleAddressInput = (val: string) => {
        setInputValue(val);
        onAddressChange(val);

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        if (val.trim().length < 3) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }

        setIsSearching(true);
        debounceTimerRef.current = setTimeout(async () => {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=pe&limit=5`,
                    { headers: { 'Accept-Language': 'es' } }
                );
                if (response.ok) {
                    const data: NominatimResult[] = await response.json();
                    setSuggestions(data);
                    setShowDropdown(data.length > 0);
                }
            } catch (err) {
                console.error('Error buscando dirección:', err);
            } finally {
                setIsSearching(false);
            }
        }, 400);
    };

    const handleSelectSuggestion = (item: NominatimResult) => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const formatted = item.display_name;

        setInputValue(formatted);
        onAddressChange(formatted);
        setLatInput(lat.toFixed(6));
        setLngInput(lng.toFixed(6));

        if (onLocationChange) onLocationChange(lat, lng);

        if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([lat, lng], 16);
            markerRef.current.setLatLng([lat, lng]);
        }

        setShowDropdown(false);
    };

    // Apply manual coordinate inputs
    const handleApplyCoordinates = (latStr: string, lngStr: string) => {
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);

        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            if (onLocationChange) onLocationChange(lat, lng);
            if (mapInstanceRef.current && markerRef.current) {
                mapInstanceRef.current.setView([lat, lng], 16);
                markerRef.current.setLatLng([lat, lng]);
            }
            reverseGeocode(lat, lng);
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Address Input Field with Autocomplete */}
            <div className="relative">
                <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative flex items-center">
                    <MapPin className="absolute left-3.5 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => handleAddressInput(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                        placeholder={placeholder}
                        required={required}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all"
                    />
                    {(isSearching || isReverseGeocoding) ? (
                        <Loader2 className="absolute right-3.5 h-5 w-5 text-amber-500 animate-spin" />
                    ) : (
                        <Search className="absolute right-3.5 h-5 w-5 text-slate-400" />
                    )}
                </div>

                {/* Autocomplete Dropdown */}
                {showDropdown && suggestions.length > 0 && (
                    <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                        {suggestions.map((item) => (
                            <li
                                key={item.place_id}
                                onClick={() => handleSelectSuggestion(item)}
                                className="flex items-start space-x-2.5 cursor-pointer px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <MapPin className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                                <span className="text-slate-800 dark:text-slate-200 line-clamp-2">{item.display_name}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Coordinates Fields (Latitud & Longitud) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                        Latitud
                    </label>
                    <input
                        type="text"
                        value={latInput}
                        onChange={(e) => {
                            setLatInput(e.target.value);
                            handleApplyCoordinates(e.target.value, lngInput);
                        }}
                        placeholder="Ej. -12.046374"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                        Longitud
                    </label>
                    <input
                        type="text"
                        value={lngInput}
                        onChange={(e) => {
                            setLngInput(e.target.value);
                            handleApplyCoordinates(latInput, e.target.value);
                        }}
                        placeholder="Ej. -77.042793"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                </div>
            </div>

            {/* Interactive Leaflet Map Container */}
            <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner">
                <div
                    ref={mapContainerRef}
                    className="h-52 w-full bg-slate-100 dark:bg-slate-800 z-10"
                />
                <div className="bg-slate-50 dark:bg-slate-900/80 px-3 py-1.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                        <Navigation className="h-3 w-3 text-amber-500" />
                        <span>Haz clic o arrastra el marcador para ubicar la dirección en el mapa.</span>
                    </span>
                </div>
            </div>
        </div>
    );
};
