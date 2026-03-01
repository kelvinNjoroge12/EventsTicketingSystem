import React from 'react';

const Skeleton = ({ className = '', variant = 'default' }) => {
  const variants = {
    default: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded h-4',
    banner: 'rounded-2xl',
  };

  return (
    <div
      className={`
        skeleton-shimmer bg-[#F1F5F9]
        ${variants[variant]}
        ${className}
      `}
      aria-hidden="true"
    />
  );
};

export const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden bg-white border border-[#E2E8F0]">
    <CustomSkeleton className="w-full h-48" variant="banner" />
    <div className="p-4 space-y-3">
      <CustomSkeleton className="w-3/4 h-5" />
      <CustomSkeleton className="w-1/2 h-4" />
      <CustomSkeleton className="w-full h-4" />
      <div className="flex items-center gap-2 pt-2">
        <CustomSkeleton className="w-8 h-8" variant="circle" />
        <CustomSkeleton className="w-24 h-4" />
      </div>
    </div>
  </div>
);

export const SkeletonText = ({ lines = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <CustomSkeleton 
        key={i} 
        className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} 
        variant="text" 
      />
    ))}
  </div>
);

export const SkeletonAvatar = ({ size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return <CustomSkeleton className={sizes[size]} variant="circle" />;
};

export const SkeletonBanner = () => (
  <CustomSkeleton className="w-full h-64 md:h-96" variant="banner" />
);

export const SkeletonGrid = ({ count = 8, columns = 4 }) => (
  <div 
    className="grid gap-6"
    style={{ 
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` 
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default Skeleton;
