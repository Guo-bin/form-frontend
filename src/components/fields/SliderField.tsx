import React from 'react';

interface FormField {
  properties?: {
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
  };
}

interface SliderFieldProps {
  field: FormField;
  value: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
}

export const SliderField: React.FC<SliderFieldProps> = ({
  field,
  value,
  onChange,
  readOnly = false
}) => {
  const min = field.properties?.min ?? 0;
  const max = field.properties?.max ?? 10;
  const step = field.properties?.step ?? 1;

  return (
    <div className="flex flex-col gap-2 py-1">
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value ?? min}
          disabled={readOnly}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-grow accent-teal-500 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none disabled:opacity-60"
        />
        <span className="text-lg font-bold text-teal-600 w-8 text-center">{value ?? min}</span>
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{min}</span>
        <span>{field.properties?.unit || ''}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};
