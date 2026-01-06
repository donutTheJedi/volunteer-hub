"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";
import InstitutionSelect from "@/components/InstitutionSelect";
import { useTranslations, useLocale } from "next-intl";

interface UserPreferences {
  interests: string[];
  availability: {
    days: string[];
    timeSlots: string[];
  };
  location_preference: string;
  location_radius_km: number;
  skills: string[];
  remote_ok: boolean;
  time_commitment: string;
}

const INTERESTS_OPTIONS = [
  'animals', 'environment', 'tech', 'elderly', 'art', 'education', 
  'health', 'homelessness', 'hunger', 'children', 'disabilities', 
  'community', 'sports', 'music', 'literacy', 'conservation'
];

const SKILLS_OPTIONS = [
  'publicSpeaking', 'socialMedia', 'coding', 'organizing', 'teaching',
  'cooking', 'driving', 'photography', 'writing', 'translation',
  'medical', 'construction', 'gardening', 'mentoring', 'fundraising'
];

const TIME_COMMITMENT_OPTIONS = [
  { value: 'one-off', label: 'One-time events' },
  { value: 'weekly', label: 'Weekly commitment' },
  { value: 'monthly', label: 'Monthly commitment' },
  { value: 'flexible', label: 'Flexible schedule' }
];

const DAYS_OPTIONS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const TIME_SLOTS = [
  'morning', 'afternoon', 'evening', 'weekends'
];

