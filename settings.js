/* =====================================================================
   ADANAWO DISTRICT COUNCIL: THE ONE PLACE FOR LOOK AND SETTINGS
   Change colours, the logo, the marks (crown, red bead, ribbon, seal)
   and the wording here. You do not need to touch any other file for these.
   ===================================================================== */
window.SITE = {
  // ---- Connection (these two are safe to be public) ----
  supabaseUrl: 'https://xztleoedhygvyvffxuib.supabase.co',
  supabaseKey: 'sb_publishable_8diN69m8k2_3dsWPrfTmWw_XWkcvsN4',

  // ---- Wording ----
  name: 'Adanawo District Council',
  motto: 'One Voice',
  supportWhatsApp: '2348080344502',
  supportLabel: 'Report any technical issue',
  creditLine: 'Built and designed by AKUS ELEOJO FARIDA',
  aboutText: [
    'Adanawo District Council is the home of the Adanawo District of Ankpa: its leaders, its Gagos, its villages and its history, kept in one place for everyone.',
    'The district is made up of Ikoja, Ojogobi and Adoche, with Emanyi as the Administrative Headquarters.'
  ],

  // ---- Colours ----
  colors: {
    cream: '#F5EFE0', paper: '#FBF7EC', green: '#1E4D2B', greenDark: '#143520',
    mustard: '#C8921B', blue: '#2F5D7C', bead: '#A63A2B', ink: '#2A2418', soft: '#6B6250'
  },

  // ---- Which marks go with which kind of person ----
  // (The mark itself is chosen per person in the database; this says how it looks.)
  marks: {
    crown:         { label: 'Crown',                  icon: 'crown' },
    red_bead:      { label: 'Gago',                   icon: 'bead' },
    gold_ribbon:   { label: 'District Council',       icon: 'ribbon' },
    crown_seal:    { label: 'Crown and seal',         icon: 'seal', crown: true },
    seal:          { label: 'Office holder',          icon: 'seal' },
    chairman_seal: { label: 'Local Government Chairman', icon: 'wreath' },
    none:          { label: '',                       icon: null }
  },

  // ---- Pictures drawn in code (one file, easy to change) ----
  svg: `
  <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
    <symbol id="palm" viewBox="0 0 28 30"><path d="M14 29 C14 22 14.5 15 15 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15 9 C11 4 5 4 2 8 M15 9 C13 3 9 1 5 1.5 M15 9 C17 3 21 1 25 2.5 M15 9 C20 5 25 7 27 11 M15 9 C17 12 20 13 23 12.5 M15 9 C12 12 9 13 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
    <symbol id="calabash" viewBox="0 0 24 28"><path d="M12 2 C10 2 9 3.5 9.5 5.5 C7.5 7 7 9 8.5 10.5 C5 12.5 4 16 4 18.5 C4 23 7.5 26 12 26 C16.5 26 20 23 20 18.5 C20 16 19 12.5 15.5 10.5 C17 9 16.5 7 14.5 5.5 C15 3.5 14 2 12 2 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M6.5 17.5 C9 19.5 15 19.5 17.5 17.5 M7 21.5 C9.5 23.5 14.5 23.5 17 21.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></symbol>
    <symbol id="crown" viewBox="0 0 24 23"><path d="M2 20 L3.6 6.5 L8.4 11.4 L12 3 L15.6 11.4 L20.4 6.5 L22 20 Z" fill="currentColor"/><rect x="2" y="21" width="20" height="1.6" fill="currentColor"/></symbol>
    <symbol id="person" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 21 C4 17 8 15 12 15 C16 15 20 17 20 21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
    <symbol id="bead" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#A63A2B"/><circle cx="12" cy="12" r="9" fill="none" stroke="#7d2a1f" stroke-width="1"/><circle cx="12" cy="12" r="2.6" fill="#F5EFE0"/><circle cx="8.5" cy="8.5" r="2" fill="#fff" opacity=".35"/></symbol>
    <symbol id="ribbon" viewBox="0 0 24 24"><path d="M5 2 H19 V13 L12 9.5 L5 13 Z" fill="#C8921B"/><path d="M5 13 L12 9.5 L19 13 L19 22 L12 18.5 L5 22 Z" fill="#a87a14"/><path d="M8 5 H16" stroke="#F5EFE0" stroke-width="1.2" opacity=".7"/></symbol>
    <symbol id="seal" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1E4D2B"/><circle cx="12" cy="12" r="8" fill="none" stroke="#C8921B" stroke-width="1"/><path d="M12 6.2 l1.7 3.6 3.9.5-2.9 2.7.8 3.9L12 15l-3.5 1.9.8-3.9-2.9-2.7 3.9-.5Z" fill="#C8921B"/></symbol>
    <symbol id="wreath" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1E4D2B"/><circle cx="12" cy="12" r="10" fill="none" stroke="#C8921B" stroke-width="1.4"/><path d="M5 15 C3.5 10 6 6 10 4.5 M19 15 C20.5 10 18 6 14 4.5" fill="none" stroke="#C8921B" stroke-width="1.5" stroke-linecap="round"/><path d="M12 7.4 l1.3 2.7 2.9.4-2.1 2 .5 2.9L12 14l-2.6 1.4.5-2.9-2.1-2 2.9-.4Z" fill="#F5EFE0"/></symbol>
    <symbol id="logo" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="32" cy="12" r="4.6" fill="none" stroke="#C8921B" stroke-width="2.4"/>
      <path d="M32 16.6 V30 M32 22 h5 M32 26.5 h3.5" stroke="#C8921B" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <g fill="currentColor"><circle cx="17" cy="38" r="3.4"/><circle cx="32" cy="40" r="3.4"/><circle cx="47" cy="38" r="3.4"/></g>
      <g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
        <path d="M13 54 C13 46 15 43 17 43 C19 43 21 46 21 54"/><path d="M28 56 C28 48 30 45 32 45 C34 45 36 48 36 56"/><path d="M43 54 C43 46 45 43 47 43 C49 43 51 46 51 54"/>
        <path d="M19 44 L28 31 M45 44 L36 31"/>
      </g>
    </symbol>
  </svg>`
};
