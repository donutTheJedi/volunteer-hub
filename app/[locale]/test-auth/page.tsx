'use client';

import { useAuth } from '@/lib/auth-context';
import LoadingSpinner from '@/components/loading-spinner';

export default function TestAuth() {
  const { user, session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Loading authentication state..." size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Authentication Test Page</h1>
      
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Authentication State:</h2>
          <div className="bg-gray-100 p-4 rounded">
            <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            <p><strong>User:</strong> {user ? 'Authenticated' : 'Not authenticated'}</p>
            <p><strong>Session:</strong> {session ? 'Active' : 'No session'}</p>
          </div>
        </div>

        {user && (
          <div>
            <h2 className="text-lg font-semibold mb-2">User Details:</h2>
            <div className="bg-gray-100 p-4 rounded">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
            </div>
          </div>
        )}

        {session && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Session Details:</h2>
            <div className="bg-gray-100 p-4 rounded">
              <p><strong>Access Token:</strong> {session.access_token ? 'Present' : 'Missing'}</p>
              <p><strong>Refresh Token:</strong> {session.refresh_token ? 'Present' : 'Missing'}</p>
              <p><strong>Expires At:</strong> {new Date(session.expires_at! * 1000).toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="mt-6">
          <a 
            href="/dashboard" 
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            Test Dashboard Access
          </a>
        </div>
      </div>
    </div>
  );
} 