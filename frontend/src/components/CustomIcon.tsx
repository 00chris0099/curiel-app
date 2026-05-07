import type { CSSProperties } from 'react';

import arrowLeft from '../assets/custom-icons/ACCIONES/Arrow_left.png';
import arrowRight from '../assets/custom-icons/ACCIONES/Arrow_right.png';
import saveIcon from '../assets/custom-icons/ACCIONES/Floppy_disk_save.png';
import pencilIcon from '../assets/custom-icons/ACCIONES/PENCIL.png';
import plusIcon from '../assets/custom-icons/ACCIONES/PLUS.png';
import dotsThreeIcon from '../assets/custom-icons/ACCIONES/three_dots_icon.png';
import trashIcon from '../assets/custom-icons/ACCIONES/Trash_icon_outline_black.png';
import bathIcon from '../assets/custom-icons/EJECUCION_TECNICA/BATH.png';
import bedIcon from '../assets/custom-icons/EJECUCION_TECNICA/BED.png';
import cameraIcon from '../assets/custom-icons/EJECUCION_TECNICA/CAMERA.png';
import doorIcon from '../assets/custom-icons/EJECUCION_TECNICA/DOOR.png';
import roomsIcon from '../assets/custom-icons/EJECUCION_TECNICA/GRID-4___ROOMS.png';
import imageIcon from '../assets/custom-icons/EJECUCION_TECNICA/IMAGE.png';
import notePencilIcon from '../assets/custom-icons/EJECUCION_TECNICA/NOTE-PENCIL.png';
import sofaIcon from '../assets/custom-icons/EJECUCION_TECNICA/SOFA.png';
import utensilsIcon from '../assets/custom-icons/EJECUCION_TECNICA/UTENSILS.png';
import warningIcon from '../assets/custom-icons/EJECUCION_TECNICA/WARNING.png';
import wrenchIcon from '../assets/custom-icons/EJECUCION_TECNICA/WRENCH.png';
import syncIcon from '../assets/custom-icons/OFFLINE_SYNC/Arrows_clockwise.png';
import cloudIcon from '../assets/custom-icons/OFFLINE_SYNC/Cloud.png';
import uploadCloudIcon from '../assets/custom-icons/OFFLINE_SYNC/CLOUD-ARROW-UP.png';
import databaseIcon from '../assets/custom-icons/OFFLINE_SYNC/Database.png';
import warningCircleIcon from '../assets/custom-icons/OFFLINE_SYNC/Warning_circle.png';
import wifiIcon from '../assets/custom-icons/OFFLINE_SYNC/wifi.png';
import wifiOffIcon from '../assets/custom-icons/OFFLINE_SYNC/wifi-off.png';
import downloadIcon from '../assets/custom-icons/REPORTES/Download.png';
import filePdfIcon from '../assets/custom-icons/REPORTES/file-pdf.png';
import printerIcon from '../assets/custom-icons/REPORTES/Printer.png';
import sealCheckIcon from '../assets/custom-icons/REPORTES/SEAL-CHECK___BADGE-CHECK.png';
import bellIcon from '../assets/custom-icons/NAVEGACION/bell.png';
import buildingsIcon from '../assets/custom-icons/NAVEGACION/buildings.png';
import clipboardCheckIcon from '../assets/custom-icons/NAVEGACION/clipboard-check.png';
import dashboardIcon from '../assets/custom-icons/NAVEGACION/dashboard.png';
import filterIcon from '../assets/custom-icons/NAVEGACION/filter.png';
import homeIcon from '../assets/custom-icons/NAVEGACION/home.png';
import houseIcon from '../assets/custom-icons/NAVEGACION/house.png';
import searchIcon from '../assets/custom-icons/NAVEGACION/search.png';
import settingsIcon from '../assets/custom-icons/NAVEGACION/settings.png';
import userGearIcon from '../assets/custom-icons/NAVEGACION/user-gear.png';
import usersIcon from '../assets/custom-icons/NAVEGACION/users.png';
import calendarIcon from '../assets/custom-icons/INSPECCION/calendar.png';
import checkCircleIcon from '../assets/custom-icons/INSPECCION/check-circle.png';
import clockIcon from '../assets/custom-icons/INSPECCION/clock.png';
import folderOpenIcon from '../assets/custom-icons/INSPECCION/folder-open.png';
import mapPinIcon from '../assets/custom-icons/INSPECCION/map-pin.png';
import pauseIcon from '../assets/custom-icons/INSPECCION/pause.png';
import playIcon from '../assets/custom-icons/INSPECCION/play.png';
import rulerIcon from '../assets/custom-icons/INSPECCION/ruler.png';
import undoIcon from '../assets/custom-icons/INSPECCION/undo  arrow-u-up-left.png';
import xCircleIcon from '../assets/custom-icons/INSPECCION/x-circle.png';

