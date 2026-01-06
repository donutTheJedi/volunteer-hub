-- Add language preference to user_profiles table
ALTER TABLE user_profiles ADD COLUMN language text DEFAULT 'en' CHECK (language IN ('en', 'es', 'pt'));
 
-- Update existing profiles to have English as default
UPDATE user_profiles SET language = 'en' WHERE language IS NULL; 