"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslations } from 'next-intl';

interface Filters {
  cause_tags: string[];
  skills_needed: string[];
  is_remote: boolean | null;
  time_commitment: string[];
  location: string;
  date_range: 'all' | 'today' | 'week' | 'month';
}

interface OpportunityFiltersProps {
  onFiltersChange: (filters: Filters) => void;
  currentFilters: Filters;
}

const CAUSE_TAGS = [
  'animals', 'environment', 'tech', 'elderly', 'art', 'education', 
  'health', 'homelessness', 'hunger', 'children', 'disabilities', 
  'community', 'sports', 'music', 'literacy', 'conservation'
];

const SKILLS_NEEDED = [
  'publicSpeaking', 'socialMedia', 'coding', 'organizing', 'teaching',
  'cooking', 'driving', 'photography', 'writing', 'translation',
  'medical', 'construction', 'gardening', 'mentoring', 'fundraising'
];

const TIME_COMMITMENT_OPTIONS = [
  'one-off', 'weekly', 'monthly', 'ongoing'
];

export default function OpportunityFilters({ onFiltersChange, currentFilters }: OpportunityFiltersProps) {
  const t = useTranslations();
  
  const DATE_RANGE_OPTIONS = [
    { value: 'all', label: t('opportunities.allDates') },
    { value: 'today', label: t('opportunities.today') },
    { value: 'week', label: t('opportunities.thisWeek') },
    { value: 'month', label: t('opportunities.thisMonth') }
  ];
  const [isOpen, setIsOpen] = useState(false);
  const [userPreferences, setUserPreferences] = useState<any>(null);

  useEffect(() => {
    loadUserPreferences();
  }, []);

  async function loadUserPreferences() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setUserPreferences(data);
    }
  }

  function toggleArrayItem(array: string[], item: string): string[] {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  }

  function updateFilters(updates: Partial<Filters>) {
    const newFilters = { ...currentFilters, ...updates };
    onFiltersChange(newFilters);
  }

  function clearAllFilters() {
    const clearedFilters: Filters = {
      cause_tags: [],
      skills_needed: [],
      is_remote: null,
      time_commitment: [],
      location: '',
      date_range: 'all'
    };
    onFiltersChange(clearedFilters);
  }

  function applyUserPreferences() {
    if (!userPreferences) return;

    const preferenceFilters: Filters = {
      cause_tags: userPreferences.interests || [],
      skills_needed: userPreferences.skills || [],
      is_remote: userPreferences.remote_ok,
      time_commitment: [userPreferences.time_commitment],
      location: userPreferences.location_preference || '',
      date_range: 'all'
    };
    onFiltersChange(preferenceFilters);
  }

  const activeFiltersCount = [
    currentFilters.cause_tags.length,
    currentFilters.skills_needed.length,
    currentFilters.time_commitment.length,
    currentFilters.is_remote !== null ? 1 : 0,
    currentFilters.location ? 1 : 0,
    currentFilters.date_range !== 'all' ? 1 : 0
  ].reduce((sum, count) => sum + count, 0);

  return (
    <div className="mb-6">
      {/* Simple filter toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-neutral-700 transition"
          >
            <span>🔍</span>
            <span>{isOpen ? t('opportunities.hideFilters') : t('opportunities.showFilters')}</span>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
          
          {userPreferences && (
            <button
              onClick={applyUserPreferences}
              className="px-3 py-2 text-sm bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900 transition"
            >
              {t('opportunities.applyPreferences')}
            </button>
          )}
        </div>
        
        {activeFiltersCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="px-3 py-2 text-sm bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900 transition"
          >
            {t('opportunities.clearAll')}
          </button>
        )}
      </div>

      {/* Collapsible filter panel */}
      {isOpen && (
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Quick filters */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{t('opportunities.filters')}</h4>
              <div className="space-y-2">
                <button
                  onClick={() => updateFilters({ is_remote: true })}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                    currentFilters.is_remote === true
                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                      : 'bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-neutral-800 hover:border-purple-300'
                  }`}
                >
                  🌐 {t('opportunities.remote')}
                </button>
                <button
                  onClick={() => updateFilters({ is_remote: false })}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                    currentFilters.is_remote === false
                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                      : 'bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-neutral-800 hover:border-purple-300'
                  }`}
                >
                  📍 {t('opportunities.inPerson')}
                </button>
                <button
                  onClick={() => updateFilters({ date_range: 'today' })}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                    currentFilters.date_range === 'today'
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                      : 'bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-neutral-800 hover:border-yellow-300'
                  }`}
                >
                  📅 {t('opportunities.today')}
                </button>
              </div>
            </div>

            {/* Location */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{t('opportunities.location')}</h4>
              <input
                type="text"
                value={currentFilters.location}
                onChange={(e) => updateFilters({ location: e.target.value })}
                placeholder={t('opportunities.enterCityOrArea')}
                className="w-full p-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date Range */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{t('opportunities.dateRange')}</h4>
              <div className="grid grid-cols-2 gap-2">
                {DATE_RANGE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateFilters({ date_range: option.value as any })}
                    className={`p-2 rounded text-sm transition ${
                      currentFilters.date_range === option.value
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        : 'bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-neutral-800 hover:border-yellow-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced filters (collapsed by default) */}
          <details className="mt-6">
            <summary className="cursor-pointer font-medium text-gray-900 dark:text-gray-100 mb-3">
              {t('opportunities.filters')}
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
              {/* Cause Tags */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{t('opportunities.causes')}</h4>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {CAUSE_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => updateFilters({
                        cause_tags: toggleArrayItem(currentFilters.cause_tags, tag)
                      })}
                      className={`p-2 rounded text-sm transition ${
                        currentFilters.cause_tags.includes(tag)
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-neutral-800 hover:border-green-300'
                      }`}
                    >
                      {t(`causes.${tag}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills Needed */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{t('opportunities.skills')}</h4>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {SKILLS_NEEDED.map(skill => (
                    <button
                      key={skill}
                      onClick={() => updateFilters({
                        skills_needed: toggleArrayItem(currentFilters.skills_needed, skill)
                      })}
                      className={`p-2 rounded text-sm transition ${
                        currentFilters.skills_needed.includes(skill)
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-neutral-800 hover:border-blue-300'
                      }`}
                    >
                      {t(`skills.${skill}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
} 