import { clsx } from 'clsx';

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' };

export function Avatar({ name, url, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return url ? (
    <img src={url} alt={name} className={clsx('rounded-full object-cover', sizes[size])} />
  ) : (
    <div
      className={clsx(
        'rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-semibold',
        sizes[size],
      )}
    >
      {initials}
    </div>
  );
}
