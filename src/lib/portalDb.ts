import { supabase } from './supabase';

type PortalPrefix = 'sosa' | 'keylo' | 'redx' | 'trustme';

export function portalTable(portal: PortalPrefix, table: string): string {
  return `${portal}_${table}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export function portalFrom(portal: PortalPrefix, table: string) {
  return sb.from(portalTable(portal, table));
}
