import { twMerge } from 'tailwind-merge';

type AvatarSize = 'sm' | 'md' | 'lg';

interface UserAvatarProps {
  user: { avatarInitials: string; avatarColor: string; name?: string };
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  return (
    <div
      title={user.name}
      className={twMerge(
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0',
        sizeClasses[size],
        user.avatarColor,
        className
      )}
    >
      {user.avatarInitials}
    </div>
  );
}
