'use client';

import { useEffect, useRef, useState } from 'react';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

declare global {
  interface Window {
    google: any;
    googleMapsLoaded: boolean;
    googleMapsLoading: boolean;
  }
}

// Singleton to manage Google Maps API loading
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMapsAPI(): Promise<void> {
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  if (window.google && window.google.maps) {
    return Promise.resolve();
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    if (window.googleMapsLoading) {
      // Wait for existing loading to complete
      const checkLoaded = () => {
        if (window.google && window.google.maps) {
          resolve();
        } else if (!window.googleMapsLoading) {
          reject(new Error('Failed to load Google Maps API'));
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    window.googleMapsLoading = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.googleMapsLoaded = true;
      window.googleMapsLoading = false;
      resolve();
    };
    script.onerror = () => {
      window.googleMapsLoading = false;
      reject(new Error('Failed to load Google Maps API'));
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  placeholder = "Location",
  className = "border border-gray-300 dark:border-gray-600 p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
  required = false
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(value);

  // Update internal state when prop value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Get user's current location for biasing autocomplete
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(coords);

          // Reverse geocode to get country code
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`;
          fetch(geocodeUrl)
            .then(res => res.json())
            .then(data => {
              if (data.status === 'OK') {
                const countryComponent = data.results[0].address_components.find((comp: any) => comp.types.includes('country'));
                if (countryComponent) {
                  setCountryCode(countryComponent.short_name.toLowerCase());
                }
              }
            })
            .catch(() => setCountryCode(null));
        },
        () => {
          setUserLocation(null); // fallback to no bias
          setCountryCode(null);
        }
      );
    }
  }, []);

  useEffect(() => {
    loadGoogleMapsAPI()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load Google Maps API:', error);
      });
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    // Set up options with location bias and country restriction if available
    const options: any = {
      // Allow general geocoding results; adjust types if you only want cities/regions
      types: ['establishment', 'geocode'],
      // Ensure we receive these properties from the Places API
      fields: ['formatted_address', 'geometry', 'name']
    };
    if (userLocation) {
      options.location = new window.google.maps.LatLng(userLocation.lat, userLocation.lng);
      options.radius = 10000; // 10km radius
    }
    if (countryCode) {
      options.componentRestrictions = { country: countryCode };
    }

    // Initialize once per load/bias settings
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, options);

    const handlePlaceChanged = () => {
      const place = autocompleteRef.current.getPlace();

      // Prefer formatted address, fall back to name or current input value
      const formattedAddress = place?.formatted_address || place?.name || inputRef.current?.value || '';

      // Update both internal state and parent component
      setInputValue(formattedAddress);
      onChange(formattedAddress);

      // Optional: log coordinates if available
      if (place && place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        console.log('Selected location:', { address: formattedAddress, lat, lng });
      }
    };

    const listener = autocompleteRef.current.addListener('place_changed', handlePlaceChanged);

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.removeListener(listener);
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
    // Intentionally exclude onChange to avoid re-initializing on each render
  }, [isLoaded, userLocation, countryCode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleBlur = () => {
    // On blur, ensure parent has the current visible value
    if (inputRef.current) {
      const current = inputRef.current.value;
      if (current !== value) {
        onChange(current);
      }
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      value={inputValue}
      onChange={handleInputChange}
      onBlur={handleBlur}
      className={className}
      required={required}
      autoComplete="off"
    />
  );
} 