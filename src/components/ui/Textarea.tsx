import React from 'react';
import { twMerge } from 'tailwind-merge';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, id, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        id={id}
        rows={3}
        className={twMerge(
          'w-full border rounded-lg px-3 py-2 text-sm bg-white resize-y transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-200',
          error ? 'border-red-400' : 'border-gray-300 focus:border-blue-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
