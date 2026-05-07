import type { CSSProperties } from 'react';

import arrowLeft from '../../../image/ACCIONES/Arrow_left.png';
import arrowRight from '../../../image/ACCIONES/Arrow_right.png';
import saveIcon from '../../../image/ACCIONES/Floppy_disk_save.png';
import pencilIcon from '../../../image/ACCIONES/PENCIL.png';
import plusIcon from '../../../image/ACCIONES/PLUS.png';
import dotsThreeIcon from '../../../image/ACCIONES/three_dots_icon.png';
import trashIcon from '../../../image/ACCIONES/Trash_icon_outline_black.png';
import bathIcon from '../../../image/EJECUCIÓN TÉCNICA/BATH.png';
import bedIcon from '../../../image/EJECUCIÓN TÉCNICA/BED.png';
import cameraIcon from '../../../image/EJECUCIÓN TÉCNICA/CAMERA.png';
import doorIcon from '../../../image/EJECUCIÓN TÉCNICA/DOOR.png';
import roomsIcon from '../../../image/EJECUCIÓN TÉCNICA/GRID-4___ROOMS.png';
import imageIcon from '../../../image/EJECUCIÓN TÉCNICA/IMAGE.png';
import notePencilIcon from '../../../image/EJECUCIÓN TÉCNICA/NOTE-PENCIL.png';
import sofaIcon from '../../../image/EJECUCIÓN TÉCNICA/SOFA.png';
import utensilsIcon from '../../../image/EJECUCIÓN TÉCNICA/UTENSILS.png';
import warningIcon from '../../../image/EJECUCIÓN TÉCNICA/WARNING.png';
import wrenchIcon from '../../../image/EJECUCIÓN TÉCNICA/WRENCH.png';
import syncIcon from '../../../image/OFFLINE  SYNC/Arrows_clockwise.png';
import cloudIcon from '../../../image/OFFLINE  SYNC/Cloud.png';
import uploadCloudIcon from '../../../image/OFFLINE  SYNC/CLOUD-ARROW-UP.png';
import databaseIcon from '../../../image/OFFLINE  SYNC/Database.png';
import warningCircleIcon from '../../../image/OFFLINE  SYNC/Warning_circle.png';
import wifiIcon from '../../../image/OFFLINE  SYNC/wifi.png';
import wifiOffIcon from '../../../image/OFFLINE  SYNC/wifi-off.png';
import downloadIcon from '../../../image/REPORTES/Download.png';
import filePdfIcon from '../../../image/REPORTES/file-pdf.png';
import printerIcon from '../../../image/REPORTES/Printer.png';
import sealCheckIcon from '../../../image/REPORTES/SEAL-CHECK___BADGE-CHECK.png';
import bellIcon from '../../../image/base de navegación/bell.png';
import buildingsIcon from '../../../image/base de navegación/buildings.png';
import clipboardCheckIcon from '../../../image/base de navegación/clipboard-check.png';
import dashboardIcon from '../../../image/base de navegación/dashboard.png';
import filterIcon from '../../../image/base de navegación/filter.png';
import homeIcon from '../../../image/base de navegación/home.png';
import houseIcon from '../../../image/base de navegación/house.png';
import searchIcon from '../../../image/base de navegación/search.png';
import settingsIcon from '../../../image/base de navegación/settings.png';
import userGearIcon from '../../../image/base de navegación/user-gear.png';
import usersIcon from '../../../image/base de navegación/users.png';
import calendarIcon from '../../../image/inspector/calendar.png';
import checkCircleIcon from '../../../image/inspector/check-circle.png';
import clockIcon from '../../../image/inspector/clock.png';
import folderOpenIcon from '../../../image/inspector/folder-open.png';
import mapPinIcon from '../../../image/inspector/map-pin.png';
import pauseIcon from '../../../image/inspector/pause.png';
import playIcon from '../../../image/inspector/play.png';
import rulerIcon from '../../../image/inspector/ruler.png';
import undoIcon from '../../../image/inspector/undo  arrow-u-up-left.png';
import xCircleIcon from '../../../image/inspector/x-circle.png';

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
