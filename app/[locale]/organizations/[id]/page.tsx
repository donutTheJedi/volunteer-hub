"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useTranslations } from "next-intl";

type Org = {
  id: string;
  name: string;
  logo?: string | null;
  description?: string | null;
  city?: string | null;
  contact_email?: string | null;
  photos?: { url: string }[] | null;
};

type Opportunity = {
  id: string;
  title: string;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  photos?: { url: string }[] | null;
};

export default function OrganizationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations();
  const [org, setOrg] = useState<Org | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() ?? '').join('');
  }

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);

      // Fetch organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, logo, description, city, contact_email, photos, verification_status")
        .eq("id", id)
        .single();

      if (orgError || !orgData) {
        console.error("Failed to load organization", orgError);
        setLoading(false);
        return router.replace("/organizations");
      }

      // Only show approved orgs publicly
      if (orgData.verification_status !== "approved") {
        setOrg({ id: orgData.id, name: orgData.name, logo: orgData.logo, description: orgData.description, city: orgData.city, contact_email: orgData.contact_email, photos: orgData.photos });
        setOpportunities([]);
        setLoading(false);
        return;
      }

      setOrg({ id: orgData.id, name: orgData.name, logo: orgData.logo, description: orgData.description, city: orgData.city, contact_email: orgData.contact_email, photos: orgData.photos });

      // Fetch this organization's opportunities (upcoming first)
      const { data: opps, error: oppErr } = await supabase
        .from("opportunities")
        .select("id, title, description, start_time, end_time, photos")
        .eq("org_id", id)
        .order("start_time", { ascending: true, nullsFirst: false });

      if (oppErr) {
        console.error("Failed to load opportunities", oppErr);
        setOpportunities([]);
      } else {
        setOpportunities(opps || []);
      }

      setLoading(false);
    }

    load();
  }, [id, router]);

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto p-6 sm:p-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1 min-w-0">
            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div>
          <div className="h-5 w-44 bg-gray-200 rounded animate-pulse mb-4" />
          <ul className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="h-5 w-52 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-40 bg-gray-100 rounded animate-pulse mt-2" />
                <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse mt-3" />
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  if (!org) {
    return (
      <main className="max-w-3xl mx-auto p-6 sm:p-10">
        <p className="text-gray-600">{t("organizations.notFound", { default: "Organization not found" })}</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6 sm:p-10">
      <div className="mb-4">
        <Link href="/organizations" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 hover:underline">
          ← {t('common.goBack')}
        </Link>
      </div>
      {(() => {
        return null;
      })()}
      <div className="flex items-start gap-4 mb-6">
        {org.logo ? (
          <img src={org.logo} alt={`${org.name} logo`} className="w-16 h-16 rounded-full border shadow-sm" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 text-gray-700 border flex items-center justify-center font-bold" aria-hidden>
            {getInitials(org.name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-extrabold text-voluna-primary mb-1 truncate">{org.name}</h1>
          {org.city && <p className="text-gray-600 text-sm">{org.city}</p>}
        </div>
      </div>

      {org.description && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
          <h2 className="text-xl font-semibold mb-2">{t("organizations.about", { default: "About" })}</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{org.description}</p>
        </div>
      )}

      {/* Contact info */}
      {org.contact_email && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
          <h2 className="text-xl font-semibold mb-2">{t("organizations.contact", { default: "Contact" })}</h2>
          <a
            href={`mailto:${org.contact_email}`}
            className="inline-flex items-center text-voluna-primary hover:underline break-all"
          >
            {org.contact_email}
          </a>
        </div>
      )}

      {/* Organization Photos */}
      {org.photos && org.photos.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-3">{t("organizations.photos", { default: "Photos" })}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {org.photos.map((p, idx) => (
              <img
                key={idx}
                src={p.url}
                alt={`${org.name} photo ${idx + 1}`}
                className="w-full h-36 object-cover rounded-lg border"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      )}

      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4">{t("organizations.opportunities", { default: "Opportunities" })}</h2>
        {opportunities.length === 0 ? (
          <div className="text-gray-600">
            <p className="mb-4">{t("organizations.noOpportunities", { default: "No opportunities yet." })}</p>
            <Link href={`/opportunities`} className="inline-flex items-center gap-2 bg-voluna-accent text-voluna-text-light px-5 py-2 rounded-lg shadow hover:bg-voluna-accent-hover font-semibold transition">
              {t('dashboard.browseOpportunities')}
            </Link>
          </div>
        ) : (
          <>
            {(() => {
              const now = new Date();
              const upcoming = opportunities.filter(o => o.start_time && new Date(o.start_time) > now);
              const past = opportunities.filter(o => !o.start_time || new Date(o.start_time) <= now);
              return (
                <>
                  {upcoming.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-voluna-primary mb-3">{t('dashboard.upcomingOpportunities')}</h3>
                      <ul className="space-y-4">
                        {upcoming.map((opp) => (
                          <li key={opp.id} className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition focus-within:ring-2 focus-within:ring-voluna-accent">
                            <Link href={`/opportunity/${opp.id}`} className="text-voluna-primary font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-voluna-accent rounded-sm">
                              {opp.title}
                            </Link>
                            {opp.start_time && (
                              <div className="text-gray-500 text-sm mt-1">
                                {new Date(opp.start_time).toLocaleString()}
                              </div>
                            )}
                            {opp.description && (
                              <p className="text-gray-700 mt-2 line-clamp-3">{opp.description}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {past.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-3">{t('organizations.pastOrganizations', { default: 'Past Opportunities' })}</h3>
                      <ul className="space-y-4">
                        {past.map((opp) => (
                          <li key={opp.id} className="group bg-gray-50 border border-gray-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition focus-within:ring-2 focus-within:ring-gray-300">
                            <Link href={`/opportunity/${opp.id}`} className="text-gray-800 font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 rounded-sm">
                              {opp.title}
                            </Link>
                            {opp.start_time && (
                              <div className="text-gray-500 text-sm mt-1">
                                {new Date(opp.start_time).toLocaleString()}
                              </div>
                            )}
                            {opp.description && (
                              <p className="text-gray-700 mt-2 line-clamp-3">{opp.description}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </section>
    </main>
  );
}


