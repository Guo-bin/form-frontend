import React from 'react';

interface FormField {
  id: string;
}

interface TextareaFieldProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  isRequired: boolean;
  readOnly?: boolean;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  value,
  onChange,
  isRequired,
  readOnly = false
}) => {
  return (
    <textarea
      rows={3}
      value={value ?? ''}
      disabled={readOnly}
      onChange={(e) => onChange(e.target.value)}
      required={isRequired}
      style={{ colorScheme: 'light' }}
      className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all text-sm ${
        readOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : ''
      }`}
    />
  );
};
