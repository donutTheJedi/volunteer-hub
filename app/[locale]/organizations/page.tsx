"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Org = { 
  id: string; 
  name: string; 
  logo?: string | null; 
  description?: string | null;
  hasUpcomingOpportunities?: boolean;
  verification_status?: 'pending' | 'approved' | 'rejected';
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('');
}

export default function OrganizationsPage() {
  const router = useRouter();
  const t = useTranslations();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrgs, setActiveOrgs] = useState<Org[]>([]);
  const [inactiveOrgs, setInactiveOrgs] = useState<Org[]>([]);
  const [pendingOrgs, setPendingOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      
      // Fetch all organizations with verification status
      const { data: orgsData, error: orgsError } = await supabase
        .from("organizations")
        .select("id, name, logo, description, verification_status")
        .order("name", { ascending: true });
      
      if (orgsError) {
        console.error('Error fetching organizations:', orgsError);
        setOrgs([]);
        setLoading(false);
        return;
      }
      
      if (!orgsData || orgsData.length === 0) {
        setOrgs([]);
        setActiveOrgs([]);
        setInactiveOrgs([]);
        setPendingOrgs([]);
        setLoading(false);
        return;
      }

      // Filter only approved organizations for opportunity checking
      const approvedOrgs = orgsData.filter(org => org.verification_status === 'approved');
      
      // Check which approved organizations have upcoming opportunities
      const approvedOrgIds = approvedOrgs.map(org => org.id);
      let orgsWithUpcomingOpps = new Set<string>();
      
      if (approvedOrgIds.length > 0) {
        const { data: opportunitiesData, error: opportunitiesError } = await supabase
          .from('opportunities')
          .select('org_id')
          .in('org_id', approvedOrgIds)
          .gte('start_time', new Date().toISOString());
        
        if (opportunitiesError) {
          console.error('Error fetching opportunities:', opportunitiesError);
        } else {
          orgsWithUpcomingOpps = new Set(
            opportunitiesData?.map(opp => opp.org_id) || []
          );
        }
      }
      
      // Separate organizations by status and activity
      const active: Org[] = [];
      const inactive: Org[] = [];
      const pending: Org[] = [];
      
      orgsData.forEach(org => {
        const orgWithStatus = { 
          ...org, 
          hasUpcomingOpportunities: orgsWithUpcomingOpps.has(org.id) 
        };
        
        if (org.verification_status === 'pending') {
          pending.push(orgWithStatus);
        } else if (org.verification_status === 'approved') {
          if (orgsWithUpcomingOpps.has(org.id)) {
            active.push(orgWithStatus);
          } else {
            inactive.push(orgWithStatus);
          }
        }
        // Note: We're not showing rejected organizations in this list
      });
      
      setOrgs(orgsData);
      setActiveOrgs(active);
      setInactiveOrgs(inactive);
      setPendingOrgs(pending);
      setLoading(false);
    }
    load();
  }, [router]);

  return (
    <main className="max-w-3xl mx-auto p-6 sm:p-10">
      <h1 className="text-3xl font-extrabold text-voluna-primary mb-8 text-center">{t('organizations.registeredOrganizations')}</h1>
      {loading && (
        <div className="py-4">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
          </div>
          <ul className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse" style={{ minWidth: 56, minHeight: 56 }} />
                <div className="flex-1 min-w-0">
                  <div className="h-5 w-56 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                  <div className="h-4 w-80 bg-gray-100 dark:bg-gray-700 rounded mt-2 animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!loading && orgs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">{t('organizations.noOrganizations')}</p>
          <Link href={`/new-org`} className="inline-flex items-center gap-2 bg-voluna-accent text-voluna-text-light px-5 py-2 rounded-lg shadow hover:bg-voluna-accent-hover font-semibold transition">
            + {t('organizations.createNewOrganization')}
          </Link>
        </div>
      )}
      
      {/* Active Organizations */}
      {activeOrgs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-voluna-primary mb-4">{t('organizations.activeOrganizations')}</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{t('organizations.activeOrganizationsDescription')}</p>
          <ul className="space-y-6">
            {activeOrgs.map(({ id, name, logo, description }) => (
              <li
                key={id}
                className="group bg-white dark:bg-gray-800 border border-green-100 dark:border-green-800 rounded-xl shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition flex items-center gap-4 focus-within:ring-2 focus-within:ring-voluna-accent"
              >
                {logo ? (
                  <img
                    src={logo}
                    alt={name + ' logo'}
                    className="w-14 h-14 object-cover rounded-full border shadow-sm mr-2"
                    style={{ minWidth: 56, minHeight: 56 }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 border flex items-center justify-center font-bold mr-2" aria-hidden>
                    {getInitials(name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/organizations/${id}`} className="font-bold text-lg text-voluna-primary hover:underline block truncate focus:outline-none focus-visible:ring-2 focus-visible:ring-voluna-accent rounded-sm">
                    {name}
                  </Link>
                  {description && (
                    <div className="text-gray-700 dark:text-gray-300 text-sm mt-1 truncate w-full">
                      {description}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pending Organizations (shown after active) */}
      {pendingOrgs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-yellow-600 mb-4">{t('organizations.pendingOrganizations')}</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{t('organizations.pendingNote')}</p>
          <ul className="space-y-6">
            {pendingOrgs.map(({ id, name, logo, description }) => (
              <li
                key={id}
                className="group bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl shadow-sm p-6 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition focus-within:ring-2 focus-within:ring-yellow-400"
              >
                {logo ? (
                  <img
                    src={logo}
                    alt={name + ' logo'}
                    className="w-14 h-14 object-cover rounded-full border shadow-sm mr-2 opacity-75"
                    style={{ minWidth: 56, minHeight: 56 }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-yellow-100 text-yellow-800 border flex items-center justify-center font-bold mr-2" aria-hidden>
                    {getInitials(name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg text-gray-800 dark:text-gray-100">{name}</span>
                    <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-medium px-2 py-1 rounded-full">
                      {t('organizations.pending')}
                    </span>
                  </div>
                  {description && (
                    <div className="text-gray-600 dark:text-gray-300 text-sm mt-1 truncate w-full">
                      {description}
                    </div>
                  )}
                  <div className="text-yellow-700 text-sm mt-1">
                    {t('organizations.pendingDescription')}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Inactive Organizations */}
      {inactiveOrgs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">{t('organizations.pastOrganizations')}</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{t('organizations.pastOrganizationsDescription')}</p>
          <ul className="space-y-6">
            {inactiveOrgs.map(({ id, name, logo, description }) => (
              <li
                key={id}
                className="group bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition flex items-center gap-4 focus-within:ring-2 focus-within:ring-gray-400"
              >
                {logo ? (
                  <img
                    src={logo}
                    alt={name + ' logo'}
                    className="w-14 h-14 object-cover rounded-full border shadow-sm mr-2 opacity-75"
                    style={{ minWidth: 56, minHeight: 56 }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border flex items-center justify-center font-bold mr-2" aria-hidden>
                    {getInitials(name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/organizations/${id}`} className="font-bold text-lg text-gray-800 dark:text-gray-100 hover:underline block truncate focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded-sm">
                    {name}
                  </Link>
                  {description && (
                    <div className="text-gray-600 dark:text-gray-300 text-sm mt-1 truncate w-full">
                      {description}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
} 