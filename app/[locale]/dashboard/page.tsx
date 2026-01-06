'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import LoadingSpinner from '@/components/loading-spinner';
import ProtectedRoute from '@/components/protected-route';
import { useTranslations } from 'next-intl';
import { isAdminEmail } from '@/lib/admin-config';

// Simple icons
const EditIcon = () => (
  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13zm-6 6h6v-2a2 2 0 012-2h2a2 2 0 012 2v2h6" /></svg>
);
const DeleteIcon = () => (
  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
);
const PlusIcon = () => (
  <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
);
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
);

type Org = { id: string; name: string; description: string; reach_out_email?: string };
type VolunteerStats = {
  totalHours: number;
  totalOpportunities: number;
  thisMonthHours: number;
  upcomingSignups: number;
};
type RecentActivity = {
  id: string;
  hours_awarded: number;
  awarded_at: string;
  opportunity_id: string;
  opportunity?: {
    title: string;
    start_time: string;
    organizations: { name: string }[];
  };
};
type UpcomingOpportunity = {
  id: string;
  title: string;
  start_time: string;
  location: string;
  organizations: { name: string }[];
};

type SignupData = {
  opportunity_id: string;
  opportunities: {
    id: string;
    title: string;
    start_time: string;
    location: string;
    organizations: { name: string }[];
  }[];
};

