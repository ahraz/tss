import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className, onClick, hoverable }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={twMerge(
        'bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6',
        hoverable && 'cursor-pointer hover:shadow-md hover:border-gray-200 transition-all duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}
