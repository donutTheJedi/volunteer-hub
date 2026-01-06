"use client";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/protected-route";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { isValidImageFile, getInvalidFileFormatMessage, isPdfFile, sanitizeFilename } from '@/lib/file-validation';
import { convertPdfToImage } from '@/lib/pdf-to-image';
import { isTestAccountEmail } from '@/lib/admin-config';

// Senior Project Card Component with proper image handling
const SeniorProjectCard = React.forwardRef<HTMLDivElement, { project: any, isFirst?: boolean, onboardingStep?: number, showOnboarding?: boolean }>(({ project, isFirst, onboardingStep, showOnboarding }, ref) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  return (
    <Link href={`/senior-projects/${project.id}`} className="block">
      <div 
        ref={ref}
        className={`bg-white dark:bg-neutral-800 rounded-xl shadow border border-gray-200 dark:border-neutral-700 hover:shadow-md dark:hover:shadow-lg hover:shadow-gray-300 dark:hover:shadow-neutral-900 transition-all duration-200 overflow-hidden cursor-pointer group hover:scale-[1.02] hover:border-gray-300 dark:hover:border-neutral-600 ${
          isFirst && onboardingStep === 0 && showOnboarding ? 'animate-pulse sm:scale-110 sm:shadow-2xl relative ring-4 ring-voluna-accent ring-opacity-50 dark:ring-opacity-30' : ''
        }`}
        style={{
          ...(isFirst && onboardingStep === 0 && showOnboarding && {
            zIndex: 999999
          })
        }}
      >
      {project.poster_url ? (
        <div className="relative cursor-pointer" onClick={() => setShowFullImage(true)}>
          <img 
            src={project.poster_url} 
            alt={project.title}
            className={`w-full h-auto transition-opacity duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ 
              objectFit: 'contain',
              maxHeight: '400px',
              backgroundColor: '#f9fafb'
            }}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-gray-100 dark:bg-neutral-700 animate-pulse flex items-center justify-center">
              <div className="text-gray-400 dark:text-gray-500 text-sm">Loading poster...</div>
            </div>
          )}
          {imageError && (
            <div className="w-full h-64 bg-gray-100 dark:bg-neutral-700 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">📄</div>
              <div className="text-sm">Failed to load poster</div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-64 bg-gray-100 dark:bg-neutral-700 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">📄</div>
            <div className="text-sm">No poster</div>
          </div>
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-2 line-clamp-2 group-hover:text-voluna-accent dark:group-hover:text-voluna-accent transition-colors">{project.title}</h3>
        <div className="flex justify-end">
          <div className="text-voluna-accent hover:text-voluna-accent-hover text-sm font-medium group-hover:translate-x-1 transition-transform">
            View Details →
          </div>
        </div>
      </div>

        {/* Full Image/PDF Modal */}
        {showFullImage && project.poster_url && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
            onClick={() => setShowFullImage(false)}
          >
            <div 
              className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-neutral-800 rounded-lg overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowFullImage(false)}
                className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded z-10 hover:bg-opacity-70"
              >
                Close
              </button>
              <img 
                src={project.poster_url} 
                alt={project.title}
                className="w-full h-auto object-contain flex-shrink-0"
              />
              {project.description && (
                <div className="p-6 border-t border-gray-200 dark:border-neutral-700 flex-shrink-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-3">{project.title}</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-base leading-relaxed">{project.description}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
});

SeniorProjectCard.displayName = 'SeniorProjectCard';

export default function SeniorProjectsPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [isHarkness, setIsHarkness] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [poster, setPoster] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstCardRef = useRef<HTMLDivElement>(null);

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    // Clear any existing messages
    setErrorMessage(null);
    setSuccessMessage(null);
    
    // Handle rejected files (including invalid types)
    if (rejected && rejected.length > 0) {
      setErrorMessage(getInvalidFileFormatMessage(t));
      return;
    }
    
    // Validate accepted files as additional safety
    if (accepted && accepted[0]) {
      if (!isValidImageFile(accepted[0])) {
        setErrorMessage(getInvalidFileFormatMessage(t));
        return;
      }
      
      // Check if it's a PDF and show error immediately
      if (isPdfFile(accepted[0])) {
        setErrorMessage(t('organizations.pdfNotAllowed'));
        return;
      }
      
      setPoster(accepted[0]);
      setSuccessMessage(t('organizations.fileUploadedSuccessfully'));
    }
  }, [t]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false, accept: { 'image/*': [], 'application/pdf': [] } });

  // Set mounted to true after component mounts (for SSR compatibility)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update positions when onboarding step changes
  useEffect(() => {
    const updatePositions = () => {
      if (onboardingStep === 0 && firstCardRef.current) {
        const rect = firstCardRef.current.getBoundingClientRect();
        console.log('First card rect:', rect);
        setCardPosition({
          top: rect.top + window.scrollY + (rect.height / 2), // centered vertically
          left: rect.right + window.scrollX + 20 // 20px to the right of the card
        });
      } else if (onboardingStep === 1 && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setButtonPosition({
          top: rect.bottom + window.scrollY + 20, // 20px below the button
          left: rect.left + window.scrollX + (rect.width / 2) // centered horizontally
        });
      }
    };

    // Add a small delay to ensure elements are rendered
    const timeoutId = setTimeout(updatePositions, 100);
    return () => clearTimeout(timeoutId);
  }, [onboardingStep, items]); // Add items dependency to recalculate when cards load

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('institution')
          .eq('user_id', user.id)
          .maybeSingle();
        const hark = (profile?.institution || '').toLowerCase() === 'harkness institute';
        setIsHarkness(hark);
      }
      const { data } = await supabase
        .from('senior_projects')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      const projects = data || [];
      setItems(projects);
      setLoading(false);

      // Check if user has seen onboarding before (always show for test account)
      const hasSeenOnboarding = localStorage.getItem('senior-projects-onboarding-seen');
      const isTestAccount = isTestAccountEmail(user?.email);
      
      // Debug logging
      console.log('Onboarding debug:', {
        userEmail: user?.email,
        isTestAccount,
        hasSeenOnboarding,
        projectsLength: projects.length,
        shouldShow: (!hasSeenOnboarding || isTestAccount) && projects.length > 0
      });
      
      if ((!hasSeenOnboarding || isTestAccount) && projects.length > 0) {
        console.log('Setting onboarding to show...');
        setTimeout(() => setShowOnboarding(true), 500); // Small delay to let page settle
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let poster_url: string | null = null;
      if (poster) {
        const { data: { user } } = await supabase.auth.getUser();
        
        // PDF check is now handled in the dropzone onDrop function
        
        // Sanitize filename to remove special characters that can cause storage issues
        const sanitizedFileName = sanitizeFilename(poster.name);
        
        const path = `${user!.id}/${Date.now()}_${sanitizedFileName}`;
        const { error: upErr } = await supabase.storage
          .from('senior-projects-posters')
          .upload(path, poster, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from('senior-projects-posters')
          .getPublicUrl(path);
        poster_url = pub?.publicUrl || null;
      }
      const { error } = await supabase.from('senior_projects').insert({
        title,
        description,
        poster_url,
        // RLS requires matching user_id = auth.uid() in policy
        // user_id will be filled by us explicitly
        // but Supabase will still check auth.uid() = user_id
        user_id: (await supabase.auth.getUser()).data.user?.id || undefined,
      } as any);
      if (error) throw new Error(error.message);
      setTitle('');
      setDescription('');
      setPoster(null);
      setShowForm(false);
      setErrorMessage(null);
      setSuccessMessage(null);
      const { data } = await supabase
        .from('senior_projects')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      setItems(data || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  const handleOnboardingNext = async () => {
    if (onboardingStep === 0) {
      setOnboardingStep(1);
    } else {
      // Mark onboarding as seen and close (skip for test account)
      const { data: { user } } = await supabase.auth.getUser();
      if (!isTestAccountEmail(user?.email)) {
        localStorage.setItem('senior-projects-onboarding-seen', 'true');
      }
      setShowOnboarding(false);
    }
  };

  const handleOnboardingSkip = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!isTestAccountEmail(user?.email)) {
      localStorage.setItem('senior-projects-onboarding-seen', 'true');
    }
    setShowOnboarding(false);
    setOnboardingStep(0);
  };

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 w-64 bg-gray-200 rounded" />
            <div className="h-9 w-32 bg-gray-200 rounded" />
          </div>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            <div className="h-64 bg-gray-200 rounded" />
            <div className="h-96 bg-gray-200 rounded" />
            <div className="h-80 bg-gray-200 rounded" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <ProtectedRoute>
      <main className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-voluna-primary">Senior Project</h1>
          <div className="flex gap-2">
            {/* Debug button for test account */}
            {isTestAccountEmail(currentUser?.email) && (
              <button
                onClick={() => setShowOnboarding(true)}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              >
                Show Onboarding
              </button>
            )}
            {isHarkness && (
              <button
                ref={buttonRef}
                onClick={() => setShowForm(v => !v)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow font-medium transition text-sm relative ${
                  onboardingStep === 1 
                    ? 'bg-yellow-400 text-yellow-900 shadow-2xl ring-4 ring-yellow-200 dark:ring-yellow-800 animate-pulse transform scale-105' 
                    : 'bg-voluna-accent text-voluna-text-light hover:bg-voluna-accent-hover'
                }`}
                style={{
                  ...(onboardingStep === 1 && showOnboarding && {
                    zIndex: 999999
                  })
                }}
              >
                {t('seniorProject.newListing')}
              </button>
            )}
          </div>
        </div>

        {isHarkness && showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            {/* Error Banner */}
            {errorMessage && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="inline-flex text-red-400 hover:text-red-600 dark:text-red-300 dark:hover:text-red-100"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Success Banner */}
            {successMessage && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      type="button"
                      onClick={() => setSuccessMessage(null)}
                      className="inline-flex text-green-400 hover:text-green-600 dark:text-green-300 dark:hover:text-green-100"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">{t('seniorProject.title')}</label>
              <input className="border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 p-3 w-full rounded-lg text-base" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">{t('seniorProject.description')}</label>
              <textarea className="border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 p-3 w-full rounded-lg text-base" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">{t('seniorProject.posterOne')}</label>
              {!poster ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                    isDragActive ? 'border-voluna-accent bg-voluna-background' : 'border-gray-300 dark:border-neutral-600 hover:border-voluna-accent dark:hover:border-neutral-500'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-base text-gray-600 dark:text-gray-400">{t('seniorProject.dragDrop')}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('seniorProject.fileHint')}</p>
                </div>
              ) : (
                <div className="border border-gray-300 dark:border-neutral-600 rounded-lg overflow-hidden bg-white dark:bg-neutral-800">
                  <img src={URL.createObjectURL(poster)} alt="Poster preview" className="w-full max-h-60 object-contain bg-gray-50 dark:bg-neutral-700" />
                  <div className="p-2 flex justify-end">
                    <button type="button" className="text-red-600 dark:text-red-400 text-base hover:underline" onClick={() => setPoster(null)}>
                      {t('seniorProject.removePoster')}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={submitting} className="bg-voluna-accent text-voluna-text-light px-4 py-2 rounded-lg hover:bg-voluna-accent-hover disabled:opacity-50">
                {submitting ? t('seniorProject.publishing') : t('seniorProject.publish')}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[0, 1, 2].map(columnIndex => (
            <div key={columnIndex} className="space-y-3">
              {items
                .filter((_, index) => index % 3 === columnIndex)
                .map((sp, filteredIndex) => {
                  const originalIndex = columnIndex + (filteredIndex * 3);
                  return (
                    <SeniorProjectCard 
                      key={sp.id} 
                      project={sp} 
                      isFirst={originalIndex === 0}
                      onboardingStep={onboardingStep}
                      showOnboarding={showOnboarding}
                      ref={originalIndex === 0 ? firstCardRef : null}
                    />
                  );
                })}
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full text-center text-sm text-gray-500 py-8">{t('seniorProject.noneYet')}</div>
          )}
        </div>

        {/* Onboarding Tooltip */}
        {showOnboarding && mounted && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-30" 
              style={{ 
                zIndex: 999998,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.3)'
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowOnboarding(false);
                  setOnboardingStep(0);
                }
              }}
            />
            
            {/* Tooltip Modal */}
            <div 
              className={`fixed z-50`}
              style={{ 
                zIndex: 999999,
                ...(onboardingStep === 0 && {
                  top: `${cardPosition.top}px`,
                  left: `${cardPosition.left}px`,
                  transform: 'translateY(-50%)'
                }),
                ...(onboardingStep === 1 && {
                  top: `${buttonPosition.top}px`,
                  left: `${buttonPosition.left}px`,
                  transform: 'translateX(-50%)'
                })
              }}
            >
              <div 
                className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl max-w-md p-6 relative transform transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Arrow pointing to card (step 0) or button (step 1) */}
                {onboardingStep === 0 && (
                  <div className="absolute top-1/2 -left-2 transform -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white dark:border-r-neutral-800"></div>
                )}
                {onboardingStep === 1 && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white dark:border-b-neutral-800"></div>
                )}
                
                <div className="text-center">
                  {onboardingStep === 0 ? (
                    <>
                      <div className="w-16 h-16 bg-voluna-accent rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {t('seniorProject.onboarding.cardClickTitle')}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-6">
                        {t('seniorProject.onboarding.cardClickDescription')}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {t('seniorProject.onboarding.createProjectTitle')}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-6">
                        {t('seniorProject.onboarding.createProjectDescription')}
                      </p>
                    </>
                  )}
                  
                  <div className="flex gap-3 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const isTestAccount = isTestAccountEmail(currentUser?.email);
                        if (!isTestAccount) {
                          localStorage.setItem('senior-projects-onboarding-seen', 'true');
                        }
                        setShowOnboarding(false);
                        setOnboardingStep(0);
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {t('seniorProject.onboarding.skip')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Button clicked, current step:', onboardingStep);
                        if (onboardingStep === 0) {
                          console.log('Moving to step 1');
                          setOnboardingStep(1);
                        } else {
                          console.log('Closing modal');
                          // "Got it!" button - close the modal
                          const isTestAccount = isTestAccountEmail(currentUser?.email);
                          if (!isTestAccount) {
                            localStorage.setItem('senior-projects-onboarding-seen', 'true');
                          }
                          setShowOnboarding(false);
                          setOnboardingStep(0);
                        }
                      }}
                      className="px-6 py-2 bg-voluna-accent text-white rounded-lg hover:bg-voluna-accent-hover transition-colors"
                    >
                      {onboardingStep === 0 ? t('seniorProject.onboarding.next') : t('seniorProject.onboarding.gotIt')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </ProtectedRoute>
  );
}