function DashboardContent() {
  const { user } = useAuth();
  const t = useTranslations();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [volunteerStats, setVolunteerStats] = useState<VolunteerStats>({
    totalHours: 0,
    totalOpportunities: 0,
    thisMonthHours: 0,
    upcomingSignups: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingOpportunities, setUpcomingOpportunities] = useState<UpcomingOpportunity[]>([]);
  const [allHours, setAllHours] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHarkness, setIsHarkness] = useState(false);
  const [spItems, setSpItems] = useState<any[]>([]);
  const [hasSeniorProject, setHasSeniorProject] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [spSignups, setSpSignups] = useState<any[]>([]);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [showDetailView, setShowDetailView] = useState<'upcoming' | 'monthly' | 'completed' | null>(null);
  const [pendingOrgs, setPendingOrgs] = useState<Org[]>([]);
  const [showPendingNotification, setShowPendingNotification] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminManagedOrgs, setAdminManagedOrgs] = useState<Org[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        
        // Profile check
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('user_id', user!.id)
          .maybeSingle();
            
        if (profileError) {
          console.error('Profile check error:', profileError);
          setError('Failed to load profile');
          setLoading(false);
          return;
        }
        
        if (!profile) {
          router.replace('/profile');
          return;
        }
          
        // Check if user is admin
        const email = user!.email || '';
        const admin = isAdminEmail(email);
        setIsAdmin(admin);

        // Check if user is Harkness Institute
        const { data: profileRow } = await supabase
          .from('user_profiles')
          .select('institution')
          .eq('user_id', user!.id)
          .single();
        const hark = (profileRow?.institution || '').toLowerCase() === 'harkness institute'.toLowerCase();
        setIsHarkness(!!hark);

        // Check if user owns any organizations
        let userOrgs: any[] = [];
        
        if (admin) {
          // For admin, get both owned organizations and admin-managed organizations
          const { data: ownedOrgs, error: ownedError } = await supabase
            .from('organizations')
            .select('id, name, description, reach_out_email')
            .eq('owner', user!.id)
            .order('name', { ascending: true });
            
          const { data: managedOrgs, error: managedError } = await supabase
            .from('organizations')
            .select('id, name, description, reach_out_email')
            .not('reach_out_email', 'is', null)
            .not('reach_out_email', 'eq', '')
            .order('name', { ascending: true });
            
          if (ownedError || managedError) {
            console.error('Organizations fetch error:', ownedError || managedError);
            setError('Failed to load organizations');
            setLoading(false);
            return;
          }
          
          // Combine owned and managed organizations, avoiding duplicates
          const ownedIds = new Set((ownedOrgs || []).map(org => org.id));
          const managedOrgsFiltered = (managedOrgs || []).filter(org => !ownedIds.has(org.id));
          userOrgs = [...(ownedOrgs || []), ...managedOrgsFiltered];
        } else {
          // For regular users, only get owned organizations
          const { data: orgData, error: orgsError } = await supabase
            .from('organizations')
            .select('id, name, description')
            .eq('owner', user!.id)
            .order('name', { ascending: true });
            
          if (orgsError) {
            console.error('Organizations fetch error:', orgsError);
            setError('Failed to load organizations');
            setLoading(false);
            return;
          }
          
          userOrgs = orgData ?? [];
        }
        
        setOrgs(userOrgs);
        
        // If user is an organizer with exactly one org, redirect to its dashboard
        if (userOrgs.length === 1) {
          setShouldRedirect(true);
          setTimeout(() => {
            router.replace(`/dashboard/${userOrgs[0].id}`);
          }, 100);
          return;
        }
        
        // Check if user has pending organizations
        const { data: pendingOrgsData, error: pendingError } = await supabase
          .from('organizations')
          .select('id, name, description')
          .eq('owner', user!.id)
          .eq('verification_status', 'pending');

        if (!pendingError && pendingOrgsData) {
          setPendingOrgs(pendingOrgsData);
          setShowPendingNotification(pendingOrgsData.length > 0);
        }

        // Check if user is an organizer (has approved organizations or is admin with managed orgs)
        if (admin) {
          // For admin, they're an organizer if they have any organizations (owned or managed)
          setIsOrganizer(userOrgs.length > 0);
        } else {
          // For regular users, check if they have approved organizations they own
          const { data: organizerOrgs, error: organizerError } = await supabase
            .from('organizations')
            .select('id, name, description')
            .eq('owner', user!.id)
            .neq('verification_status', 'pending');

          if (!organizerError && organizerOrgs) {
            setIsOrganizer(organizerOrgs.length > 0);
          }
        }
        
        // If user is not an organizer, load volunteer stats
        if (userOrgs.length === 0) {
          await loadVolunteerDashboard(user!.id);
        }
        
        // Load admin-managed organizations if admin
        if (admin) {
          const { data: adminOrgsData, error: adminOrgsError } = await supabase
            .from('organizations')
            .select('id, name, description, reach_out_email')
            .not('reach_out_email', 'is', null)
            .not('reach_out_email', 'eq', '')
            .order('name', { ascending: true });
          
          if (!adminOrgsError && adminOrgsData) {
            setAdminManagedOrgs(adminOrgsData);
          }
        }

        // Load senior projects if Harkness
        if (hark) {
          const { data: spData } = await supabase
            .from('senior_projects')
            .select('*')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false })
            .limit(20);
          const mine = spData || [];
          setSpItems(mine);
          setHasSeniorProject(mine.length > 0);
          if (mine.length > 0) {
            setSelectedProjectId(mine[0].id);
            const { data: sps } = await supabase
              .from('senior_project_signups')
              .select('id, name, email, created_at')
              .eq('project_id', mine[0].id)
              .order('created_at', { ascending: false });
            setSpSignups(sps || []);
          }
        } else {
          setSpItems([]);
          setHasSeniorProject(false);
        }

        setLoading(false);
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    }
    
    load();
  }, [user, router]);

  async function loadVolunteerDashboard(userId: string) {
    try {
      // Load volunteer hours stats
      const { data: hoursData, error: hoursError } = await supabase
        .from('volunteer_hours')
        .select(`
          id,
          hours_awarded,
          awarded_at,
          opportunity_id
        `)
        .eq('user_id', userId)
        .order('awarded_at', { ascending: false });

      console.log('Hours data:', hoursData);
      console.log('Hours error:', hoursError);

      if (hoursError) {
        console.error('Hours data error:', hoursError);
      }

      const hours = hoursData || [];
      
      // Fetch opportunity details for each hour record
      if (hours.length > 0) {
        const opportunityIds = hours.map(h => h.opportunity_id);
        const { data: opportunitiesData, error: opportunitiesError } = await supabase
          .from('opportunities')
          .select(`
            id,
            title,
            start_time,
            organizations!inner (name)
          `)
          .in('id', opportunityIds);
          
        if (opportunitiesError) {
          console.error('Error fetching opportunities:', opportunitiesError);
        } else {
          // Merge opportunity data with hours data
          const opportunitiesMap = new Map();
          (opportunitiesData || []).forEach(opp => {
            opportunitiesMap.set(opp.id, opp);
          });
          
          const hoursWithOpportunities = hours.map(hour => ({
            ...hour,
            opportunity: opportunitiesMap.get(hour.opportunity_id)
          }));
          
          setRecentActivity(hoursWithOpportunities.slice(0, 3)); // Show last 3 activities
          setAllHours(hoursWithOpportunities);
        }
      } else {
        setRecentActivity([]);
        setAllHours([]);
      }
      const totalHours = hours.reduce((sum, h) => sum + h.hours_awarded, 0);
      const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const thisMonthHours = hours
        .filter(h => new Date(h.awarded_at) >= thisMonth)
        .reduce((sum, h) => sum + h.hours_awarded, 0);

      // Load upcoming signups with full opportunity details
      console.log('Fetching signups for user:', userId);
      
      // First get the signups for this user
      const { data: signupsData, error: signupsError } = await supabase
        .from('signups')
        .select('opportunity_id')
        .eq('user_id', userId);
      
      if (signupsError) {
        console.error('Error fetching signups:', signupsError);
        return;
      }
      
      if (!signupsData || signupsData.length === 0) {
        setVolunteerStats({
          totalHours,
          totalOpportunities: hours.length,
          thisMonthHours,
          upcomingSignups: 0
        });
        setUpcomingOpportunities([]);
        return;
      }
      
      // Get the opportunity IDs
      const opportunityIds = signupsData.map(s => s.opportunity_id);
      
      // Fetch the opportunities with organization details
      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('opportunities')
        .select(`
          id,
          title,
          start_time,
          location,
          organizations!inner (name)
        `)
        .in('id', opportunityIds)
        .gte('start_time', new Date().toISOString());
      
      if (opportunitiesError) {
        console.error('Error fetching opportunities:', opportunitiesError);
        return;
      }

      console.log('Opportunities query result:', { opportunitiesData, opportunitiesError });

      // Transform opportunities to upcoming opportunities and sort by start time
      const opportunities = opportunitiesData || [];
      const upcomingCount = opportunities.length;
      const upcoming: UpcomingOpportunity[] = opportunities
        .map(opp => ({
          id: opp.id,
          title: opp.title,
          start_time: opp.start_time,
          location: opp.location,
          organizations: opp.organizations
        }))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      setVolunteerStats({
        totalHours,
        totalOpportunities: hours.length,
        thisMonthHours,
        upcomingSignups: upcomingCount
      });

      setUpcomingOpportunities(upcoming);
    } catch (err) {
      console.error('Volunteer dashboard load error:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this organization?')) return;
    
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Check if this is an admin-managed organization
      const org = orgs.find(o => o.id === id);
      const isAdminManaged = org?.reach_out_email;
      
      if (isAdminManaged && isAdmin) {
        // Use admin API endpoint for admin-managed organizations
        const response = await fetch(`/api/admin/delete-organization?orgId=${id}`, {
          method: 'DELETE',
          headers: {
            'x-requester-email': currentUser?.email || '',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          alert('Error deleting organization: ' + (errorData.error || 'Unknown error'));
          return;
        }
        
        const result = await response.json();
        alert(result.message || 'Organization deleted successfully');
        
        // Remove from admin-managed organizations list
        setAdminManagedOrgs((prev) => prev.filter((o) => o.id !== id));
      } else {
        // Use regular client for user-owned organizations
        const { error } = await supabase.from('organizations').delete().eq('id', id);
        if (error) {
          console.error('Delete error:', error);
          alert('Error deleting organization: ' + error.message);
          return;
        }
      }
      
      setOrgs((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('An unexpected error occurred while deleting');
    }
  }

  function getThisMonthHours() {
    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return allHours.filter(h => new Date(h.awarded_at) >= thisMonth);
  }

  function getCompletedEvents() {
    return allHours;
  }

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto p-6 sm:p-10">
        <div className="animate-pulse space-y-8">
          <div className="flex justify-between items-center">
            <div className="h-8 w-64 bg-gray-200 rounded" />
            <div className="h-10 w-40 bg-gray-200 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-72 bg-gray-200 rounded" />
            <div className="h-72 bg-gray-200 rounded" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-6xl mx-auto p-6 sm:p-10">
        <div className="text-center py-12">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-voluna-accent text-voluna-text-light px-4 py-2 rounded-lg hover:bg-voluna-accent-hover transition"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (shouldRedirect) {
    return (
      <main className="max-w-6xl mx-auto p-6 sm:p-10">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner message="Redirecting to your organization..." size="large" />
        </div>
      </main>
    );
  }

  // Detail View Modal
  if (showDetailView) {
    let title = '';
    let data: RecentActivity[] = [];
    let upcomingData: UpcomingOpportunity[] = [];
    let emptyMessage = '';
    let emptyAction = '';

    switch (showDetailView) {
      case 'upcoming':
        title = 'Upcoming Events';
        upcomingData = upcomingOpportunities;
        emptyMessage = 'No upcoming events';
        emptyAction = 'Browse opportunities';
        break;
      case 'monthly':
        title = 'Hours This Month';
        data = getThisMonthHours();
        emptyMessage = 'No hours earned this month';
        emptyAction = 'Find opportunities';
        break;
      case 'completed':
        title = 'Completed Events';
        data = getCompletedEvents();
        emptyMessage = 'No completed events';
        emptyAction = 'Start volunteering';
        break;
    }

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={() => setShowDetailView(null)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200"
            >
              <CloseIcon />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {showDetailView === 'upcoming' ? (
              // Upcoming events view
              upcomingData.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📅</div>
                  <p className="text-gray-500 mb-4">{emptyMessage}</p>
                  <Link
                    href="/opportunities"
                    className="inline-block bg-voluna-accent text-voluna-text-light px-4 py-2 rounded-lg hover:bg-voluna-accent-hover"
                  >
                    {emptyAction}
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingData.map((opp) => (
                    <div key={opp.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">📅</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {opp.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {opp.organizations[0]?.name}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500">
                            📍 {opp.location}
                          </span>
                          <span className="text-sm font-medium text-blue-600">
                            {new Date(opp.start_time).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Hours/Completed events view
              data.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-gray-500 mb-4">{emptyMessage}</p>
                  <Link
                    href="/opportunities"
                    className="inline-block bg-voluna-accent text-voluna-text-light px-4 py-2 rounded-lg hover:bg-voluna-accent-hover"
                  >
                    {emptyAction}
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.map((item) => (
                    <div key={item.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-voluna-background rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">🏆</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {item.opportunity?.title || 'Unknown Opportunity'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {item.opportunity?.organizations[0]?.name || 'Unknown Organization'}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500">
                            {item.opportunity?.start_time 
                              ? new Date(item.opportunity.start_time).toLocaleDateString()
                              : new Date(item.awarded_at).toLocaleDateString()
                            }
                          </span>
                          <span className="text-sm font-medium text-voluna-secondary">
                            +{item.hours_awarded.toFixed(1)} hours
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  // Volunteer Dashboard
  if (!isOrganizer) {
    return (
      <main className="max-w-6xl mx-auto p-6 sm:p-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-voluna-primary">{t('dashboard.myVolunteerDashboard')}</h1>
            <p className="text-gray-600 mt-1">{t('dashboard.trackJourney')}</p>
          </div>
          <Link 
            href="/new-org" 
            className="inline-flex items-center gap-2 bg-voluna-accent text-white px-4 py-2 rounded-lg shadow hover:bg-voluna-accent-hover font-semibold transition"
          >
            <PlusIcon /> {t('organizations.createOrganization')}
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                  <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-voluna-accent">
              <div className="text-2xl font-bold text-voluna-accent">{volunteerStats.totalHours.toFixed(1)}</div>
            <div className="text-gray-600 text-sm font-medium">{t('dashboard.totalHours')}</div>
          </div>
          <button 
            onClick={() => setShowDetailView('completed')}
            className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-all cursor-pointer text-left"
          >
            <div className="text-2xl font-bold text-blue-600">{volunteerStats.totalOpportunities}</div>
            <div className="text-gray-600 text-sm font-medium">{t('dashboard.opportunitiesCompleted')}</div>
            <div className="text-xs text-blue-500 mt-1">{t('dashboard.clickToViewDetails')} →</div>
          </button>
          <button 
            onClick={() => setShowDetailView('monthly')}
            className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-all cursor-pointer text-left"
          >
            <div className="text-2xl font-bold text-purple-600">{volunteerStats.thisMonthHours.toFixed(1)}</div>
            <div className="text-gray-600 text-sm font-medium">{t('dashboard.hoursThisMonth')}</div>
            <div className="text-xs text-purple-500 mt-1">{t('dashboard.clickToViewDetails')} →</div>
          </button>
          <button 
            onClick={() => setShowDetailView('upcoming')}
            className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500 hover:shadow-xl transition-all cursor-pointer text-left"
          >
            <div className="text-2xl font-bold text-orange-600">{volunteerStats.upcomingSignups}</div>
            <div className="text-gray-600 text-sm font-medium">{t('dashboard.upcomingEvents')}</div>
            <div className="text-xs text-orange-500 mt-1">{t('dashboard.clickToViewDetails')} →</div>
          </button>
        </div>

        {isHarkness && hasSeniorProject && (
          <div className="mb-8 bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Senior Project</h2>
              <a href="/senior-projects" className="text-voluna-accent hover:text-voluna-accent-hover text-sm font-medium">Senior Project →</a>
            </div>
            {/* Manage one project at a time */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('seniorProject.selectProject')}</label>
              <select
                className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 max-w-md"
                value={selectedProjectId || ''}
                onChange={async (e) => {
                  const pid = e.target.value || null;
                  setSelectedProjectId(pid);
                  if (pid) {
                    const { data: sps } = await supabase
                      .from('senior_project_signups')
                      .select('id, name, email, created_at')
                      .eq('project_id', pid)
                      .order('created_at', { ascending: false });
                    setSpSignups(sps || []);
                  } else {
                    setSpSignups([]);
                  }
                }}
              >
                {spItems.map(sp => (
                  <option key={sp.id} value={sp.id}>{sp.title}</option>
                ))}
              </select>
              <div className="mt-2 flex items-center">
                <button
                  disabled={!selectedProjectId}
                  onClick={async () => {
                    if (!selectedProjectId) return;
                    if (!confirm('Delete this senior project and all its signups?')) return;
                    // Try to delete poster file if present
                    try {
                      const proj = spItems.find(p => p.id === selectedProjectId);
                      const url: string | undefined = proj?.poster_url || undefined;
                      if (url) {
                        const m = url.match(/\/object\/public\/senior-projects-posters\/(.*)$/);
                        const path = m?.[1];
                        if (path) {
                          await supabase.storage.from('senior-projects-posters').remove([path]);
                        }
                      }
                    } catch (e) {
                      // best-effort cleanup; continue
                    }
                    const { error } = await supabase
                      .from('senior_projects')
                      .delete()
                      .eq('id', selectedProjectId);
                    if (error) {
                      alert(error.message);
                      return;
                    }
                    const remaining = spItems.filter(p => p.id !== selectedProjectId);
                    setSpItems(remaining);
                    setSelectedProjectId(remaining[0]?.id || null);
                    setSpSignups([]);
                    setHasSeniorProject(remaining.length > 0);
                    // toast-like minimal feedback
                    console.log('Senior project deleted');
                  }}
                  className="text-xs text-gray-500 hover:text-red-600 hover:underline disabled:opacity-40"
                >
                  {t('seniorProject.deleteProject')}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('seniorProject.signedUpAt')}</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {spSignups.map(su => (
                    <tr key={su.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{su.name || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{su.email || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{new Date(su.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          className="text-red-600 text-sm hover:underline"
                          onClick={async () => {
                            if (!confirm('Remove this signup?')) return;
                            const { error } = await supabase
                              .from('senior_project_signups')
                              .delete()
                              .eq('id', su.id);
                            if (error) {
                              alert(error.message);
                              return;
                            }
                            setSpSignups(prev => prev.filter(p => p.id !== su.id));
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {spSignups.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">{t('seniorProject.noSignups')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.recentActivity')}</h2>
              <Link href="/my-hours" className="text-voluna-accent hover:text-voluna-accent-hover text-sm font-medium">
                {t('dashboard.viewAll')} →
              </Link>
            </div>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🌟</div>
                <p>{t('dashboard.noVolunteerHours')}</p>
                <Link href="/opportunities" className="text-voluna-accent hover:text-voluna-accent-hover text-sm">
                  {t('dashboard.findOpportunitiesToStart')}
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                          <div className="w-8 h-8 bg-voluna-background rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">🏆</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.opportunity?.title || 'Unknown Opportunity'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.opportunity?.organizations[0]?.name || 'Unknown Organization'}
                      </p>
                      <p className="text-xs text-green-600 font-medium">
                        +{activity.hours_awarded.toFixed(1)} hours
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.upcomingEvents')}</h2>
              <Link href="/opportunities" className="text-voluna-accent hover:text-voluna-accent-hover text-sm font-medium">
                {t('dashboard.findMore')} →
              </Link>
            </div>
            {upcomingOpportunities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📅</div>
                <p>{t('dashboard.noUpcomingEvents')}</p>
                <Link href="/opportunities" className="text-voluna-accent hover:text-voluna-accent-hover text-sm">
                  {t('dashboard.browseAvailableOpportunities')}
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingOpportunities.map((opp) => (
                  <div key={opp.id} className="p-3 bg-gray-50 rounded-lg">
                    <Link href={`/opportunity/${opp.id}`} className="block hover:bg-gray-100 rounded">
                      <h4 className="font-medium text-gray-900 truncate">{opp.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {opp.organizations[0]?.name}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          📍 {opp.location}
                        </span>
                        <span className="text-xs text-blue-600 font-medium">
                          {new Date(opp.start_time).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link 
              href="/opportunities" 
              className="flex items-center justify-center p-4 bg-voluna-background border-2 border-voluna-secondary rounded-lg hover:bg-voluna-secondary transition"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🔍</div>
                <div className="font-medium text-voluna-primary">Find Opportunities</div>
              </div>
            </Link>
            <Link 
              href="/profile" 
              className="flex items-center justify-center p-4 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">👤</div>
                <div className="font-medium text-purple-700">Update Profile</div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Organizer Dashboard (multiple organizations)
  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-10">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {showPendingNotification && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {t('organizations.verificationPending')}
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{t('organizations.verificationPendingMessage')}</p>
                <p className="mt-1 font-medium">{t('organizations.thankYouForPatience')}</p>
              </div>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setShowPendingNotification(false)}
                className="inline-flex text-yellow-400 hover:text-yellow-500"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        </div>
      )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-voluna-primary">My Organizations</h1>
            <p className="text-gray-600 mt-1">Manage your organizations and create opportunities</p>
          </div>
          <Link href="/new-org" className="inline-flex items-center gap-2 bg-voluna-accent text-white px-5 py-2 rounded-lg shadow hover:bg-voluna-accent-hover font-semibold transition">
            <PlusIcon /> {t('organizations.createOrganization')}
          </Link>
        </div>
      
      <ul className="space-y-6">
        {orgs.map(({ id, name, description, reach_out_email }) => (
                      <li key={id} className="bg-white border border-voluna-background rounded-xl shadow-sm p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:shadow-md transition">
            <div className="flex-1">
                              <Link href={`/dashboard/${id}`} className="font-bold text-lg text-voluna-primary hover:underline">
                {name}
              </Link>
              <div className="text-gray-600 text-sm mt-1">{description}</div>
              {reach_out_email && (
                <div className="text-gray-500 text-xs mt-2">
                  📧 Admin-managed: {reach_out_email}
                </div>
              )}
            </div>
            <div className="flex gap-2">
                              <Link href={`/dashboard/${id}/edit`} className="inline-flex items-center gap-1 px-4 py-2 bg-voluna-background text-voluna-primary rounded-lg font-semibold hover:bg-voluna-secondary transition">
                <EditIcon /> Edit
              </Link>
              <button onClick={() => handleDelete(id)} className="inline-flex items-center gap-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition">
                <DeleteIcon /> Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Admin Organization Management Section */}
      {isAdmin && adminManagedOrgs.length > 0 && (
        <div className="mt-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-voluna-primary">Admin-Managed Organizations</h2>
              <p className="text-gray-600 mt-1">Organizations with reach-out emails for daily digest</p>
            </div>
          </div>
          
          <ul className="space-y-6">
            {adminManagedOrgs.map(({ id, name, description, reach_out_email }) => (
              <li key={id} className="bg-white border border-voluna-background rounded-xl shadow-sm p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:shadow-md transition">
                <div className="flex-1">
                  <div className="font-bold text-lg text-voluna-primary">{name}</div>
                  <div className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {description && description.length > 120 
                      ? `${description.substring(0, 120)}...` 
                      : description}
                  </div>
                  <div className="text-gray-500 text-xs mt-2">
                    📧 Daily digest: {reach_out_email}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link 
                    href={`/dashboard/${id}/new?admin=true`} 
                    className="inline-flex items-center gap-1 px-4 py-2 bg-voluna-accent text-voluna-text-light rounded-lg font-semibold hover:bg-voluna-accent-hover transition"
                  >
                    <PlusIcon /> Create Opportunity
                  </Link>
                  <Link 
                    href={`/dashboard/${id}`} 
                    className="inline-flex items-center gap-1 px-4 py-2 bg-voluna-background text-voluna-primary rounded-lg font-semibold hover:bg-voluna-secondary transition"
                  >
                    <EditIcon /> Manage
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
