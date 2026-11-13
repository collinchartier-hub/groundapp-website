// Adds or reactivates someone on the shared newsletter list (newsletter_subscribers).
// Used by POST /api/subscribe and by partner claims that tick the newsletter box.
import { supabase } from './util.js';

// Returns { state, row }:
//   'new'          inserted
//   'reactivated'  was imported, bounced or unsubscribed and is opting in on purpose
//   'active'       already on the list (row holds last_emailed_at)
//   'race'         lost a race with a double submit; the other request handled it
// Throws when Supabase refuses a call.
export async function upsertSubscriber(env, { email, firstName, source }) {
  const q = encodeURIComponent(email);
  const [existing, unsub] = await Promise.all([
    supabase(env, `newsletter_subscribers?email=eq.${q}&select=id,status,first_name,last_emailed_at`),
    supabase(env, `newsletter_unsubscribed?email=eq.${q}&select=email`),
  ]);
  if (!existing.ok || !unsub.ok) throw new Error(`lookup failed ${existing.status}/${unsub.status}`);

  const row = existing.data[0] || null;
  const wasUnsubscribed = unsub.data.length > 0;
  let state;

  if (!row) {
    const ins = await supabase(env, 'newsletter_subscribers', {
      method: 'POST',
      prefer: 'return=minimal',
      body: { email, first_name: firstName, source, status: 'active' },
    });
    if (ins.status === 409) return { state: 'race', row: null };
    if (!ins.ok) throw new Error(`insert failed ${ins.status} ${JSON.stringify(ins.data)}`);
    state = 'new';
  } else if (row.status !== 'active' || wasUnsubscribed) {
    const patch = { status: 'active' };
    if (!row.first_name && firstName) patch.first_name = firstName;
    const upd = await supabase(env, `newsletter_subscribers?id=eq.${row.id}`, { method: 'PATCH', prefer: 'return=minimal', body: patch });
    if (!upd.ok) throw new Error(`reactivate failed ${upd.status}`);
    state = 'reactivated';
  } else {
    state = 'active';
  }

  if (wasUnsubscribed) await supabase(env, `newsletter_unsubscribed?email=eq.${q}`, { method: 'DELETE' });
  return { state, row };
}

export async function stampEmailed(env, email) {
  return supabase(env, `newsletter_subscribers?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: { last_emailed_at: new Date().toISOString() },
  });
}
