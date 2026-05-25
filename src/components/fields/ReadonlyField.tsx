import React from 'react';

interface FormField {
  properties?: {
    unit?: string;
  };
}

interface ReadonlyFieldProps {
  field: FormField;
  value: string;
}

export const ReadonlyField: React.FC<ReadonlyFieldProps> = ({
  field,
  value
}) => {
  return (
    <div className="flex items-center gap-3">
      <input
        type="text"
        value={value ?? ''}
        readOnly
        style={{ colorScheme: 'light' }}
        className="w-full px-4 py-2.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed outline-none text-sm"
        placeholder="讀取系統數據中..."
      />
      {field.properties?.unit && (
        <span className="text-sm text-slate-500 font-semibold">{field.properties.unit}</span>
      )}
    </div>
  );
};
