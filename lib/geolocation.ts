// Country to language mapping
const COUNTRY_TO_LANGUAGE: Record<string, 'en' | 'es' | 'pt'> = {
  // English-speaking countries
  'US': 'en', // United States
  'CA': 'en', // Canada
  'GB': 'en', // United Kingdom
  'AU': 'en', // Australia
  'NZ': 'en', // New Zealand
  'IE': 'en', // Ireland
  
  // Spanish-speaking countries
  'MX': 'es', // Mexico
  'ES': 'es', // Spain
  'AR': 'es', // Argentina
  'CO': 'es', // Colombia
  'PE': 'es', // Peru
  'VE': 'es', // Venezuela
  'CL': 'es', // Chile
  'EC': 'es', // Ecuador
  'GT': 'es', // Guatemala
  'CU': 'es', // Cuba
  'BO': 'es', // Bolivia
  'DO': 'es', // Dominican Republic
  'HN': 'es', // Honduras
  'PY': 'es', // Paraguay
  'SV': 'es', // El Salvador
  'NI': 'es', // Nicaragua
  'CR': 'es', // Costa Rica
  'PA': 'es', // Panama
  'UY': 'es', // Uruguay
  'GQ': 'es', // Equatorial Guinea
  
  // Portuguese-speaking countries
  'BR': 'pt', // Brazil
  'PT': 'pt', // Portugal
  'AO': 'pt', // Angola
  'MZ': 'pt', // Mozambique
  'CV': 'pt', // Cape Verde
  'GW': 'pt', // Guinea-Bissau
  'ST': 'pt', // São Tomé and Príncipe
  'TL': 'pt', // East Timor
  'MO': 'pt', // Macau
};

export function getLanguageFromCountry(countryCode: string): 'en' | 'es' | 'pt' {
  return COUNTRY_TO_LANGUAGE[countryCode.toUpperCase()] || 'es';
}

export async function detectUserLanguage(): Promise<'en' | 'es' | 'pt'> {
  try {
    // Use a free geolocation API to get the user's country
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    if (data.country_code) {
      return getLanguageFromCountry(data.country_code);
    }
  } catch (error) {
    console.warn('Failed to detect user location:', error);
  }
  
  // Fallback to Spanish if detection fails
  return 'es';
}

// Alternative using a different free API
export async function detectUserLanguageAlternative(): Promise<'en' | 'es' | 'pt'> {
  try {
    const response = await fetch('https://api.ipgeolocation.io/ipgeo?apiKey=free');
    const data = await response.json();
    
    if (data.country_code2) {
      return getLanguageFromCountry(data.country_code2);
    }
  } catch (error) {
    console.warn('Failed to detect user location (alternative):', error);
  }
  
  // Fallback to Spanish if detection fails
  return 'es';
} 