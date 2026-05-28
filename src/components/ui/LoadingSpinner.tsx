import { Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 16, md: 24, lg: 36 };

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div className={twMerge('flex items-center justify-center p-8', className)}>
      <Loader2 size={sizeMap[size]} className="animate-spin text-blue-600" />
    </div>
  );
}
