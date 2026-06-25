import type { ChangeEvent } from 'react';
import type { YesNoOption } from '../../types';
import { yesNoOptions } from './createInspectionConstants';

type BinarySelectProps = {
    id: string;
    label: string;
    value: YesNoOption;
    onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
};

export const BinarySelect = ({ id, label, value, onChange }: BinarySelectProps) => (
    <div>
        <label htmlFor={id} className="mb-2 block text-sm font-medium">
            {label}
        </label>
        <select id={id} name={id} value={value} onChange={onChange} className="input">
            {yesNoOptions.map((option) => (
                <option key={option} value={option}>
                    {option}
                </option>
            ))}
        </select>
    </div>
);
