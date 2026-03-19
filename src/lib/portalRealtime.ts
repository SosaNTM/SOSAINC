import { supabase } from './supabase';

type PortalPrefix = 'sosa' | 'keylo' | 'redx' | 'trustme';
type Module = 'finance' | 'notes' | 'tasks' | 'crm' | 'calendar';
type EventType =
  | 'transaction_added' | 'transaction_updated' | 'transaction_deleted'
  | 'subscription_added' | 'subscription_updated' | 'subscription_deleted'
  | 'budget_updated'
  | 'note_added' | 'note_updated' | 'note_deleted'
  | 'task_added' | 'task_updated' | 'task_deleted'
  | 'contact_added' | 'contact_updated' | 'contact_deleted'
  | 'event_added' | 'event_updated' | 'event_deleted';

function getChannelName(portal: PortalPrefix, module: Module): string {
  return `${portal}-${module}-updates`;
}

const MODULE_EVENTS: Record<Module, string[]> = {
  finance: [
    'transaction_added', 'transaction_updated', 'transaction_deleted',
    'subscription_added', 'subscription_updated', 'subscription_deleted',
    'budget_updated',
  ],
  notes: ['note_added', 'note_updated', 'note_deleted'],
  tasks: ['task_added', 'task_updated', 'task_deleted'],
  crm: ['contact_added', 'contact_updated', 'contact_deleted'],
  calendar: ['event_added', 'event_updated', 'event_deleted'],
};

export function createPortalChannel(portal: PortalPrefix, module: Module) {
  const channelName = getChannelName(portal, module);
  const channel = supabase.channel(channelName);

  return {
    channel,

    broadcast(event: EventType, payload?: Record<string, unknown>) {
      channel.send({
        type: 'broadcast',
        event,
        payload: { ...payload, timestamp: Date.now(), portal, module },
      });
    },

    subscribe(callback: (event: EventType, payload: Record<string, unknown>) => void) {
      const events = MODULE_EVENTS[module];
      events.forEach(event => {
        channel.on('broadcast', { event }, ({ payload }) => {
          callback(event as EventType, payload);
        });
      });
      channel.subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}
