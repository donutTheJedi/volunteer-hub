"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OpportunityFilters from "@/components/OpportunityFilters";
import RecommendedOpportunities from "@/components/RecommendedOpportunities";
import { useTranslations } from "next-intl";

function formatTime(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString(undefined, {
    hour: 'numeric', minute: 'numeric'
  });
}

type Opp = {
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
  cause_tags?: string[];
  skills_needed?: string[];
  is_remote?: boolean;
  duration_hours?: number;
  frequency?: string;
};

interface Filters {
  cause_tags: string[];
  skills_needed: string[];
  is_remote: boolean | null;
  time_commitment: string[];
  location: string;
  date_range: 'all' | 'today' | 'week' | 'month';
}

// Photo Carousel Component
function PhotoCarousel({ photos, title }: { photos: { url: string; description?: string }[]; title: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const goToPhoto = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    } else if (isRightSwipe) {
      setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center">
        <div className="text-gray-400 text-4xl">🎯</div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-48 overflow-hidden rounded-lg"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Photos */}
      <div className="flex transition-transform duration-300 ease-in-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
        {photos.map((photo, index) => (
          <div key={index} className="w-full h-48 flex-shrink-0">
            <img
              src={photo.url}
              alt={photo.description || `${title} photo ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows (desktop only) */}
      {photos.length > 1 && (
        <>
          <button
            onClick={prevPhoto}
            className="hidden md:block absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            aria-label="Previous photo"
          >
            ←
          </button>
          <button
            onClick={nextPhoto}
            className="hidden md:block absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            aria-label="Next photo"
          >
            →
          </button>
        </>
      )}

      {/* Photo indicators */}
      {photos.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={(e) => goToPhoto(index, e)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'
              }`}
              aria-label={`Go to photo ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Photo counter */}
      {photos.length > 1 && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          {currentIndex + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}

export default function OpportunitiesPage() {
  const router = useRouter();
  const t = useTranslations();
  const [opps, setOpps] = useState<Opp[]>([]);
  const [filteredOpps, setFilteredOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSignups, setUserSignups] = useState<string[]>([]);
  const [signupsCount, setSignupsCount] = useState<{ [oppId: string]: number }>({});
  const [filters, setFilters] = useState<Filters>({
    cause_tags: [],
    skills_needed: [],
    is_remote: null,
    time_commitment: [],
    location: '',
    date_range: 'all'
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          id, title, description, location, start_time, end_time, needed, closed, 
          organizations(name), photos, cause_tags, skills_needed, is_remote, 
          duration_hours, frequency
        `)
        .gte('start_time', new Date().toISOString()) // Only show opportunities that haven't started yet
        .order('start_time');
      if (error) {
        console.error('Error loading opportunities:', error);
      } else {
        console.log('Loaded opportunities:', data?.length || 0);
      }
      setOpps(data ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  // Apply filters whenever filters or opportunities change
  useEffect(() => {
    let filtered = [...opps];

    // Apply cause tags filter
    if (filters.cause_tags.length > 0) {
      filtered = filtered.filter(opp => 
        opp.cause_tags && opp.cause_tags.some(tag => filters.cause_tags.includes(tag))
      );
    }

    // Apply skills filter
    if (filters.skills_needed.length > 0) {
      filtered = filtered.filter(opp => 
        opp.skills_needed && opp.skills_needed.some(skill => filters.skills_needed.includes(skill))
      );
    }

    // Apply remote filter
    if (filters.is_remote !== null) {
      filtered = filtered.filter(opp => opp.is_remote === filters.is_remote);
    }

    // Apply time commitment filter
    if (filters.time_commitment.length > 0) {
      filtered = filtered.filter(opp => 
        opp.frequency && filters.time_commitment.includes(opp.frequency)
      );
    }

    // Apply location filter
    if (filters.location) {
      filtered = filtered.filter(opp => 
        opp.location && opp.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Apply date range filter
    const now = new Date();
    switch (filters.date_range) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        filtered = filtered.filter(opp => {
          const oppDate = new Date(opp.start_time);
          return oppDate >= today && oppDate < tomorrow;
        });
        break;
      case 'week':
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(opp => {
          const oppDate = new Date(opp.start_time);
          return oppDate <= weekFromNow;
        });
        break;
      case 'month':
        const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(opp => {
          const oppDate = new Date(opp.start_time);
          return oppDate <= monthFromNow;
        });
        break;
    }

    setFilteredOpps(filtered);
  }, [opps, filters]);

  useEffect(() => {
    async function fetchSignups() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('signups')
        .select('opportunity_id')
        .eq('user_id', user.id);

      if (data) {
        setUserSignups(data.map(s => s.opportunity_id));
      }
    }

    async function fetchSignupsCount() {
      const { data } = await supabase
        .from('signups')
        .select('opportunity_id');

      if (data) {
        const counts: { [oppId: string]: number } = {};
        data.forEach(signup => {
          counts[signup.opportunity_id] = (counts[signup.opportunity_id] || 0) + 1;
        });
        setSignupsCount(counts);
      }
    }

    fetchSignups();
    fetchSignupsCount();
  }, []);

  async function handleRemoveSignup(oppId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('signups')
      .delete()
      .eq('opportunity_id', oppId)
      .eq('user_id', user.id);

    if (!error) {
      setUserSignups(prev => prev.filter(id => id !== oppId));
      setSignupsCount((prev) => ({ ...prev, [oppId]: (prev[oppId] ?? 1) - 1 }));
    }
  }

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('opportunities.title')}</h1>
      
      {/* Recommended Opportunities Section */}
      <RecommendedOpportunities />
      
      {/* Filters Section */}
      <OpportunityFilters 
        onFiltersChange={setFilters}
        currentFilters={filters}
      />

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {filteredOpps.length} {t('opportunities.title').toLowerCase()}
      </div>

      {loading && (
        <div className="py-4">
          <div className="mb-4 h-6 w-40 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                <div className="w-full h-48 bg-gray-200 dark:bg-neutral-800 animate-pulse" />
                <div className="p-4">
                  <div className="h-5 w-56 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse mb-3" />
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-gray-100 dark:bg-neutral-700 rounded animate-pulse" />
                    <div className="h-4 w-28 bg-gray-100 dark:bg-neutral-700 rounded animate-pulse" />
                    <div className="h-4 w-48 bg-gray-100 dark:bg-neutral-700 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!loading && filteredOpps.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            {opps.length === 0 ? t('opportunities.noOpportunities') : t('opportunities.noMatches')}
          </p>
          {opps.length > 0 && (
            <button
              onClick={() => setFilters({
                cause_tags: [],
                skills_needed: [],
                is_remote: null,
                time_commitment: [],
                location: '',
                date_range: 'all'
              })}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('opportunities.clearAll')}
            </button>
          )}
        </div>
      )}
      
      {/* Results grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOpps.map((o) => {
          const spotsLeft = o.needed - (signupsCount[o.id] ?? 0);
          
          return (
            <div 
              key={o.id} 
              className="group block bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-[1.02] focus-within:ring-2 focus-within:ring-voluna-accent"
            >
              {/* Photo carousel - outside of Link */}
              <div className="relative">
                <PhotoCarousel photos={o.photos || []} title={o.title} />
                
                {/* Status overlay */}
                <div className="absolute top-2 right-2 z-10">
                  {o.closed ? (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      {t('opportunities.closed')}
                    </span>
                  ) : spotsLeft <= 0 ? (
                    <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      {t('opportunities.full')}
                    </span>
                  ) : (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      {t('opportunities.spotsLeft', { count: spotsLeft })}
                    </span>
                  )}
                </div>
              </div>

              <Link href={`/opportunity/${o.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-voluna-accent">
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                    {o.title}
                  </h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-2"><span>📅</span><span>{formatTime(o.start_time)}</span></div>
                    {o.location && <div className="flex items-center gap-2"><span>📍</span><span className="truncate">{o.location}</span></div>}
                    {o.organizations?.[0]?.name && (
                      <div className="flex items-center gap-2"><span>🏢</span><span className="truncate">{o.organizations[0].name}</span></div>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </main>
  );
} 
