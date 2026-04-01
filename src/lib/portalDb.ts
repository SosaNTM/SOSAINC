import { supabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

type PortalPrefix = 'sosa' | 'keylo' | 'redx' | 'trustme';

export function portalTable(portal: PortalPrefix, table: string): string {
  return `${portal}_${table}`;
}

/**
 * Supabase client typed for dynamic table access (portal-prefixed tables
 * that are not represented in the generated Database type).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dynamicSupabase = supabase as unknown as SupabaseClient<any, 'public', any>;

export function portalFrom(portal: PortalPrefix, table: string) {
  return dynamicSupabase.from(portalTable(portal, table));
}
