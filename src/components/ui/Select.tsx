import React from 'react';
import { twMerge } from 'tailwind-merge';

interface SelectOption { value: string; label: string; }

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({ label, error, id, options, placeholder, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        id={id}
        className={twMerge(
          'w-full border rounded-lg px-3 py-2 text-sm bg-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-200',
          error ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-blue-500',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
