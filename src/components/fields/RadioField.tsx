import React from 'react';

interface Option {
  value: string;
  text: string;
  score: number;
}

interface FormField {
  id: string;
  label: string;
  options?: Option[];
}

interface RadioFieldProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  isRequired: boolean;
  readOnly?: boolean;
}

export const RadioField: React.FC<RadioFieldProps> = ({
  field,
  value,
  onChange,
  isRequired,
  readOnly = false
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
      {field.options?.map(opt => {
        const isChecked = String(value) === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex items-center p-3.5 border rounded-xl cursor-pointer hover:bg-slate-100 transition-all ${
              isChecked
                ? 'border-teal-500 bg-teal-50'
                : 'border-slate-200 bg-slate-50'
            } ${readOnly ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            <input
              type="radio"
              name={field.id}
              value={opt.value}
              checked={isChecked}
              disabled={readOnly}
              onChange={() => !readOnly && onChange(opt.value)}
              required={isRequired && !value}
              className="mr-3 accent-teal-500 w-4 h-4"
            />
            <span className="text-sm text-slate-700 font-medium">
              {opt.text} {opt.score > 0 ? `(+${opt.score}分)` : ''}
            </span>
          </label>
        );
      })}
    </div>
  );
};
