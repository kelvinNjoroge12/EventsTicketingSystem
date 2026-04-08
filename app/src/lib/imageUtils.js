/**
 * imageUtils.js — Image Utility Helpers
 *
 * NOTE: Supabase image transformations (width, quality, format params) require
 * a Pro plan. Since this project is on the free tier, all helper functions
 * return the original URL unchanged to avoid 400 errors from Supabase Storage.
 *
 * If you upgrade to Supabase Pro, you can re-enable transformations by
 * uncommenting the URL-rewriting logic below.
 */

/**
 * Returns the image URL as-is. Previously applied Supabase transforms,
 * but those require a paid plan and were causing 400 errors.
 */
export function getSupabaseImageUrl(url, _options = {}) {
    return url ?? '';
}

/**
 * srcSet is not available without Supabase image transformations.
 * Returns undefined so the browser just uses the `src` attribute.
 */
export function getSupabaseSrcSet(_url, _widths, _quality) {
    return undefined;
}

/** EventCard thumbnail — returns original URL */
export function cardImage(url) {
    return url ?? '';
}

/** Hero / banner image — returns original URL */
export function heroImage(url) {
    return url ?? '';
}

/** Small avatar — returns original URL */
export function avatarImage(url, _size = 96) {
    return url ?? '';
}

/** Sponsor logo — returns original URL */
export function logoImage(url) {
    return url ?? '';
}

/** srcSet for EventCard — disabled (no transforms) */
export function cardSrcSet(_url) {
    return undefined;
}

/** srcSet for hero banner — disabled (no transforms) */
export function heroSrcSet(_url) {
    return undefined;
}

/** Kept for backward compat — always returns false */
export function isSupabaseUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const host = new URL(url).hostname;
        return host.endsWith('supabase.co') || host.endsWith('supabase.in');
    } catch {
        return false;
    }
}
