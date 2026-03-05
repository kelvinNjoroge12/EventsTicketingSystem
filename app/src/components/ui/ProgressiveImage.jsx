/**
 * ProgressiveImage
 * ─────────────────
 * A drop-in replacement for <img /> that:
 *   1. Shows a dominant-colour blurred placeholder while the real image loads.
 *   2. Fades the real image in smoothly once loaded (no layout shift).
 *   3. Optionally accepts srcSet for responsive images.
 *   4. Falls back to a gradient placeholder when no src is given or when the image errors.
 *
 * Usage:
 *   <ProgressiveImage
 *     src={cardImage(event.coverImage)}
 *     srcSet={cardSrcSet(event.coverImage)}
 *     sizes="(max-width: 768px) 100vw, 50vw"
 *     alt={event.title}
 *     placeholderColor={event.themeColor}
 *     className="w-full h-full object-cover"
 *   />
 */

import React, { useState, useRef, useEffect } from 'react';

const ProgressiveImage = ({
    src,
    srcSet,
    sizes,
    alt = '',
    className = '',
    placeholderColor = '#1E4DB7',
    accentColor,
    style = {},
    loading = 'lazy',
    fetchpriority,
    width,
    height,
    onLoad,
    onError,
    ...rest
}) => {
    const [status, setStatus] = useState('idle'); // idle | loading | loaded | error
    const imgRef = useRef(null);

    // If the browser already has the image in cache, it fires onLoad
    // synchronously before React finishes mounting. Handle this edge case.
    useEffect(() => {
        const img = imgRef.current;
        if (img && img.complete && img.naturalWidth > 0) {
            setStatus('loaded');
        }
    }, [src]);

    const handleLoad = (e) => {
        setStatus('loaded');
        onLoad?.(e);
    };

    const handleError = (e) => {
        setStatus('error');
        onError?.(e);
    };

    const handleStartLoad = () => {
        if (status === 'idle') setStatus('loading');
    };

    const gradient =
        accentColor
            ? `linear-gradient(135deg, ${placeholderColor}CC, ${accentColor}CC)`
            : `linear-gradient(135deg, ${placeholderColor}99, ${placeholderColor}55)`;

    const isLoaded = status === 'loaded';
    const hasError = status === 'error';

    return (
        <span
            className="relative block overflow-hidden"
            style={{ ...style }}
            {...rest}
        >
            {/* ── Placeholder Layer ── */}
            <span
                aria-hidden="true"
                className="absolute inset-0 transition-opacity duration-700"
                style={{
                    background: gradient,
                    opacity: isLoaded ? 0 : 1,
                    filter: 'blur(0px)',
                    zIndex: 1,
                }}
            >
                {/* Shimmer animation while loading */}
                {!hasError && (
                    <span
                        className="absolute inset-0 animate-shimmer"
                        style={{
                            background:
                                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
                            backgroundSize: '200% 100%',
                        }}
                    />
                )}
            </span>

            {/* ── Actual Image ── */}
            {src && !hasError && (
                <img
                    ref={imgRef}
                    src={src}
                    srcSet={srcSet}
                    sizes={sizes}
                    alt={alt}
                    width={width}
                    height={height}
                    loading={loading}
                    fetchpriority={fetchpriority}
                    decoding="async"
                    className={`relative z-10 transition-opacity duration-500 ${className}`}
                    style={{ opacity: isLoaded ? 1 : 0 }}
                    onLoadStart={handleStartLoad}
                    onLoad={handleLoad}
                    onError={handleError}
                />
            )}
        </span>
    );
};

export default ProgressiveImage;