const iconRegistry = {
    'arrow-left': arrowLeft,
    'arrow-right': arrowRight,
    save: saveIcon,
    pencil: pencilIcon,
    plus: plusIcon,
    'dots-three': dotsThreeIcon,
    trash: trashIcon,
    bath: bathIcon,
    bed: bedIcon,
    camera: cameraIcon,
    door: doorIcon,
    rooms: roomsIcon,
    image: imageIcon,
    'note-pencil': notePencilIcon,
    sofa: sofaIcon,
    utensils: utensilsIcon,
    warning: warningIcon,
    wrench: wrenchIcon,
    sync: syncIcon,
    cloud: cloudIcon,
    'cloud-upload': uploadCloudIcon,
    database: databaseIcon,
    'warning-circle': warningCircleIcon,
    wifi: wifiIcon,
    'wifi-off': wifiOffIcon,
    download: downloadIcon,
    'file-pdf': filePdfIcon,
    printer: printerIcon,
    'seal-check': sealCheckIcon,
    bell: bellIcon,
    buildings: buildingsIcon,
    'clipboard-check': clipboardCheckIcon,
    dashboard: dashboardIcon,
    filter: filterIcon,
    home: homeIcon,
    house: houseIcon,
    search: searchIcon,
    settings: settingsIcon,
    'user-gear': userGearIcon,
    users: usersIcon,
    calendar: calendarIcon,
    'check-circle': checkCircleIcon,
    clock: clockIcon,
    'folder-open': folderOpenIcon,
    'map-pin': mapPinIcon,
    pause: pauseIcon,
    play: playIcon,
    ruler: rulerIcon,
    undo: undoIcon,
    'x-circle': xCircleIcon,
} as const;

export type CustomIconName = keyof typeof iconRegistry;
type IconTone = 'cream' | 'mist' | 'blue' | 'white' | 'sage' | 'rose' | 'amber';
type IconVariant = 'tile' | 'soft' | 'plain';
type IconSize = 'xs' | 'sm' | 'md' | 'lg';

type CustomIconProps = {
    name: CustomIconName;
    alt?: string;
    className?: string;
    imageClassName?: string;
    tone?: IconTone;
    variant?: IconVariant;
    size?: IconSize;
    spin?: boolean;
};

const toneClassMap: Record<IconTone, string> = {
    cream: 'icon-tone-cream',
    mist: 'icon-tone-mist',
    blue: 'icon-tone-blue',
    white: 'icon-tone-white',
    sage: 'icon-tone-sage',
    rose: 'icon-tone-rose',
    amber: 'icon-tone-amber',
};

const sizeStyleMap: Record<IconSize, CSSProperties> = {
    xs: { '--icon-wrapper-size': '36px', '--icon-image-size': '16px' } as CSSProperties,
    sm: { '--icon-wrapper-size': '44px', '--icon-image-size': '20px' } as CSSProperties,
    md: { '--icon-wrapper-size': '56px', '--icon-image-size': '26px' } as CSSProperties,
    lg: { '--icon-wrapper-size': '68px', '--icon-image-size': '32px' } as CSSProperties,
};

export const CustomIcon = ({
    name,
    alt,
    className = '',
    imageClassName = '',
    tone = 'cream',
    variant = 'tile',
    size = 'md',
    spin = false,
}: CustomIconProps) => {
    const src = iconRegistry[name];
    const wrapperClassName = [
        variant === 'plain' ? 'custom-icon custom-icon-plain' : `custom-icon custom-icon-${variant}`,
        variant === 'plain' ? '' : toneClassMap[tone],
        className,
    ].filter(Boolean).join(' ');

    return (
        <span className={wrapperClassName} style={sizeStyleMap[size]} aria-hidden={alt ? undefined : true}>
            <img
                src={src}
                alt={alt ?? ''}
                className={[
                    'custom-icon-image',
                    spin ? 'animate-spin' : '',
                    imageClassName,
                ].filter(Boolean).join(' ')}
            />
        </span>
    );
};
