// Only the Pages endpoint handles claim selection and delivery. Worker holds no database keys.
export default {
  async scheduled(_event, env) {
    if (!env.PARTNER_CRON_SECRET) throw new Error('PARTNER_CRON_SECRET is not configured');
    const response = await fetch(env.PARTNER_FOLLOWUPS_URL, {
      method: 'POST',
      headers: { 'x-partner-cron-secret': env.PARTNER_CRON_SECRET },
    });
    if (!response.ok) throw new Error(`Partner follow-ups endpoint failed: ${response.status}`);
    const result = await response.json();
    if (!result.ok) throw new Error('Partner follow-ups endpoint refused the run');
    console.log('partner follow-ups', { claimed: result.claimed, sent: result.sent, failed: result.failed, bookkeeping_failed: result.bookkeeping_failed });
    if (result.failed > 0 || result.bookkeeping_failed > 0) throw new Error('Partner follow-ups run failed; inspect Pages/admin logs');
  },
};
