/* Adanawo District Council: the pages. Look and settings are in settings.js */
(function () {
  const S = window.SITE;
  const sb = window.supabase.createClient(S.supabaseUrl, S.supabaseKey, { auth: { flowType: 'pkce' } });
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (id, cls) => `<svg class="ic ${cls || ''}" aria-hidden="true"><use href="#${id}"/></svg>`;

  const st = { people: [], areas: [], villages: [], settings: {}, posts: [], user: null, roles: [], me: null, error: null };
  const isAdmin = () => st.roles.includes('owner') || st.roles.includes('admin');
  const canAnnounce = () => ['owner', 'admin', 'crown', 'adanawo'].some((r) => st.roles.includes(r));

  // ---------- set up look ----------
  Object.entries(S.colors).forEach(([k, v]) => document.documentElement.style.setProperty('--' + k, v));
  $('#sprites').innerHTML = S.svg;
  $('#siteName').textContent = S.name;
  $('#siteMotto').textContent = S.motto;
  document.title = S.name;

  const ROUTES = [['home', 'Home'], ['leaders', 'Leaders'], ['places', 'Places'], ['about', 'About']];
  function renderNav(cur) {
    const items = ROUTES.slice();
    if (isAdmin()) items.push(['admin', 'Admin office']);
    $('#nav').innerHTML = items.map(([k, l]) => `<a href="#/${k}" class="${k === cur ? 'on' : ''}">${l}</a>`).join('');
  }

  // ---------- helpers ----------
  function photoUrl(p) {
    if (!p) return null;
    return sb.storage.from('photos').getPublicUrl(p).data.publicUrl;
  }
  function personCard(p) {
    const m = S.marks[p.mark] || S.marks.none;
    const img = photoUrl(p.photo_path);
    const badge = m.icon ? `<span class="badge" title="${esc(m.label)}">${ico(m.icon)}</span>` : '';
    return `<article class="card person mark-${esc(p.mark)}">
      <div class="photo">${img ? `<img src="${esc(img)}" alt="${esc(p.full_name)}" loading="lazy">` : ico('person', 'p')}${badge}</div>
      <h3>${esc(p.full_name)}</h3>
      <p class="pt">${esc(p.title || '')}</p>
      ${p.office ? `<p class="off">${esc(p.office)}</p>` : ''}
      ${p.is_late ? '<p class="late">Late</p>' : ''}
    </article>`;
  }
  const byRank = (a, b) => (a.rank_order - b.rank_order) || a.full_name.localeCompare(b.full_name);
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }
  function openModal(html) { const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.hidden = false; }
  function closeModal() { $('#modal').hidden = true; }
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.dataset.close) closeModal(); });

  // ---------- data ----------
  async function loadPublic() {
    const q = (t, f) => (f ? f(sb.from(t).select('*')) : sb.from(t).select('*'));
    const [p, a, v, s, po] = await Promise.all([
      q('people'), q('areas'), q('villages'), q('site_settings'),
      q('posts', (x) => x.eq('kind', 'announcement').eq('hidden', false).order('created_at', { ascending: false }).limit(5))
    ]);
    const bad = [p, a, v, s, po].find((r) => r.error);
    if (bad) throw bad.error;
    st.people = p.data; st.areas = a.data.sort((x, y) => x.sort_order - y.sort_order);
    st.villages = v.data.sort((x, y) => x.sort_order - y.sort_order);
    st.settings = Object.fromEntries(s.data.map((r) => [r.key, r.value]));
    st.posts = po.data;
  }
  async function loadMe() {
    st.roles = []; st.me = null;
    if (!st.user) return;
    const r = await sb.from('user_roles').select('role').eq('user_id', st.user.id);
    st.roles = (r.data || []).map((x) => x.role);
    st.me = st.people.find((p) => p.user_id === st.user.id) || null;
  }
  async function refresh() {
    try { st.error = null; await loadPublic(); await loadMe(); } catch (e) { st.error = e.message || String(e); }
    render();
  }

  // ---------- sign in ----------
  async function signIn() {
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    if (error) toast('Could not start sign-in: ' + error.message);
  }
  async function signOut() { await sb.auth.signOut(); st.user = null; st.roles = []; st.me = null; render(); }
  function renderAuth() {
    const box = $('#authBox');
    if (!st.user) { box.innerHTML = '<button class="btn small" id="inBtn">Sign in</button>'; $('#inBtn').onclick = signIn; return; }
    const name = (st.me && st.me.full_name) || st.user.email || 'Signed in';
    box.innerHTML = `<span class="who">${esc(name)}</span><button class="btn alt small" id="outBtn">Sign out</button>`;
    $('#outBtn').onclick = signOut;
  }

  // ---------- pages ----------
  function viewHome() {
    const note = (st.settings.note_text || '').trim();
    const posts = st.posts.map((p) => {
      const au = st.people.find((x) => x.user_id === p.author_id);
      return `<article class="post">${p.title ? `<h3>${esc(p.title)}</h3>` : ''}<p>${esc(p.body)}</p><small>${esc(au ? au.full_name : 'The Palace')} · ${new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</small></article>`;
    }).join('');
    const composer = canAnnounce() ? `<div class="card" style="margin-bottom:14px"><label for="annTitle">New announcement</label>
      <input type="text" id="annTitle" placeholder="Title (optional)"><label for="annBody" style="margin-top:8px">Message</label>
      <textarea id="annBody" placeholder="Write the announcement here"></textarea>
      <div class="row"><button class="btn" id="annBtn">Post announcement</button></div></div>` : '';
    const claim = st.user && st.me && st.me.category === 'member' ? `<div class="card" style="margin-top:22px"><h3>Are you a leader of Adanawo?</h3>
      <p class="lead" style="margin:6px 0 10px">If the palace gave you a code, enter it once to claim your profile.</p>
      <input type="text" id="claimCode" placeholder="Your code" autocapitalize="characters" style="max-width:240px">
      <div class="row"><button class="btn" id="claimBtn">Claim my profile</button></div></div>` : '';
    return `<section class="hero">${ico('palm', 'palms l')}${ico('palm', 'palms r')}
      <h1>${esc(S.name)}</h1><span class="motto">${esc(S.motto)}</span><div class="bandline"></div></section>
      ${note ? `<section class="note"><p>${esc(note)}</p><small>${esc(st.settings.note_signed || '')}</small></section>` : ''}
      ${claim}
      <section class="section"><h2>${ico('calabash')} Announcements</h2>
        <p class="lead">Words from the Onu Ankpa, the Eje and the Adanawo.</p>
        ${composer}${posts || '<p class="empty">No announcements yet.</p>'}</section>
      <div class="support"><button class="btn" id="supportBtn">${esc(S.supportLabel)}</button></div>`;
  }
  function bindHome() {
    const sup = $('#supportBtn'); if (sup) sup.onclick = openSupport;
    const ab = $('#annBtn');
    if (ab) ab.onclick = async () => {
      const body = $('#annBody').value.trim(); if (!body) return toast('Write the message first');
      ab.disabled = true;
      const { error } = await sb.from('posts').insert({ author_id: st.user.id, kind: 'announcement', title: $('#annTitle').value.trim() || null, body });
      ab.disabled = false;
      if (error) return toast('Could not post: ' + error.message);
      toast('Announcement posted'); await refresh();
    };
    const cb = $('#claimBtn');
    if (cb) cb.onclick = async () => {
      const code = $('#claimCode').value.trim(); if (!code) return toast('Enter your code');
      cb.disabled = true;
      const { error } = await sb.rpc('claim_profile', { p_code: code });
      cb.disabled = false;
      if (error) return toast(error.message);
      toast('Welcome. Your profile is yours now.'); await refresh();
    };
  }
  function openSupport() {
    const url = `https://wa.me/${S.supportWhatsApp}?text=${encodeURIComponent('Hello, I have a technical issue on the Adanawo District Council website: ')}`;
    openModal(`<h2>${esc(S.supportLabel)}</h2>
      <p>Tap the button to send a message on WhatsApp. Please say what you were trying to do and what happened.</p>
      <div class="row"><a class="btn" href="${url}" target="_blank" rel="noopener">Open WhatsApp</a>
      ${isAdmin() ? '<a class="btn alt" href="#/admin" data-close="1">Open admin office</a>' : ''}
      <button class="btn alt" data-close="1">Close</button></div>`);
  }

  function viewLeaders() {
    const crown = st.people.filter((p) => ['king', 'district_head'].includes(p.category) && !p.is_past).sort(byRank);
    const pol = st.people.filter((p) => p.category === 'political').sort(byRank);
    const off = st.people.filter((p) => p.category === 'council_officer').sort(byRank);
    const past = st.people.filter((p) => p.is_past).sort(byRank);
    const grid = (l) => `<div class="people">${l.map(personCard).join('')}</div>`;
    return `<section class="section" style="margin-top:6px"><h2>${ico('crown')} The Crown</h2>
        <p class="lead">The Onu Ankpa, the Eje and the Adanawo.</p>${grid(crown)}</section>
      ${pol.length ? `<section class="section"><h2>${ico('seal')} Political office holders</h2><p class="lead">Sons and daughters of Adanawo District in public office.</p>${grid(pol)}</section>` : ''}
      ${off.length ? `<section class="section"><h2>${ico('ribbon')} District Council officers</h2>${grid(off)}</section>` : ''}
      ${past.length ? `<section class="section"><h2>${ico('palm')} Past District Heads</h2><p class="lead">We remember those who led before.</p>${grid(past)}</section>` : ''}`;
  }

  function gagoRow(p) {
    const img = photoUrl(p.photo_path);
    const yr = p.appointed_on ? ` · since ${new Date(p.appointed_on).getFullYear()}` : '';
    return `<div class="gago">${img ? `<img class="gp" src="${esc(img)}" alt="" loading="lazy">` : ico('bead')}
      <div><div class="gn">${esc(p.full_name)}</div><div class="gt">${esc(p.title || '')}${yr}</div></div></div>`;
  }
  function villageGroups(vs, gagos) {
    return vs.map((v) => {
      const g = gagos.filter((x) => x.village_id === v.id).sort(byRank);
      if (!g.length) return '';
      return `<details class="vg"><summary>${esc(v.name)}<span>${g.length} Gago${g.length > 1 ? 's' : ''}</span></summary>${g.map(gagoRow).join('')}</details>`;
    }).join('');
  }
  function viewPlaces() {
    const gagos = st.people.filter((p) => p.category === 'gago');
    const hqV = st.villages.find((v) => v.is_headquarters);
    const hqG = hqV ? gagos.filter((g) => g.village_id === hqV.id).sort(byRank) : [];
    const hq = hqV ? `<section class="area hq"><div class="head"><h2>${esc(hqV.name)}</h2><span>Administrative Headquarters</span></div>
      <div class="body">${hqG.length ? hqG.map(gagoRow).join('') : '<p class="empty">Gagos will appear here.</p>'}</div></section>` : '';
    const areas = st.areas.map((a) => {
      const vs = st.villages.filter((v) => v.area_id === a.id);
      const ag = gagos.filter((g) => vs.some((v) => v.id === g.village_id && !v.is_headquarters));
      return `<section class="area"><div class="head"><h2>${esc(a.name)}</h2><span>${vs.length} villages · ${ag.length} Gagos</span></div>
        <div class="body"><div class="chips">${vs.map((v) => `<span class="chip ${v.is_headquarters ? 'hq' : ''}">${esc(v.name)}${v.is_headquarters ? ' (HQ)' : ''}</span>`).join('')}</div>
        ${villageGroups(vs.filter((v) => !v.is_headquarters), ag) || '<p class="empty">Gagos will appear here.</p>'}</div></section>`;
    }).join('');
    const known = new Set(st.villages.map((v) => v.id));
    const rest = gagos.filter((g) => !g.village_id || !known.has(g.village_id)).sort(byRank);
    const other = rest.length ? `<section class="area"><div class="head"><h2>Other Gago areas</h2><span>${rest.length} Gagos</span></div><div class="body">${rest.map(gagoRow).join('')}</div></section>` : '';
    return `<section class="section" style="margin-top:6px"><h2>${ico('bead')} Places and Gagos</h2>
      <p class="lead">Adanawo District is made up of three areas, with Emanyi as the Administrative Headquarters. Tap a village to see its Gagos.</p></section>${hq}${areas}${other}`;
  }

  function viewAbout() {
    return `<section class="section" style="margin-top:6px"><h2>${ico('palm')} About</h2>
      ${S.aboutText.map((t) => `<p>${esc(t)}</p>`).join('')}
      <p style="margin-top:22px;color:var(--soft)">${esc(S.creditLine)}.</p></section>`;
  }

  // ---------- admin office ----------
  function viewAdmin() {
    if (!isAdmin()) return '<p class="empty">This part is only for the palace administrators.</p>';
    return `<section class="section" style="margin-top:6px"><h2>${ico('seal')} Admin office</h2>
      <div class="card" style="margin-top:12px"><h3>The Note</h3>
        <label for="noteText">Text shown on the Home page</label><textarea id="noteText">${esc(st.settings.note_text || '')}</textarea>
        <label for="noteSigned">Signed</label><input type="text" id="noteSigned" value="${esc(st.settings.note_signed || '')}">
        <div class="row"><button class="btn" id="noteBtn">Save the Note</button></div></div>
      <div class="card" style="margin-top:14px"><h3>People</h3>
        <p class="lead" style="margin:4px 0 8px">Search a person, then make a code to give them so they can claim their profile.</p>
        <input type="search" id="pSearch" placeholder="Search by name or place">
        <div id="pList"></div></div></section>`;
  }
  function bindAdmin() {
    const nb = $('#noteBtn');
    if (nb) nb.onclick = async () => {
      nb.disabled = true;
      const r = await Promise.all([
        sb.from('site_settings').update({ value: $('#noteText').value }).eq('key', 'note_text'),
        sb.from('site_settings').update({ value: $('#noteSigned').value }).eq('key', 'note_signed')
      ]);
      nb.disabled = false;
      const e = r.find((x) => x.error); if (e) return toast('Could not save: ' + e.error.message);
      toast('Note saved'); await refresh();
    };
    const list = $('#pList'); if (!list) return;
    const draw = () => {
      const q = ($('#pSearch').value || '').toLowerCase().trim();
      let ps = st.people.filter((p) => p.category !== 'member' || p.user_id);
      if (q) ps = ps.filter((p) => (p.full_name + ' ' + (p.title || '') + ' ' + (p.gago_area || '')).toLowerCase().includes(q));
      else ps = ps.filter((p) => p.needs_review || ['king', 'district_head'].includes(p.category));
      ps = ps.sort(byRank).slice(0, 40);
      list.innerHTML = ps.map((p) => `<div class="admin-row"><div><b>${esc(p.full_name)}</b><small>${esc(p.title || '')}${p.user_id ? ' · signed in' : ''}</small>${p.needs_review ? '<small class="flag">Please check this entry</small>' : ''}</div>
        <div class="row" style="margin:0">${p.user_id ? '' : `<button class="btn small" data-code="${p.id}">Make code</button>`}${p.needs_review ? `<button class="btn alt small" data-ok="${p.id}">Checked</button>` : ''}</div></div>`).join('') || '<p class="empty">Nothing to show. Try a search.</p>';
    };
    draw(); $('#pSearch').oninput = draw;
    list.onclick = async (e) => {
      const c = e.target.dataset.code, ok = e.target.dataset.ok;
      if (c) {
        const { data, error } = await sb.rpc('make_claim_code', { p_person: c });
        if (error) return toast(error.message);
        const p = st.people.find((x) => x.id === c);
        const msg = `Hello ${p.full_name}. To claim your profile on the Adanawo District Council website: open ${location.origin + location.pathname}, sign in with Google, and enter this code: ${data}`;
        openModal(`<h2>Code for ${esc(p.full_name)}</h2><div class="code">${esc(data)}</div>
          <p>Send it to them by WhatsApp. It works once.</p>
          <div class="row"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Send on WhatsApp</a><button class="btn alt" data-close="1">Close</button></div>`);
      } else if (ok) {
        const { error } = await sb.from('people').update({ needs_review: false }).eq('id', ok);
        if (error) return toast(error.message);
        const p = st.people.find((x) => x.id === ok); if (p) p.needs_review = false; draw(); toast('Marked as checked');
      }
    };
  }

  // ---------- router ----------
  function render() {
    const cur = (location.hash.replace(/^#\//, '') || 'home').split('?')[0];
    const route = ['home', 'leaders', 'places', 'about', 'admin'].includes(cur) ? cur : 'home';
    renderNav(route); renderAuth();
    const v = $('#view');
    if (st.error) { v.innerHTML = `<div class="err">The page could not load its information. Please check your internet and try again.<br><small>${esc(st.error)}</small></div>`; return; }
    v.innerHTML = { home: viewHome, leaders: viewLeaders, places: viewPlaces, about: viewAbout, admin: viewAdmin }[route]();
    if (route === 'home') bindHome();
    if (route === 'admin') bindAdmin();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', () => { closeModal(); render(); });

  // ---------- start ----------
  sb.auth.onAuthStateChange((_e, session) => {
    const u = session ? session.user : null;
    if ((u && u.id) !== (st.user && st.user.id)) { st.user = u; setTimeout(refresh, 0); }
  });
  (async () => {
    const { data } = await sb.auth.getSession();
    st.user = data.session ? data.session.user : null;
    if (location.search.includes('code=')) history.replaceState({}, '', location.pathname + location.hash);
    await refresh();
  })();
})();
