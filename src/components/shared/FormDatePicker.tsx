import { FormField } from './FormField';

interface FormDatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  error?: string;
  required?: boolean;
}

export function FormDatePicker({ label, value, onChange, min, max, error, required }: FormDatePickerProps) {
  return (
    <FormField label={label} error={error} required={required}>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        min={min}
        max={max}
        className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
      />
    </FormField>
  );
}
