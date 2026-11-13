// What the site knows about each partner gym that is not in the database (partner_programs holds status and locations).
export const PARTNERS = {
  arsenal: {
    slug: 'arsenal',
    name: 'Arsenal Health',          // "your Arsenal Health member code"
    short: 'Arsenal',                // email subject: "from Arsenal and Collin"
    lockup: 'ARSENAL HEALTH',        // "ARSENAL HEALTH × GroundApp"
    css: '/assets/css/arsenal-v1.css',
    // Third paragraph of the code email, in Collin's voice.
    emailLine: 'Arsenal Health already gives you the cold plunge and the sauna. Breathwork is the tool you carry out the door. Your first year of GroundApp Premium is on me.',
  },
  aion: {
    slug: 'aion',
    name: 'AION',
    short: 'AION',
    lockup: 'AION',
    css: '/assets/css/aion-v1.css',
    emailLine: 'AION builds your strength and your engine. Your breath is the part you steer yourself, and this is the tool you carry out the door. Your first year of GroundApp Premium is on me.',
  },
};
export const partnerConfig = (slug) => (Object.hasOwn(PARTNERS, slug) ? PARTNERS[slug] : null);
