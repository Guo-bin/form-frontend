import React from 'react';

interface FormField {
  id: string;
  type: string;
  label: string;
  properties?: {
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
  };
}

interface InputFieldProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  isRequired: boolean;
  readOnly?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  field,
  value,
  onChange,
  isRequired,
  readOnly = false
}) => {
  const isNumber = field.type === 'number';

  return (
    <div className="flex items-center gap-3">
      <input
        type={isNumber ? 'number' : 'text'}
        value={value ?? ''}
        disabled={readOnly}
        min={field.properties?.min}
        max={field.properties?.max}
        step={field.properties?.step}
        onChange={(e) => onChange(isNumber ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        required={isRequired}
        style={{ colorScheme: 'light' }}
        className={`px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all text-sm ${
          isNumber ? 'w-48' : 'w-full'
        } ${readOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : ''}`}
      />
      {field.properties?.unit && (
        <span className="text-sm text-slate-500 font-medium">{field.properties.unit}</span>
      )}
    </div>
  );
};
