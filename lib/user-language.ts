import { createSupabaseAdmin } from './supabaseServer';

export async function getUserLanguage(userId: string): Promise<'en' | 'es' | 'pt'> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('user_profiles')
      .select('language')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.warn('Could not fetch user language preference, defaulting to Spanish:', error);
      return 'es';
    }

    return data.language || 'es';
  } catch (error) {
    console.error('Error fetching user language preference:', error);
    return 'es';
  }
}

export async function updateUserLanguage(userId: string, language: 'en' | 'es' | 'pt'): Promise<void> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from('user_profiles')
      .update({ language })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user language preference:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating user language preference:', error);
    throw error;
  }
} 