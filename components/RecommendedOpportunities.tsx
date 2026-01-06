"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface RecommendedOpportunity {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time?: string;
  needed: number;
  organizations: { name: string }[];
  closed?: boolean;
  photos?: { url: string; description?: string }[];
  cause_tags: string[];
  skills_needed: string[];
  is_remote: boolean;
  duration_hours: number;
  frequency: string;
  match_score: number;
  match_reasons: string[];
}

export default function RecommendedOpportunities() {
  const t = useTranslations();
  const [recommendations, setRecommendations] = useState<RecommendedOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPreferences, setUserPreferences] = useState<any>(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

  async function loadRecommendations() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Load user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!preferences) {
      setLoading(false);
      return;
    }

    setUserPreferences(preferences);

    // Build the query with preference-based filtering
    let query = supabase
      .from('opportunities')
      .select(`
        id, title, description, location, start_time, end_time, needed, closed, photos,
        cause_tags, skills_needed, is_remote, duration_hours, frequency,
        organizations(name)
      `)
      .gte('start_time', new Date().toISOString())
      // Treat null as open; include rows where closed is null or false
      .or('closed.is.null,closed.eq.false');

    // Apply preference filters
    if (preferences.interests && preferences.interests.length > 0) {
      query = query.overlaps('cause_tags', preferences.interests);
    }
 
    // Do not hard-filter by skills at the query level; use skills in scoring so
    // opportunities that match interests still surface even if skills differ
 
    if (preferences.remote_ok === false) {
      query = query.eq('is_remote', false);
    }
 
    if (preferences.time_commitment && preferences.time_commitment !== 'flexible') {
      query = query.eq('frequency', preferences.time_commitment);
    }

    const { data: opportunities, error } = await query.order('start_time');

    if (error) {
      console.error('Error loading recommendations:', error);
      setLoading(false);
      return;
    }

    // Calculate match scores and reasons
    const scoredOpportunities = opportunities?.map(opp => {
      const { score, reasons } = calculateMatchScore(opp, preferences);
      return {
        ...opp,
        match_score: score,
        match_reasons: reasons
      };
    }) || [];

    // Sort by match score and take top 6
    const sortedRecommendations = scoredOpportunities
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 6);

    setRecommendations(sortedRecommendations);
    setLoading(false);
  }

  function calculateMatchScore(opportunity: any, preferences: any): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Interest matching (40% of score)
    if (preferences.interests && opportunity.cause_tags) {
      const matchingInterests = preferences.interests.filter((interest: string) =>
        opportunity.cause_tags.includes(interest)
      );
      if (matchingInterests.length > 0) {
        score += (matchingInterests.length / preferences.interests.length) * 40;
        reasons.push(`Matches your interests: ${matchingInterests.join(', ')}`);
      }
    }

    // Skills matching (30% of score)
    if (preferences.skills && opportunity.skills_needed) {
      const matchingSkills = preferences.skills.filter((skill: string) =>
        opportunity.skills_needed.includes(skill)
      );
      if (matchingSkills.length > 0) {
        score += (matchingSkills.length / preferences.skills.length) * 30;
        reasons.push(`Uses your skills: ${matchingSkills.join(', ')}`);
      }
    }

    // Remote preference matching (15% of score)
    if (preferences.remote_ok !== undefined) {
      if (opportunity.is_remote === preferences.remote_ok) {
        score += 15;
        reasons.push(opportunity.is_remote ? 'Remote work matches your preference' : 'In-person work matches your preference');
      }
    }

    // Time commitment matching (15% of score)
    if (preferences.time_commitment && opportunity.frequency) {
      if (opportunity.frequency === preferences.time_commitment) {
        score += 15;
        reasons.push(`Time commitment matches your preference`);
      }
    }

    return { score: Math.round(score), reasons };
  }

  function formatTime(timeStr: string) {
    const date = new Date(timeStr);
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-neutral-900 dark:to-neutral-800 border border-blue-200 dark:border-neutral-800 rounded-xl p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
            <span className="text-white text-sm">✨</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('opportunities.recommendedForYou')}</h3>
        </div>
        <div className="text-center py-4">
          <div className="animate-pulse text-gray-500 dark:text-gray-400">{t('opportunities.findingRecommendations')}</div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-neutral-900 dark:to-neutral-800 border border-blue-200 dark:border-neutral-800 rounded-xl p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
            <span className="text-white text-sm">✨</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('opportunities.recommendedForYou')}</h3>
        </div>
        <div className="text-center py-4">
          <div className="text-gray-500 dark:text-gray-400 mb-2">{t('opportunities.completePreferences')}</div>
          <Link href="/profile" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium">
            {t('opportunities.setPreferences')} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-neutral-900 dark:to-neutral-800 border border-blue-200 dark:border-neutral-800 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
            <span className="text-white text-sm">✨</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('opportunities.recommendedForYou')}</h3>
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">{t('opportunities.recommendationsCount', { count: recommendations.length })}</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((opp) => {
          const firstPhoto = Array.isArray(opp.photos) && opp.photos.length > 0 ? opp.photos[0].url : null;
          
          return (
            <Link
              key={opp.id}
              href={`/opportunity/${opp.id}`}
              className="block bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
            >
              {/* Image section */}
              <div className="relative">
                {firstPhoto ? (
                  <img
                    src={firstPhoto}
                    alt={opp.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center">
                    <div className="text-gray-400 text-4xl">🎯</div>
                  </div>
                )}
                
                {/* Match score badge */}
                <div className="absolute top-2 right-2">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                    {opp.match_score}% match
                  </span>
                </div>
                
                {/* Perfect match indicator */}
                {opp.match_score >= 90 && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      ⭐ Perfect
                    </span>
                  </div>
                )}
              </div>
              
              {/* Content section */}
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                  {opp.title}
                </h4>
                
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {opp.location && <span className="block">📍 {opp.location}</span>}
                  <span className="block">📅 {formatTime(opp.start_time)}</span>
                  {opp.organizations?.[0]?.name && (
                    <span className="block">🏢 {opp.organizations[0].name}</span>
                  )}
                </div>
                
                {/* Match reasons */}
                {opp.match_reasons.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Why this matches you:</div>
                    <div className="space-y-1">
                      {opp.match_reasons.slice(0, 2).map((reason, index) => (
                        <div key={index} className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 dark:from-neutral-800 dark:to-neutral-700 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full">
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {opp.cause_tags?.slice(0, 2).map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                  {opp.is_remote && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      🌐 Remote
                    </span>
                  )}
                </div>
                
                {/* Action button */}
                <div className="pt-2 border-t border-gray-100 dark:border-neutral-800">
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    View Details →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 