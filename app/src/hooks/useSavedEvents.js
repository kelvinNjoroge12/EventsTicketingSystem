import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'eventhub_saved_events';

const normalizeEntry = (entry) => {
  if (!entry) return null;
  if (typeof entry === 'string') {
    return { slug: entry, id: null };
  }
  if (typeof entry === 'object') {
    const slug = typeof entry.slug === 'string' ? entry.slug : null;
    const id = entry.id ?? entry.eventId ?? null;
    if (!slug && (id === null || id === undefined)) return null;
    return { slug, id: id ?? null };
  }
  return null;
};

const normalizeList = (list) => {
  if (!Array.isArray(list)) return [];
  const map = new Map();
  list.forEach((item) => {
    const entry = normalizeEntry(item);
    if (!entry) return;
    const key = entry.id != null ? `id:${entry.id}` : `slug:${entry.slug}`;
    // Prefer entries that include both id and slug when possible
    const existing = map.get(key);
    if (!existing || (!existing.slug && entry.slug)) {
      map.set(key, entry);
    }
  });
  return Array.from(map.values());
};

// Read from local storage safely
const getSavedEvents = () => {
  try {
    const item = window.localStorage.getItem(STORAGE_KEY);
    const parsed = item ? JSON.parse(item) : [];
    return normalizeList(parsed);
  } catch (error) {
    console.error('Error reading saved events:', error);
    return [];
  }
};

const useSavedEvents = () => {
  const [savedEvents, setSavedEvents] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initially
  useEffect(() => {
    setSavedEvents(getSavedEvents());
    setIsLoaded(true);
  }, []);

  // Listen for storage events (across tabs) and custom events (same tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      // e.key is undefined for custom events, but matches STORAGE_KEY for native storage events
      if (e.key === STORAGE_KEY || e.type === 'local-storage-sync') {
        setSavedEvents(getSavedEvents());
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-sync', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-sync', handleStorageChange);
    };
  }, []);

  // Wrap setSavedEvents to also update localStorage and dispatch a custom event for the same tab
  const setAndSaveEvents = useCallback((updater) => {
    setSavedEvents((prev) => {
      const newValueRaw = typeof updater === 'function' ? updater(prev) : updater;
      const newValue = normalizeList(newValueRaw);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue));
        // Dispatch custom event so other hooks in the SAME tab update
        window.dispatchEvent(new Event('local-storage-sync'));
      } catch (error) {
        console.error('Error saving events:', error);
      }
      return newValue;
    });
  }, []);

  const toggleSave = useCallback((input) => {
    const entry = normalizeEntry(input);
    if (!entry) return;
    setAndSaveEvents((prev) => {
      const matches = (saved) => {
        if (entry.id != null && saved.id != null) return saved.id === entry.id;
        if (entry.slug && saved.slug) return saved.slug === entry.slug;
        return false;
      };
      const existingIndex = prev.findIndex(matches);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated.splice(existingIndex, 1);
        return updated;
      }
      return [...prev, entry];
    });
  }, [setAndSaveEvents]);

  const isSaved = useCallback((input) => {
    const entry = normalizeEntry(input);
    if (!entry) return false;
    return savedEvents.some((saved) => {
      if (entry.id != null && saved.id != null) return saved.id === entry.id;
      if (entry.slug && saved.slug) return saved.slug === entry.slug;
      return false;
    });
  }, [savedEvents]);

  const saveEvent = useCallback((input) => {
    const entry = normalizeEntry(input);
    if (!entry) return;
    setAndSaveEvents((prev) => {
      const exists = prev.some((saved) => {
        if (entry.id != null && saved.id != null) return saved.id === entry.id;
        if (entry.slug && saved.slug) return saved.slug === entry.slug;
        return false;
      });
      return exists ? prev : [...prev, entry];
    });
  }, [setAndSaveEvents]);

  const unsaveEvent = useCallback((input) => {
    const entry = normalizeEntry(input);
    if (!entry) return;
    setAndSaveEvents((prev) => prev.filter((saved) => {
      if (entry.id != null && saved.id != null) return saved.id !== entry.id;
      if (entry.slug && saved.slug) return saved.slug !== entry.slug;
      return true;
    }));
  }, [setAndSaveEvents]);

  const clearSavedEvents = useCallback(() => {
    setAndSaveEvents([]);
  }, [setAndSaveEvents]);

  return {
    savedEvents,
    toggleSave,
    isSaved,
    saveEvent,
    unsaveEvent,
    clearSavedEvents,
    savedCount: savedEvents.length,
    isLoaded
  };
};

export default useSavedEvents;
