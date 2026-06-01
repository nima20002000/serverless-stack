import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

/**
 * Settings Service (Supabase)
 * Handles site settings management (key-value pairs)
 */

export type SiteSetting = {
  key: string;
  value: string;
};

/**
 * Get all site settings
 */
export async function getAllSettings(): Promise<SiteSetting[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .order('key', { ascending: true });

    if (error) {
      log.error('Error fetching site settings', { error });
      throw new Error('Unable to load settings');
    }

    return data || [];
  } catch (error) {
    log.error('Error in getAllSettings', { error });
    throw error;
  }
}

/**
 * Get a specific setting by key
 */
export async function getSetting(key: string): Promise<SiteSetting | null> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      log.error('Error fetching setting', { key, error });
      throw new Error('Unable to load setting');
    }

    return data || null;
  } catch (error) {
    log.error('Error in getSetting', { key, error });
    throw error;
  }
}

/**
 * Update or create settings (bulk upsert)
 */
export async function updateSettings(
  settings: Record<string, string>
): Promise<void> {
  const supabase = createClient();

  try {
    // Process each setting one by one (Supabase doesn't support bulk upsert on key)
    const operations = Object.entries(settings).map(async ([key, value]) => {
      // Try to update first
      const { data: existing } = await supabase
        .from('site_settings')
        .select('key')
        .eq('key', key)
        .single();

      if (existing) {
        // Update existing setting
        const { error } = await supabase
          .from('site_settings')
          .update({ value })
          .eq('key', key);

        if (error) {
          log.error('Error updating setting', { key, error });
          throw new Error(`Unable to update setting ${key}`);
        }
      } else {
        // Insert new setting
        const { error } = await supabase
          .from('site_settings')
          .insert({ key, value });

        if (error) {
          log.error('Error inserting setting', { key, error });
          throw new Error(`Unable to create setting ${key}`);
        }
      }
    });

    await Promise.all(operations);

    log.info('Settings updated', { keys: Object.keys(settings) });
  } catch (error) {
    log.error('Error in updateSettings', { error });
    throw error;
  }
}

/**
 * Delete a setting
 */
export async function deleteSetting(key: string): Promise<void> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('site_settings')
      .delete()
      .eq('key', key);

    if (error) {
      log.error('Error deleting setting', { key, error });
      throw new Error('Unable to delete setting');
    }

    log.info('Setting deleted', { key });
  } catch (error) {
    log.error('Error in deleteSetting', { key, error });
    throw error;
  }
}
