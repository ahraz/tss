import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { getPhoto } from '../../utils/photoStore';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface UserAvatarProps {
  user: { avatarInitials: string; avatarColor: string; name?: string; photoId?: string } | null | undefined;
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.photoId) {
      setPhotoUrl(null);
      setLoaded(true);
      return;
    }
    // photoId can be a Firebase Storage download URL (http) or an IndexedDB key (legacy)
    if (user.photoId.startsWith('http')) {
      setPhotoUrl(user.photoId);
      setLoaded(true);
    } else {
      getPhoto(user.photoId).then(url => {
        setPhotoUrl(url);
        setLoaded(true);
      });
    }
  }, [user?.photoId]);

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
