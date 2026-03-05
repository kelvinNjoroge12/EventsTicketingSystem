/**
 * imageUtils.js — Supabase Image Transformation Utilities
 *
 * Supabase Storage supports real-time image transformations via URL params on the
 * /render/image/authenticated/ or /object/public/ endpoints.
 *
 * Supported params:
 *   width, height         – resize (maintains aspect ratio if only one given)
 *   quality               – 1-100 (default 80)
 *   format                – 'webp' | 'png' | 'jpg' | 'origin'
 *   resize                – 'cover' | 'contain' | 'fill'
 *
 * Docs: https://supabase.com/docs/guides/storage/serving/image-transformations
 */

const SUPABASE_HOSTS = [
    'supabase.co',
    'supabase.in',
];

/**
 * Returns true if a URL is hosted on Supabase Storage.
 */
export function isSupabaseUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const host = new URL(url).hostname;
        return SUPABASE_HOSTS.some(h => host.endsWith(h));
    } catch {
        return false;
    }
}

/**
 * Appends Supabase image transformation parameters to a storage URL.
 *
 * @param {string} url      — original Supabase storage URL
 * @param {object} options  — { width, height, quality, format, resize }
 * @returns {string}        — transformed URL or the original URL unchanged
 */
export function getSupabaseImageUrl(url, options = {}) {
    if (!url || !isSupabaseUrl(url)) return url ?? '';

    const {
        width,
        height,
        quality = 80,
        format = 'webp',
        resize = 'cover',
    } = options;

    try {
        const parsed = new URL(url);
        if (width) parsed.searchParams.set('width', String(width));
        if (height) parsed.searchParams.set('height', String(height));
        parsed.searchParams.set('quality', String(quality));
        parsed.searchParams.set('format', format);
        parsed.searchParams.set('resize', resize);
        return parsed.toString();
    } catch {
        return url;
    }
}

/**
 * Returns a full srcSet string for responsive images.
 *
 * Example output:
 *   "https://…?width=400&format=webp&quality=80 400w,
 *    https://…?width=800&format=webp&quality=80 800w,
 *    https://…?width=1200&format=webp&quality=80 1200w"
 *
 * @param {string}   url       — original Supabase storage URL
 * @param {number[]} widths    — breakpoints to generate (default: 400, 768, 1200)
 * @param {number}   quality   — compression quality (default: 80)
 */
export function getSupabaseSrcSet(url, widths = [400, 768, 1200], quality = 80) {
    if (!url || !isSupabaseUrl(url)) return undefined;
    return widths
        .map(w => `${getSupabaseImageUrl(url, { width: w, quality, format: 'webp' })} ${w}w`)
        .join(', ');
}

/**
 * Preset helpers for common use cases:
 */

/** EventCard thumbnail  (card grid on homepage/search) */
export function cardImage(url) {
    return getSupabaseImageUrl(url, { width: 640, quality: 82, format: 'webp' });
}

/** Hero / banner image on EventDetailPage */
export function heroImage(url) {
    return getSupabaseImageUrl(url, { width: 1400, quality: 85, format: 'webp' });
}

/** Small avatar (organizer, speakers, attendees) */
export function avatarImage(url, size = 96) {
    return getSupabaseImageUrl(url, { width: size, height: size, quality: 80, format: 'webp', resize: 'cover' });
}

/** Sponsor logo (wide, short) */
export function logoImage(url) {
    return getSupabaseImageUrl(url, { height: 80, quality: 85, format: 'webp', resize: 'contain' });
}

/** srcSet for EventCard */
export function cardSrcSet(url) {
    return getSupabaseSrcSet(url, [320, 640, 960], 80);
}

/** srcSet for hero banner */
export function heroSrcSet(url) {
    return getSupabaseSrcSet(url, [640, 1024, 1440, 1920], 85);
}
