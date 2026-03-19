import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PORTALS = ['sosa', 'keylo', 'redx', 'trustme'] as const;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const today = new Date().toISOString().split('T')[0];
  let totalProcessed = 0;

  for (const portal of PORTALS) {
    const subTable = `${portal}_subscriptions`;
    const txTable = `${portal}_transactions`;

    const { data: dueSubs, error: fetchErr } = await supabase
      .from(subTable)
      .select('*')
      .eq('status', 'active')
      .lte('next_billing_date', today);

    if (fetchErr || !dueSubs) continue;

    for (const sub of dueSubs) {
      const { error: txErr } = await supabase.from(txTable).insert({
        user_id: sub.user_id,
        type: 'expense',
        amount: sub.amount,
        currency: sub.currency,
        category_name: sub.category_name,
        category_id: sub.category_id,
        description: `Abbonamento: ${sub.name}`,
        date: sub.next_billing_date,
        payment_method: sub.payment_method,
        subscription_id: sub.id,
        is_recurring: true,
        status: 'completed',
      });

      if (txErr) continue;

      const nextDate = new Date(sub.next_billing_date);
      switch (sub.billing_cycle) {
        case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
        case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
        case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
      }

      if (sub.end_date && nextDate > new Date(sub.end_date)) {
        await supabase.from(subTable)
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', sub.id);
      } else {
        await supabase.from(subTable)
          .update({ next_billing_date: nextDate.toISOString().split('T')[0], updated_at: new Date().toISOString() })
          .eq('id', sub.id);
      }

      totalProcessed++;
    }
  }

  return new Response(
    JSON.stringify({ processed: totalProcessed, date: today }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
