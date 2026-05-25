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

interface CheckboxFieldProps {
  field: FormField;
  value: string | string[];
  onChange: (value: string[]) => void;
  readOnly?: boolean;
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  field,
  value,
  onChange,
  readOnly = false
}) => {
  // Ensure selected values is string[]
  const selectedValues: string[] = Array.isArray(value)
    ? value
    : value
    ? [String(value)]
    : [];

  const handleCheckboxChange = (optValue: string, checked: boolean) => {
    if (readOnly) return;
    let nextValues: string[];
    if (checked) {
      nextValues = [...selectedValues, optValue];
    } else {
      nextValues = selectedValues.filter(val => val !== optValue);
    }
    onChange(nextValues);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
      {field.options?.map(opt => {
        const isChecked = selectedValues.includes(opt.value);
        return (
          <label
            key={opt.value}
            className={`flex items-center p-3.5 border rounded-xl cursor-pointer hover:bg-slate-100 transition-all ${
              isChecked
                ? 'border-teal-500 bg-teal-50/70'
                : 'border-slate-200 bg-slate-50'
            } ${readOnly ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            <input
              type="checkbox"
              name={field.id}
              value={opt.value}
              checked={isChecked}
              disabled={readOnly}
              onChange={(e) => handleCheckboxChange(opt.value, e.target.checked)}
              className="mr-3 accent-teal-500 w-4 h-4 rounded"
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
