import React from 'react';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={id}
        className={twMerge(
          'w-full border rounded-lg px-3 py-2 text-sm bg-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-200',
          error ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-blue-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
