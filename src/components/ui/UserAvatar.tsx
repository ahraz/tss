import { useEffect, useState, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import { getPhoto } from '../../utils/photoStore';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface UserAvatarProps {
  user: { avatarInitials: string; avatarColor: string; name?: string; photoId?: string; photoData?: string } | null | undefined;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  const [asyncPhotoUrl, setAsyncPhotoUrl] = useState<string | null>(null);

  const syncPhotoUrl = useMemo(() => {
    if (user?.photoData) return user.photoData;
    if (user?.photoId?.startsWith('http')) return user.photoId;
    return null;
  }, [user?.photoData, user?.photoId]);

  useEffect(() => {
    if (syncPhotoUrl) return;
    if (user?.photoId && !user.photoId.startsWith('http')) {
      getPhoto(user.photoId).then(url => {
        setAsyncPhotoUrl(url);
      });
    }
  }, [syncPhotoUrl, user?.photoId]);

  const photoUrl = syncPhotoUrl || asyncPhotoUrl;

  if (!user) return null;

  // Show photo if available
  if (photoUrl) {
    return (
      <div
        title={user.name}
        className={twMerge(
          'rounded-full flex-shrink-0 overflow-hidden',
          sizeClasses[size],
          className
        )}
      >
        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  // Fallback to initials
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
