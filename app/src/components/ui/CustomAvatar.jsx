import React from 'react';
import { avatarImage } from '../../lib/imageUtils';

const Avatar = ({
  src,
  alt = '',
  name,
  size = 'md',
  className = '',
  fallbackColor = null,
  ...props
}) => {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate consistent color from name
  const getColorFromName = (name) => {
    if (fallbackColor) return fallbackColor;
    if (!name) return '#02338D';

    const colors = [
      '#02338D', '#7C3AED', '#16A34A', '#0891B2',
      '#DB2777', '#EA580C', '#059669', '#9333EA'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const [imageError, setImageError] = React.useState(false);

  if (src && !imageError) {
    return (
      <img
        src={avatarImage(src, 128)}
        alt={alt || name || 'Avatar'}
        className={`
          rounded-full object-cover
          ${sizes[size]}
          ${className}
        `}
        decoding="async"
        loading="lazy"
        onError={() => setImageError(true)}
        {...props}
      />
    );
  }

  // Fallback with initials
  const bgColor = getColorFromName(name);
  const initials = getInitials(name);

  return (
    <div
      className={`
        rounded-full flex items-center justify-center font-semibold text-white
        ${sizes[size]}
        ${className}
      `}
      style={{ backgroundColor: bgColor }}
      aria-label={name || 'Avatar'}
      {...props}
    >
      {initials}
    </div>
  );
};

export default Avatar;

