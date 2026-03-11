import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'eventhub_saved_events';

// Read from local storage safely
const getSavedEvents = () => {
  try {
    const item = window.localStorage.getItem(STORAGE_KEY);
    return item ? JSON.parse(item) : [];
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
      const newValue = typeof updater === 'function' ? updater(prev) : updater;
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

  const toggleSave = useCallback((slug) => {
    setAndSaveEvents(prev => {
      if (prev.includes(slug)) {
        return prev.filter(s => s !== slug);
      }
      return [...prev, slug];
    });
  }, [setAndSaveEvents]);

  const isSaved = useCallback((slug) => {
    return savedEvents.includes(slug);
  }, [savedEvents]);

  const saveEvent = useCallback((slug) => {
    setAndSaveEvents(prev => (!prev.includes(slug) ? [...prev, slug] : prev));
  }, [setAndSaveEvents]);

  const unsaveEvent = useCallback((slug) => {
    setAndSaveEvents(prev => prev.filter(s => s !== slug));
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
