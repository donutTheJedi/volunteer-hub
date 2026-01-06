'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from './loading-spinner';
import ProtectedRoute from './protected-route';
import { isAdminEmail } from '@/lib/admin-config';

interface OrgProtectedRouteProps {
  children: React.ReactNode;
  orgId: string;
  redirectTo?: string;
}

export default function OrgProtectedRoute({ 
  children, 
  orgId,
  redirectTo = '/dashboard' 
}: OrgProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkOrgOwnership() {
      if (!user || loading) return;

      try {
        setCheckingAuth(true);
        
        // Check if the user owns this organization or is an admin
        const email = user.email || '';
        const isAdmin = isAdminEmail(email);

        const { data: org, error } = await supabase
          .from('organizations')
          .select('owner, reach_out_email')
          .eq('id', orgId)
          .single();

        if (error || !org) {
          console.error('Error checking organization ownership:', error);
          setIsAuthorized(false);
          return;
        }

        // Allow access if user owns the org OR if user is admin and org has reach_out_email
        if (org.owner === user.id || (isAdmin && org.reach_out_email)) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Error checking organization ownership:', error);
        setIsAuthorized(false);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkOrgOwnership();
  }, [user, loading, orgId]);

  // First, ensure user is authenticated
  if (loading || !user) {
    return <ProtectedRoute>{null}</ProtectedRoute>;
  }

  // Then check organization ownership
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Checking authorization..." size="large" />
      </div>
    );
  }

  if (!isAuthorized) {
    // Redirect to dashboard if not authorized
    router.replace(redirectTo);
    return null;
  }

  return <>{children}</>;
}
