import { useState, useEffect } from 'react';

/**
 * Custom hook for persisting form data to localStorage
 * @param key - The localStorage key to use
 * @param initialValue - The initial value for the form
 * @returns [value, setValue] - Similar to useState but with persistence
 */
export function useFormPersistence<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage whenever the value changes
  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const newValue = typeof value === 'function' ? (value as (prev: T) => T)(storedValue) : value;
      setStoredValue(newValue);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(newValue));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Clear localStorage when component unmounts (optional - you might want to keep it)
  useEffect(() => {
    return () => {
      // Uncomment the line below if you want to clear the data when the component unmounts
      // localStorage.removeItem(key);
    };
  }, [key]);

  return [storedValue, setValue];
}

/**
 * Clear form data from localStorage
 * @param key - The localStorage key to clear
 */
export function clearFormData(key: string): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error clearing localStorage key "${key}":`, error);
    }
  }
}
