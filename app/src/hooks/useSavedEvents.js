import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'eventhub_saved_events';

const useSavedEvents = () => {
  const [savedEvents, setSavedEvents] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved events from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedEvents(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading saved events:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever savedEvents changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedEvents));
      } catch (error) {
        console.error('Error saving events:', error);
      }
    }
  }, [savedEvents, isLoaded]);

  const toggleSave = useCallback((slug) => {
    setSavedEvents(prev => {
      if (prev.includes(slug)) {
        return prev.filter(s => s !== slug);
      }
      return [...prev, slug];
    });
  }, []);

  const isSaved = useCallback((slug) => {
    return savedEvents.includes(slug);
  }, [savedEvents]);

  const saveEvent = useCallback((slug) => {
    setSavedEvents(prev => {
      if (!prev.includes(slug)) {
        return [...prev, slug];
      }
      return prev;
    });
  }, []);

  const unsaveEvent = useCallback((slug) => {
    setSavedEvents(prev => prev.filter(s => s !== slug));
  }, []);

  const clearSavedEvents = useCallback(() => {
    setSavedEvents([]);
  }, []);

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