export default function ProfilePage() {
  const t = useTranslations();
  const locale = useLocale();
  const searchParams = useSearchParams();

  const getTimeCommitmentLabel = (value: string) => {
    switch (value) {
      case 'one-off':
        return t('opportunities.oneOff');
      case 'weekly':
        return t('opportunities.weekly');
      case 'monthly':
        return t('opportunities.monthly');
      case 'flexible':
        return t('timeCommitment.flexible');
      default:
        return value;
    }
  };
  const [currentStep, setCurrentStep] = useState(1);
  const [isInitialSetup, setIsInitialSetup] = useState(true);
  const [isInStepFlow, setIsInStepFlow] = useState(false);
  const [profile, setProfile] = useState({ full_name: "", phone: "", institution: "", language: "en" as 'en' | 'es' | 'pt' });
  const [preferences, setPreferences] = useState<UserPreferences>({
    interests: [],
    availability: {
      days: [],
      timeSlots: []
    },
    location_preference: '',
    location_radius_km: 10,
    skills: [],
    remote_ok: true,
    time_commitment: 'flexible'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [notVerified, setNotVerified] = useState(false);
  const [resent, setResent] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email || '');
      
      // Check if this is an onboarding flow
      const isOnboarding = searchParams.get('onboarding') === '1';
      if (isOnboarding) {
        setIsInStepFlow(true);
        setIsInitialSetup(true);
      }
      
      // Load profile data
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("full_name, phone, institution, language")
        .eq("user_id", user.id)
        .single();
      
      // Get institution from URL parameters (passed from auth callback)
      const institutionFromUrl = searchParams.get('institution');
      
      if (profileData) {
        setProfile({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
          institution: institutionFromUrl || profileData.institution || "",
          language: profileData.language || "en"
        });
      } else {
        // Fallback: prefill from auth user metadata immediately after verification
        const meta = (user.user_metadata || {}) as any;
        setProfile({
          full_name: meta.full_name || "",
          phone: meta.phone || "",
          institution: institutionFromUrl || meta.institution || "",
          language: (meta.language as 'en' | 'es' | 'pt') || "en"
        });
      }

      // Load preferences data
      const { data: preferencesData } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (preferencesData) {
        setPreferences({
          interests: preferencesData.interests || [],
          availability: preferencesData.availability || { days: [], timeSlots: [] },
          location_preference: preferencesData.location_preference || '',
          location_radius_km: preferencesData.location_radius_km || 10,
          skills: preferencesData.skills || [],
          remote_ok: preferencesData.remote_ok !== false,
          time_commitment: preferencesData.time_commitment || 'flexible'
        });
        
        // Only set to non-initial setup if profile is complete (has institution) AND preferences exist
        // AND we're not currently in the middle of the step-by-step flow
        // This ensures users go through the step-by-step flow if they don't have preferences yet
        if (profileData?.institution && preferencesData && !isInStepFlow) {
          setIsInitialSetup(false);
        } else if (profileData?.institution && !preferencesData && !isInStepFlow) {
          // If user has profile but no preferences, they should go through step flow
          setIsInitialSetup(true);
          setIsInStepFlow(true);
        }
        // If we're already in step flow, don't change the setup state
      }
      
      setLoading(false);
    }
    loadProfile();
  }, [router, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    if (!userId) return;
    
    try {
      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      // Save profile using update or insert
      let profileResult;
      if (existingProfile) {
        // Profile exists, update it
        profileResult = await supabase
          .from("user_profiles")
          .update({
            full_name: profile.full_name,
            phone: profile.phone,
            institution: profile.institution,
            language: profile.language
          })
          .eq("user_id", userId);
      } else {
        // Profile doesn't exist, insert it
        profileResult = await supabase
          .from("user_profiles")
          .insert({
            user_id: userId,
            full_name: profile.full_name,
            phone: profile.phone,
            institution: profile.institution,
            language: profile.language
          });
      }

      if (profileResult.error) {
        setError(profileResult.error.message);
        setSaving(false);
        return;
      }

      // Check if preferences exist first
      const { data: existingPreferences } = await supabase
        .from('user_preferences')
        .select("id")
        .eq('user_id', userId)
        .single();

      // Save preferences using update or insert
      let preferencesResult;
      if (existingPreferences) {
        // Preferences exist, update them
        preferencesResult = await supabase
          .from('user_preferences')
          .update({
            interests: preferences.interests,
            availability: preferences.availability,
            location_preference: preferences.location_preference,
            location_radius_km: preferences.location_radius_km,
            skills: preferences.skills,
            remote_ok: preferences.remote_ok,
            time_commitment: preferences.time_commitment
          })
          .eq('user_id', userId);
      } else {
        // Preferences don't exist, insert them
        preferencesResult = await supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            interests: preferences.interests,
            availability: preferences.availability,
            location_preference: preferences.location_preference,
            location_radius_km: preferences.location_radius_km,
            skills: preferences.skills,
            remote_ok: preferences.remote_ok,
            time_commitment: preferences.time_commitment
          });
      }

      if (preferencesResult.error) {
        setError(preferencesResult.error.message);
        setSaving(false);
        return;
      }
      
      const successMessage = t('profile.profileUpdated');
      
      // Dispatch custom event whenever profile is saved with institution (for Senior Projects tab)
      if (profile.institution && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profileCompleted', { 
          detail: { institution: profile.institution } 
        }));
      }
      
      if (isInitialSetup) {
        // Show success then redirect so users see feedback
        setSuccess(successMessage);
        setTimeout(() => router.push(`/${locale}`), 1200);
      } else {
        // Show success message for updates
        setSuccess(successMessage);
        setIsInitialSetup(false);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError("Unexpected error saving profile");
    } finally {
      setSaving(false);
    }
  }

  function toggleArrayItem(array: string[], item: string): string[] {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  }

  function renderStep() {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 dark:text-gray-200">{t('profile.basicInformation')}</h3>
            <p className="text-gray-600 dark:text-gray-300 dark:text-gray-300">{t('profile.tellUsAboutYourself')}</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('auth.email')}</label>
              <input
                className="border border-gray-300 dark:border-gray-600 dark:border-gray-600 p-3 w-full rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 dark:text-gray-300"
                value={userEmail}
                disabled
              />
            </div>
            
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 rounded">
              <span className="block text-yellow-800 dark:text-yellow-200 font-semibold mb-1">{t('profile.headsUp')}</span>
              <span className="text-yellow-800 dark:text-yellow-200 text-sm">{t('profile.infoSharingNotice')}</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('auth.fullName')}</label>
              <input
                className="border border-gray-300 dark:border-gray-600 dark:border-gray-600 p-3 w-full rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                type="text"
                placeholder={t('profile.enterFullName')}
                value={profile.full_name}
                onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">{t('auth.phone')}</label>
              <input
                className="border border-gray-300 dark:border-gray-600 dark:border-gray-600 p-3 w-full rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                type="tel"
                placeholder={t('profile.enterPhoneNumber')}
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <InstitutionSelect
                label={t('auth.institution')}
                placeholder={t('profile.enterInstitution')}
                value={profile.institution}
                onChange={(val) => setProfile(p => ({ ...p, institution: val }))}
                required
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 dark:text-gray-200">{t('profile.whatCausesInterestYou')}</h3>
            <p className="text-gray-600 dark:text-gray-300 dark:text-gray-300">{t('profile.selectAllThatApply')}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {INTERESTS_OPTIONS.map(interest => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => setPreferences(prev => ({
                    ...prev,
                    interests: toggleArrayItem(prev.interests, interest)
                  }))}
                  className={`p-3 rounded-lg border text-sm font-medium transition ${
                    preferences.interests.includes(interest)
                      ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-800 dark:text-green-200'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:border-green-300 dark:hover:border-green-500'
                  }`}
                >
                  {t(`causes.${interest}`)}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 dark:text-gray-200">{t('profile.whatSkillsDoYouHave')}</h3>
            <p className="text-gray-600 dark:text-gray-300 dark:text-gray-300">{t('profile.selectAllThatApply')}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SKILLS_OPTIONS.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setPreferences(prev => ({
                    ...prev,
                    skills: toggleArrayItem(prev.skills, skill)
                  }))}
                  className={`p-3 rounded-lg border text-sm font-medium transition ${
                    preferences.skills.includes(skill)
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-800 dark:text-blue-200'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500'
                  }`}
                >
                  {t(`skills.${skill}`)}
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 dark:text-gray-200">{t('profile.whenAreYouAvailable')}</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 dark:text-gray-300 dark:text-gray-300 mb-3">{t('profile.daysOfTheWeek')}:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {DAYS_OPTIONS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setPreferences(prev => ({
                        ...prev,
                        availability: {
                          ...prev.availability,
                          days: toggleArrayItem(prev.availability.days, day)
                        }
                      }))}
                      className={`p-2 rounded border text-sm transition ${
                        preferences.availability.days.includes(day)
                          ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600 text-purple-800 dark:text-purple-200'
                          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-500'
                      }`}
                    >
                      {t(`common.${day}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-300 dark:text-gray-300 mb-3">{t('profile.timeOfDay')}:</p>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setPreferences(prev => ({
                        ...prev,
                        availability: {
                          ...prev.availability,
                          timeSlots: toggleArrayItem(prev.availability.timeSlots, slot)
                        }
                      }))}
                      className={`p-2 rounded border text-sm transition ${
                        preferences.availability.timeSlots.includes(slot)
                          ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600 text-purple-800 dark:text-purple-200'
                          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-500'
                      }`}
                    >
                      {t(`common.${slot}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 dark:text-gray-200">{t('profile.locationPreference')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('profile.locationPreference')}
                </label>
                <GooglePlacesAutocomplete
                  value={preferences.location_preference}
                  onChange={(value) => setPreferences(prev => ({
                    ...prev,
                    location_preference: value
                  }))}
                  placeholder={t('profile.enterLocation')}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('profile.radius')}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={preferences.location_radius_km}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    location_radius_km: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">
                  {preferences.location_radius_km} km
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="remote_ok"
                  checked={preferences.remote_ok}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    remote_ok: e.target.checked
                  }))}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="remote_ok" className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  {t('profile.remoteOk')}
                </label>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 dark:text-gray-200">{t('profile.timeCommitment')}</h3>
            <p className="text-gray-600 dark:text-gray-300 dark:text-gray-300">{t('profile.commitmentQuestion')}</p>
            <div className="space-y-3">
              {TIME_COMMITMENT_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPreferences(prev => ({
                    ...prev,
                    time_commitment: option.value
                  }))}
                  className={`w-full p-4 rounded-lg border text-left transition ${
                    preferences.time_commitment === option.value
                      ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-800 dark:text-green-200'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:border-green-300 dark:hover:border-green-500'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  function renderEditableProfile() {
    return (
      <div className="space-y-8">
        {/* Basic Information Section */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 dark:text-gray-200 mb-4">{t('profile.basicInformation')}</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.email')}</label>
            <input
              className="border border-gray-300 dark:border-gray-600 p-3 w-full rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 dark:text-gray-300"
              value={userEmail}
              disabled
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.fullName')}</label>
              <input
                className="border border-gray-300 dark:border-gray-600 p-3 w-full rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                type="text"
                placeholder={t('profile.enterFullName')}
                value={profile.full_name}
                onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.phone')}</label>
              <input
                className="border border-gray-300 dark:border-gray-600 p-3 w-full rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                type="tel"
                placeholder={t('profile.enterPhoneNumber')}
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                required
              />
            </div>
            </div>
            
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <InstitutionSelect
                label={t('auth.institution')}
                placeholder={t('profile.enterInstitution')}
                value={profile.institution}
                onChange={(val) => setProfile(p => ({ ...p, institution: val }))}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.languagePreference')}</label>
              <select
                className="border border-gray-300 dark:border-gray-600 p-3 w-full rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={profile.language}
                onChange={e => setProfile(p => ({ ...p, language: e.target.value as 'en' | 'es' | 'pt' }))}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="pt">Português</option>
              </select>
            </div>
          </div>
        </div>

        {/* Interests Section */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('profile.interests')}</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{t('profile.selectAllThatApply')}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {INTERESTS_OPTIONS.map(interest => (
              <button
                key={interest}
                type="button"
                onClick={() => setPreferences(prev => ({
                  ...prev,
                  interests: toggleArrayItem(prev.interests, interest)
                }))}
                className={`p-3 rounded-lg border text-sm font-medium transition ${
                  preferences.interests.includes(interest)
                    ? 'bg-green-100 border-green-300 text-green-800'
                    : 'bg-white border-gray-200 text-gray-700 dark:text-gray-300 hover:border-green-300'
                }`}
              >
                {t(`causes.${interest}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Skills Section */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('profile.skills')}</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{t('profile.selectAllThatApply')}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {SKILLS_OPTIONS.map(skill => (
              <button
                key={skill}
                type="button"
                onClick={() => setPreferences(prev => ({
                  ...prev,
                  skills: toggleArrayItem(prev.skills, skill)
                }))}
                className={`p-3 rounded-lg border text-sm font-medium transition ${
                  preferences.skills.includes(skill)
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-gray-200 text-gray-700 dark:text-gray-300 hover:border-blue-300'
                }`}
              >
                {t(`skills.${skill}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Availability Section */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('profile.availability')}</h3>
          <div className="space-y-6">
            <div>
              <p className="text-gray-600 dark:text-gray-300 mb-3">{t('profile.daysOfWeek')}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {DAYS_OPTIONS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setPreferences(prev => ({
                      ...prev,
                      availability: {
                        ...prev.availability,
                        days: toggleArrayItem(prev.availability.days, day)
                      }
                    }))}
                    className={`p-2 rounded border text-sm transition ${
                      preferences.availability.days.includes(day)
                        ? 'bg-purple-100 border-purple-300 text-purple-800'
                        : 'bg-white border-gray-200 text-gray-700 dark:text-gray-300 hover:border-purple-300'
                    }`}
                  >
                    {t(`common.${day}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-300 mb-3">{t('profile.timeOfDay')}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {TIME_SLOTS.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setPreferences(prev => ({
                      ...prev,
                      availability: {
                        ...prev.availability,
                        timeSlots: toggleArrayItem(prev.availability.timeSlots, slot)
                      }
                    }))}
                    className={`p-2 rounded border text-sm transition ${
                      preferences.availability.timeSlots.includes(slot)
                        ? 'bg-purple-100 border-purple-300 text-purple-800'
                        : 'bg-white border-gray-200 text-gray-700 dark:text-gray-300 hover:border-purple-300'
                    }`}
                  >
                    {t(`common.${slot}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Location & Preferences Section */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('profile.locationPreference')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('profile.locationPreference')}</label>
              <GooglePlacesAutocomplete
                value={preferences.location_preference}
                onChange={(value) => setPreferences(prev => ({
                  ...prev,
                  location_preference: value
                }))}
                placeholder={t('profile.enterLocation')}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('profile.radius')}</label>
              <input
                type="range"
                min="1"
                max="50"
                value={preferences.location_radius_km}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  location_radius_km: parseInt(e.target.value)
                }))}
                className="w-full"
              />
              <div className="text-sm text-gray-600 dark:text-gray-300">{preferences.location_radius_km} km</div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="remote_ok"
                checked={preferences.remote_ok}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  remote_ok: e.target.checked
                }))}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="remote_ok" className="text-sm text-gray-700 dark:text-gray-300">
                {t('profile.remoteOk')}
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('profile.timeCommitment')}</label>
              <div className="grid grid-cols-2 gap-2">
                {TIME_COMMITMENT_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPreferences(prev => ({
                      ...prev,
                      time_commitment: option.value
                    }))}
                    className={`p-3 rounded-lg border text-sm transition ${
                      preferences.time_commitment === option.value
                        ? 'bg-green-100 border-green-300 text-green-800'
                        : 'bg-white border-gray-200 text-gray-700 dark:text-gray-300 hover:border-green-300'
                    }`}
                  >
                    {getTimeCommitmentLabel(option.value)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  async function resendVerification() {
    setResent(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email) {
      await supabase.auth.resend({ type: 'signup', email: user.email });
      setResent(true);
    }
  }


  if (loading) return <div className="p-8 text-center">{t('common.loading')}</div>;
  if (notVerified) return (
    <main className="max-w-md mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold text-green-700 mb-2">{t('auth.verifyEmail')}</h1>
      <p className="text-gray-700 dark:text-gray-300 mb-4">{t('auth.verifyEmailMessage')}</p>
      <button
                    className="bg-voluna-accent text-voluna-text-light px-4 py-2 rounded-lg font-semibold hover:bg-voluna-accent-hover"
        onClick={resendVerification}
      >
        {t('auth.resendVerification')}
      </button>
      {resent && <p className="text-green-700 mt-2">{t('auth.verificationEmailSent')}</p>}
    </main>
  );

  return (
    <main className="max-w-4xl mx-auto p-6 sm:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-green-700 dark:text-green-400 mb-2">
          {isInitialSetup ? t('profile.completeProfile') : t('profile.editProfile')}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {isInitialSetup 
            ? t('profile.profileHelp')
            : t('profile.updateInformation')
          }
        </p>
        
        {isInitialSetup && (
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
              <span>{t('profile.step', { step: currentStep })}</span>
              <span>{Math.round((currentStep / 6) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-voluna-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 6) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {success && (
        <div className="mb-6 bg-voluna-background border border-voluna-secondary rounded-lg p-4 text-voluna-primary">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {isInitialSetup ? (
          <div className="space-y-6">
            {renderStep()}
            
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.previous')}
              </button>
              
              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={() => {
                    // Dispatch event to show Senior Projects tab immediately after step 1
                    if (currentStep === 1 && profile.institution) {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('profileCompleted', { 
                          detail: { institution: profile.institution } 
                        }));
                      }
                    }
                    setCurrentStep(prev => prev + 1);
                  }}
                  className="px-6 py-2 bg-voluna-accent text-voluna-text-light rounded-lg hover:bg-voluna-accent-hover"
                >
                  {t('common.next')}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-voluna-accent text-voluna-text-light rounded-lg hover:bg-voluna-accent-hover disabled:opacity-50"
                >
                  {saving ? t('opportunity.saving') : t('profile.completeProfileAndView')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {renderEditableProfile()}
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/opportunities')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
                              <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-voluna-accent text-voluna-text-light rounded-lg hover:bg-voluna-accent-hover disabled:opacity-50"
                >
                  {saving ? t('opportunity.saving') : t('opportunity.saveChanges')}
                </button>
            </div>
          </div>
        )}
      </form>

    </main>
  );
} 