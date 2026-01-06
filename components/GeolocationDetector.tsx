'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { detectUserLanguage } from '@/lib/geolocation';

export default function GeolocationDetector() {
  const [showLanguageSuggestion, setShowLanguageSuggestion] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<'en' | 'es' | 'pt' | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    // Only show language suggestion if user hasn't made a choice before
    const hasChosenLanguage = localStorage.getItem('languageChoiceMade');
    if (hasChosenLanguage) return;

    const detectLanguage = async () => {
      setIsDetecting(true);
      try {
        const language = await detectUserLanguage();
        setDetectedLanguage(language);
        setShowLanguageSuggestion(true);
      } catch (error) {
        console.warn('Failed to detect language:', error);
      } finally {
        setIsDetecting(false);
      }
    };

    detectLanguage();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) { // Show after scrolling 200px
        setHasScrolled(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAcceptLanguage = () => {
    if (detectedLanguage) {
      localStorage.setItem('languageChoiceMade', 'true');
      localStorage.setItem('preferredLanguage', detectedLanguage);
      setShowLanguageSuggestion(false);
      router.push(`/${detectedLanguage}`);
    }
  };

  const handleDeclineLanguage = () => {
    localStorage.setItem('languageChoiceMade', 'true');
    setShowLanguageSuggestion(false);
  };

  if (!showLanguageSuggestion || isDetecting || !hasScrolled) {
    return null;
  }

  const languageNames = {
    en: 'English',
    es: 'Español',
    pt: 'Português'
  };

  const countryNames = {
    en: 'United States/Canada',
    es: 'Mexico',
    pt: 'Brazil'
  };

  return (
    <div className="bg-voluna-background rounded-lg p-6 my-8 shadow-sm border border-voluna-secondary">
      <div className="text-center">
        <div className="text-2xl mb-4">🌍</div>
        <h3 className="text-lg font-semibold text-voluna-primary mb-2">
          {t('geolocation.detectLanguage')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('geolocation.detectedFrom', { 
            language: languageNames[detectedLanguage!],
            country: countryNames[detectedLanguage!]
          })}
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={handleAcceptLanguage}
            className="px-6 py-2 bg-voluna-primary text-white rounded-lg hover:bg-voluna-primary-hover transition font-semibold"
          >
            {t('geolocation.useDetected', { language: languageNames[detectedLanguage!] })}
          </button>
          <button
            onClick={handleDeclineLanguage}
            className="px-6 py-2 bg-white dark:bg-neutral-900 dark:text-gray-100 border-2 border-voluna-secondary text-voluna-primary rounded-lg hover:bg-voluna-background transition font-semibold"
          >
            {t('geolocation.chooseManually')}
          </button>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          {t('geolocation.canChangeLater')}
        </p>
      </div>
    </div>
  );
} 