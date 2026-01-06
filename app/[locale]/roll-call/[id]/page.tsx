"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { supabase } from "@/lib/supabase";

type Volunteer = {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  institute?: string;
  attended?: boolean;
  attendance_marked?: boolean;
};

type Opportunity = {
  id: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  org_id: string;
  organization?: {
    name: string;
    owner: string;
  };
};

export default function RollCallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [estimatedHours, setEstimatedHours] = useState(0);

  useEffect(() => {
    loadOpportunityAndVolunteers();
  }, [id]);

  async function loadOpportunityAndVolunteers() {
    setLoading(true);
    setError("");

    try {
      // Check if user is logged in
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Get opportunity details
      const { data: opp, error: oppError } = await supabase
        .from("opportunities")
        .select("id, title, description, location, start_time, end_time, org_id")
        .eq("id", id)
        .single();

      if (oppError || !opp) {
        setError(t('rollCall.opportunityNotFound'));
        setLoading(false);
        return;
      }

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("name, owner")
        .eq("id", opp.org_id)
        .single();

      if (orgError || !orgData) {
        setError(t('rollCall.failedToLoadOrganization'));
        setLoading(false);
        return;
      }

      const opportunityWithOrg = {
        ...opp,
        organization: orgData
      };

      setOpportunity(opportunityWithOrg);

      // Check if current user is the organization owner
      const owner = orgData.owner;
      console.log("Debug - Current user ID:", user.id);
      console.log("Debug - Organization owner:", owner);
      console.log("Debug - Opportunity data:", opportunityWithOrg);
      console.log("Debug - Organization data:", orgData);
      
      if (owner !== user.id) {
        setError(t('rollCall.onlyOwnerCanAccess'));
        setLoading(false);
        return;
      }
      setIsOwner(true);

      // Calculate estimated hours
      if (opp.start_time && opp.end_time) {
        const startTime = new Date(opp.start_time);
        const endTime = new Date(opp.end_time);
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        setEstimatedHours(Math.max(0, hours));
      }

      // Get all volunteers who signed up
      const { data: signups, error: signupsError } = await supabase
        .from("signups")
        .select("user_id, name, email, phone, institute")
        .eq("opportunity_id", id);

      if (signupsError) {
        setError(t('rollCall.failedToLoadVolunteers'));
        setLoading(false);
        return;
      }

      // Get existing attendance records
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("user_id, attended")
        .eq("opportunity_id", id);

      // Merge signup data with attendance data
      const volunteersWithAttendance = (signups || []).map(signup => {
        const attendanceRecord = attendance?.find(a => a.user_id === signup.user_id);
        return {
          ...signup,
          attended: attendanceRecord?.attended || false,
          attendance_marked: !!attendanceRecord
        };
      });

      setVolunteers(volunteersWithAttendance);
      setLoading(false);
    } catch (err) {
      console.error("Error loading roll call data:", err);
      setError(t('rollCall.failedToLoadData'));
      setLoading(false);
    }
  }

  async function toggleAttendance(userId: string, currentAttended: boolean) {
    const newAttendedStatus = !currentAttended;
    
    console.log("Debug - Toggling attendance for user:", userId);
    console.log("Debug - Current status:", currentAttended);
    console.log("Debug - New status:", newAttendedStatus);
    
    try {
      // Update attendance record
      if (newAttendedStatus) {
        // Mark as attended
        const { error: attendanceError } = await supabase
          .from("attendance")
          .upsert({
            opportunity_id: id,
            user_id: userId,
            attended: true,
            marked_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (attendanceError) {
          console.error("Error updating attendance:", attendanceError);
          return;
        }
      } else {
        // Mark as not attended - delete the attendance record
        const { error: attendanceError } = await supabase
          .from("attendance")
          .delete()
          .eq("opportunity_id", id)
          .eq("user_id", userId);

        if (attendanceError) {
          console.error("Error deleting attendance:", attendanceError);
          return;
        }
      }
      
      console.log("Debug - Attendance updated successfully");

      // Update local state
      console.log("Debug - Updating local state for user:", userId, "to:", newAttendedStatus);
      setVolunteers(prev => {
        const updated = prev.map(vol => 
          vol.user_id === userId 
            ? { ...vol, attended: newAttendedStatus, attendance_marked: newAttendedStatus }
            : vol
        );
        console.log("Debug - Updated volunteers state:", updated);
        return updated;
      });

      // If marking as attended and no hours awarded yet, award hours
      if (newAttendedStatus && estimatedHours > 0) {
        const { error: hoursError } = await supabase
          .from("volunteer_hours")
          .upsert({
            user_id: userId,
            opportunity_id: id,
            hours_awarded: estimatedHours,
            awarded_by: (await supabase.auth.getUser()).data.user?.id,
            notes: `Automatically awarded for attending: ${opportunity?.title}`
          });

        if (hoursError) {
          console.error("Error awarding hours:", hoursError);
          // Don't fail the attendance update if hours award fails
        }
      } else if (!newAttendedStatus) {
        // If marking as not attended, remove awarded hours
        console.log("Debug - Removing hours for user:", userId);
        const { error: removeHoursError } = await supabase
          .from("volunteer_hours")
          .delete()
          .eq("user_id", userId)
          .eq("opportunity_id", id);

        if (removeHoursError) {
          console.error("Error removing hours:", removeHoursError);
        } else {
          console.log("Debug - Hours removed successfully");
        }
      }
    } catch (err) {
      console.error("Error toggling attendance:", err);
    }
  }

  async function markAllPresent() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const volunteer of volunteers) {
        if (!volunteer.attended) {
          await toggleAttendance(volunteer.user_id, false);
        }
      }
    } catch (err) {
      console.error("Error marking all present:", err);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('rollCall.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl font-semibold mb-4">⚠️ {t('common.error')}</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => router.back()}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            {t('common.goBack')}
          </button>
        </div>
      </div>
    );
  }

  const attendedCount = volunteers.filter(v => v.attended).length;
  const totalVolunteers = volunteers.length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">📋 {t('rollCall.title')}</h1>
              <h2 className="text-xl text-voluna-primary font-semibold mb-2">{opportunity?.title}</h2>
              <div className="space-y-1 text-gray-600">
                <p><strong>{t('rollCall.organization')}:</strong> {opportunity?.organization?.name}</p>
                <p><strong>{t('rollCall.location')}:</strong> {opportunity?.location}</p>
                <p><strong>{t('rollCall.time')}:</strong> {new Date(opportunity?.start_time || '').toLocaleString()}</p>
                {estimatedHours > 0 && (
                  <p><strong>{t('rollCall.hoursPerVolunteer')}:</strong> {estimatedHours.toFixed(1)} {t('rollCall.hours')}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-voluna-secondary">
                {attendedCount} / {totalVolunteers}
              </div>
              <div className="text-sm text-gray-600">{t('rollCall.attended')}</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{t('rollCall.quickActions')}</h3>
          <div className="flex space-x-4">
            <button
              onClick={markAllPresent}
              disabled={saving}
              className="bg-voluna-accent text-voluna-text-light px-4 py-2 rounded-lg hover:bg-voluna-accent-hover disabled:opacity-50"
            >
              {saving ? t('rollCall.processing') : t('rollCall.markAllPresent')}
            </button>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              {t('rollCall.backToDashboard')}
            </button>
          </div>
        </div>

        {/* Volunteer List */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">{t('rollCall.volunteerAttendance')}</h3>
            <p className="text-gray-600 text-sm mt-1">
              {t('rollCall.attendanceInstructions')}
            </p>
          </div>
          
          {volunteers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>{t('rollCall.noVolunteers')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {volunteers.map((volunteer) => (
                <div 
                  key={volunteer.user_id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    volunteer.attended ? 'bg-voluna-background' : ''
                  }`}
                  onClick={() => toggleAttendance(volunteer.user_id, volunteer.attended || false)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        volunteer.attended 
                          ? 'bg-voluna-secondary border-voluna-secondary text-white' 
                          : 'border-gray-300'
                      }`}>
                        {volunteer.attended && <span className="text-sm">✓</span>}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{volunteer.name}</div>
                        <div className="text-sm text-gray-600">{volunteer.email}</div>
                        {volunteer.institute && (
                          <div className="text-sm text-gray-500">{volunteer.institute}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        volunteer.attended ? 'text-voluna-secondary' : 'text-gray-500'
                      }`}>
                        {volunteer.attended ? t('rollCall.present') : t('rollCall.notMarked')}
                      </div>
                      {volunteer.attended && estimatedHours > 0 && (
                        <div className="text-xs text-gray-500">
                          {estimatedHours.toFixed(1)} {t('rollCall.hoursAwarded')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>
            {t('rollCall.footerNote')}
          </p>
        </div>
      </div>
    </div>
  );
} 