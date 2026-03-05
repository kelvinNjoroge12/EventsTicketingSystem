import React, { useState } from 'react';

// Generates the Supabase Image Transformation URL using /render/image/public/
const getTransformUrl = (url, width) => {
    if (!url || !url.includes('supabase.co/storage/v1/object/public/')) return url;

    const transformedUrl = url.replace(
        '/storage/v1/object/public/',
        '/storage/v1/render/image/public/'
    );
    return `${transformedUrl}?width=${width}&format=webp&quality=80`;
};

// Generates a tiny, highly compressed version for the initial blur placeholder
const getBlurUrl = (url) => {
    if (!url || !url.includes('supabase.co/storage/v1/object/public/')) return null;
    const transformedUrl = url.replace(
        '/storage/v1/object/public/',
        '/storage/v1/render/image/public/'
    );
    return `${transformedUrl}?width=20&quality=20&format=webp`;
};

const OptimizedImage = ({
    src,
    alt,
    className = '',
    sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    srcSetWidths = [400, 800, 1200],
    defaultWidth = 800
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const isSupabase = src?.includes('supabase.co/storage/v1/object/public/');

    // If we don't have a source, render nothing
    if (!src) return null;

    // If this isn't a Supabase URL OR if the transformation API failed (e.g. not on Pro plan),
    // fallback instantly to standard raw image rendering.
    if (!isSupabase || hasError) {
        return (
            <img
                src={src}
                alt={alt}
                className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
            />
        );
    }

    // Generate srcSet for responsive downloading (downloads exactly what the device needs)
    const srcSet = srcSetWidths
        .map((w) => `${getTransformUrl(src, w)} ${w}w`)
        .join(', ');

    const defaultSrc = getTransformUrl(src, defaultWidth);
    const blurSrc = getBlurUrl(src);

    return (
        <div className="relative w-full h-full overflow-hidden bg-transparent">
            {/* 1. Placeholder Background (Blur) */}
            {!isLoaded && blurSrc && (
                <img
                    src={blurSrc}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-60"
                />
            )}

            {/* 2. High-Res Progressive Image */}
            <img
                src={defaultSrc}
                srcSet={srcSet}
                sizes={sizes}
                alt={alt}
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
                onError={(e) => {
                    // If Supabase Image API throws 400 (e.g., transformations not enabled),
                    // fallback to the raw original URL safely immediately.
                    setHasError(true);
                    e.target.src = src;
                    e.target.srcset = '';
                }}
                className={`${className} transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
        </div>
    );
};

export default OptimizedImage;
