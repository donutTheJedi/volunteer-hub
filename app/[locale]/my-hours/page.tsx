"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTranslations } from "next-intl";

type VolunteerHour = {
  id: string;
  hours_awarded: number;
  awarded_at: string;
  notes: string;
  opportunities: {
    title: string;
    start_time: string;
    organizations: {
      name: string;
    }[];
  }[];
};

export default function MyHoursPage() {
  const t = useTranslations();
  const router = useRouter();
  const [hours, setHours] = useState<VolunteerHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalHours, setTotalHours] = useState(0);

  useEffect(() => {
    loadMyHours();
  }, []);

  async function loadMyHours() {
    setLoading(true);
    setError("");

    try {
      // Check if user is logged in
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Get user's volunteer hours with opportunity details
      const { data: hoursData, error: hoursError } = await supabase
        .from("volunteer_hours")
        .select(`
          id,
          hours_awarded,
          awarded_at,
          notes,
          opportunities!inner (
            title,
            start_time,
            organizations!inner (name)
          )
        `)
        .eq("user_id", user.id)
        .order("awarded_at", { ascending: false });

      if (hoursError) {
        setError(t('myHours.failedToLoad'));
        setLoading(false);
        return;
      }

      setHours(hoursData || []);
      
      // Calculate total hours
      const total = (hoursData || []).reduce((sum, record) => sum + record.hours_awarded, 0);
      setTotalHours(total);
      
      setLoading(false);
    } catch (err) {
      console.error("Error loading volunteer hours:", err);
      setError(t('myHours.failedToLoadData'));
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('myHours.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl font-semibold mb-4">⚠️ {t('common.error')}</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => router.back()}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-neutral-800">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">⏰ {t('myHours.myVolunteerHours')}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t('myHours.trackServiceAndImpact')}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">
                {totalHours.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('myHours.totalHours')}</div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 border border-gray-200 dark:border-neutral-800">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('myHours.totalOpportunities')}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{hours.length}</div>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 border border-gray-200 dark:border-neutral-800">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('myHours.averageHoursPerEvent')}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {hours.length > 0 ? (totalHours / hours.length).toFixed(1) : '0'}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 border border-gray-200 dark:border-neutral-800">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('myHours.thisMonth')}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {hours
                .filter(h => new Date(h.awarded_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1))
                .reduce((sum, h) => sum + h.hours_awarded, 0)
                .toFixed(1)}
            </div>
          </div>
        </div>

        {/* Hours History */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-800">
          <div className="p-6 border-b border-gray-200 dark:border-neutral-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('myHours.volunteerHistory')}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              {t('myHours.serviceRecordAndHours')}
            </p>
          </div>
          
          {hours.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium mb-2">{t('myHours.noVolunteerHoursYet')}</h3>
              <p className="mb-4">{t('myHours.startVolunteeringToBuildRecord')}</p>
              <button
                onClick={() => router.push("/opportunities")}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                {t('myHours.findOpportunities')}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-neutral-800">
              {hours.map((record) => (
                <div key={record.id} className="p-6 hover:bg-gray-50 dark:hover:bg-neutral-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <span className="text-xl">🏆</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {record.opportunities[0]?.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {record.opportunities[0]?.organizations[0]?.name}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>
                              📅 {new Date(record.opportunities[0]?.start_time).toLocaleDateString()}
                            </span>
                            <span>
                              ⏰ {new Date(record.awarded_at).toLocaleDateString()}
                            </span>
                          </div>
                          {record.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                              "{record.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {record.hours_awarded.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('myHours.hours')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        {hours.length > 0 && (
          <div className="mt-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            <p>
              {t('myHours.hoursAutomaticallyAwarded')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 