/* Adanawo District Council: core (pages Home, Leaders, Places, About, Admin office).
   The other pages live in features.js. Look and settings are in settings.js */
(function () {
  const S = window.SITE;
  const sb = window.supabase.createClient(S.supabaseUrl, S.supabaseKey, { auth: { flowType: 'pkce' } });
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (id, cls) => `<svg class="ic ${cls || ''}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const st = { people: [], areas: [], villages: [], settings: {}, user: null, roles: [], me: null, error: null };
  const has = (...r) => r.some((x) => st.roles.includes(x));
  const isAdmin = () => has('owner', 'admin');
  const fmtDate = (d, withTime) => d ? new Date(d).toLocaleString('en-GB', Object.assign({ day: 'numeric', month: 'long', year: 'numeric' }, withTime ? { hour: '2-digit', minute: '2-digit' } : {})) : '';
  const byRank = (a, b) => (a.rank_order - b.rank_order) || a.full_name.localeCompare(b.full_name);
  const PAGES = {};
  const APP = { S, sb, st, $, esc, ico, has, isAdmin, fmtDate, byRank, PAGES };
  window.APP = APP;

  // ---------- look ----------
  Object.entries(S.colors).forEach(([k, v]) => document.documentElement.style.setProperty('--' + k, v));
  $('#sprites').innerHTML = S.svg;
  $('#siteName').textContent = S.name; $('#siteMotto').textContent = S.motto; document.title = S.name;

  // ---------- small tools ----------
  function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
  function openModal(html) { const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.hidden = false; }
  function closeModal() { $('#modal').hidden = true; }
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.dataset.close) closeModal(); });
  Object.assign(APP, { toast, openModal, closeModal });

  const photoUrl = (p) => (p ? sb.storage.from('photos').getPublicUrl(p).data.publicUrl : null);
  const personByUser = (uid) => st.people.find((p) => p.user_id === uid);
  const nameOf = (uid) => (personByUser(uid) || {}).full_name || 'A member';
  Object.assign(APP, { photoUrl, personByUser, nameOf });

  // pick a picture, shrink it (keeps the free storage small), upload it, give back its path
  function pickFile() {
    return new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => res(i.files[0] || null); i.click(); });
  }
  async function shrink(file, maxSide) {
    const url = URL.createObjectURL(file);
    const img = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = url; });
    const k = Math.min(1, maxSide / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
  }
  async function uploadPhoto(file, maxSide) {
    if (!st.user) throw new Error('Please sign in first');
    const blob = await shrink(file, maxSide || 900);
    const path = `${st.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
    const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) throw error;
    return path;
  }
  async function choosePhoto(maxSide) { const f = await pickFile(); return f ? uploadPhoto(f, maxSide) : null; }
  Object.assign(APP, { pickFile, uploadPhoto, choosePhoto, shrink });

  // ---------- people cards ----------
  function personCard(p) {
    const m = S.marks[p.mark] || S.marks.none; const img = photoUrl(p.photo_path);
    const badge = (m.crown ? `<span class="crownTop">${ico('crown')}</span>` : '') + (m.icon ? `<span class="badge" title="${esc(m.label)}">${ico(m.icon)}</span>` : '');
    return `<article class="card person mark-${esc(p.mark)}"><div class="photo">${img ? `<img src="${esc(img)}" alt="${esc(p.full_name)}" loading="lazy">` : ico('person', 'p')}${badge}</div>
      <h3>${esc(p.full_name)}</h3><p class="pt">${esc(p.title || '')}</p>${p.office ? `<p class="off">${esc(p.office)}</p>` : ''}${p.is_late ? '<p class="late">Late</p>' : ''}</article>`;
  }
  Object.assign(APP, { personCard });

  // ---------- data ----------
  async function loadPublic() {
    const q = (t) => sb.from(t).select('*');
    const [p, a, v, s] = await Promise.all([q('people'), q('areas'), q('villages'), q('site_settings')]);
    const bad = [p, a, v, s].find((r) => r.error); if (bad) throw bad.error;
    st.people = p.data; st.areas = a.data.sort((x, y) => x.sort_order - y.sort_order);
    st.villages = v.data.sort((x, y) => x.sort_order - y.sort_order);
    st.settings = Object.fromEntries(s.data.map((r) => [r.key, r.value]));
  }
  async function loadMe() {
    st.roles = []; st.me = null; if (!st.user) return;
    const r = await sb.from('user_roles').select('role').eq('user_id', st.user.id);
    st.roles = (r.data || []).map((x) => x.role);
    st.me = st.people.find((p) => p.user_id === st.user.id) || null;
  }
  async function refresh() { try { st.error = null; await loadPublic(); await loadMe(); } catch (e) { st.error = e.message || String(e); } await render(); }
  APP.refresh = refresh;
  async function setting(key, value) {
    const { error } = await sb.from('site_settings').upsert({ key, value }); if (error) throw error;
  }
  APP.setting = setting;

  // ---------- sign in ----------
  async function signIn() {
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    if (error) toast('Could not start sign-in: ' + error.message);
  }
  async function signOut() { await sb.auth.signOut(); st.user = null; st.roles = []; st.me = null; location.hash = '#/home'; render(); }
  APP.signIn = signIn;
  function openSignIn() {
    openModal(`<h2>Sign in</h2><p>Welcome. Choose how you would like to sign in.</p>
      <button class="btn" data-act="google" style="width:100%">Continue with Google</button>
      <details class="card" style="margin-top:14px"><summary><b>Use email and password instead</b></summary>
        <label for="siEmail">Email</label><input type="text" id="siEmail" inputmode="email" autocapitalize="none" autocomplete="username">
        <label for="siPass">Password</label><input type="password" id="siPass" autocomplete="current-password">
        <div class="row"><button class="btn" data-act="pwin">Sign in</button></div>
        <hr style="border:0;border-top:1px dashed #d9cda8;margin:16px 0"><b>New here?</b>
        <label for="siName">Your name</label><input type="text" id="siName">
        <div class="row"><button class="btn alt" data-act="pwup">Create my account</button></div>
        <small>At least 6 characters for the password. If you forget it, message the palace with the "Report any technical issue" button.</small></details>
      <div class="row"><button class="btn alt" data-close="1">Close</button></div>`);
  }
  async function pwAuth(kind) {
    const email = ($('#siEmail').value || '').trim(), password = $('#siPass').value || '';
    if (!email || password.length < 6) return toast('Please enter your email and a password of at least 6 characters');
    let r;
    if (kind === 'pwin') r = await sb.auth.signInWithPassword({ email, password });
    else { const name = ($('#siName').value || '').trim(); if (!name) return toast('Please enter your name'); r = await sb.auth.signUp({ email, password, options: { data: { full_name: name } } }); }
    if (r.error) return toast(r.error.message);
    if (kind === 'pwup' && !r.data.session) return toast('Almost done. Please open the email we sent you and confirm it, then sign in.');
    closeModal(); toast('Welcome');
  }
  const needSignIn = (why) => `<div class="card" style="text-align:center"><p>${esc(why || 'Please sign in to continue.')}</p><button class="btn" data-act="signin">Sign in with Google</button></div>`;
  APP.needSignIn = needSignIn;
  function renderAuth() {
    const box = $('#authBox');
    if (!st.user) { box.innerHTML = '<button class="btn small" data-act="signin">Sign in</button>'; return; }
    const name = (st.me && st.me.full_name) || st.user.email || 'Signed in';
    box.innerHTML = `<a class="who" href="#/me">${esc(name)}</a><button class="btn alt small" data-act="signout">Sign out</button>`;
  }

  // ---------- posts, likes and comments (used by Home and Youth) ----------
  async function postBlocks(posts) {
    if (!posts.length) return '<p class="empty">Nothing here yet.</p>';
    const ids = posts.map((p) => p.id);
    const [lk, cm] = await Promise.all([sb.from('likes').select('*').in('post_id', ids), sb.from('comments').select('*').in('post_id', ids).order('created_at')]);
    const likes = lk.data || [], comments = cm.data || [];
    return posts.map((p) => {
      const l = likes.filter((x) => x.post_id === p.id), mine = st.user && l.some((x) => x.user_id === st.user.id);
      const cs = comments.filter((x) => x.post_id === p.id), img = photoUrl(p.photo_path);
      const own = st.user && p.author_id === st.user.id;
      return `<article class="post kind-${esc(p.kind)}">${p.title ? `<h3>${esc(p.title)}</h3>` : ''}
        ${p.talent ? `<p class="meta"><b>Talent:</b> ${esc(p.talent)}</p>` : ''}${img ? `<img class="pic" src="${esc(img)}" alt="" loading="lazy">` : ''}
        <p>${esc(p.body)}</p>${p.support_needed ? `<p class="meta"><b>Support needed:</b> ${esc(p.support_needed)}</p>` : ''}
        <small>${esc(nameOf(p.author_id))} · ${fmtDate(p.created_at)}</small>
        <div class="acts"><button class="lk ${mine ? 'on' : ''}" data-act="like" data-id="${p.id}" data-on="${mine ? 1 : 0}">♥ ${l.length}</button>
          ${p.comments_open ? `<button data-act="comments" data-id="${p.id}">Comments (${cs.length})</button>` : ''}
          ${own || isAdmin() ? `<button data-act="delpost" data-id="${p.id}">Delete</button>` : (st.user ? `<button data-act="report" data-type="post" data-id="${p.id}">Report</button>` : '')}</div>
        <div class="cbox" id="cb-${p.id}" hidden>${cs.map((c) => `<div class="cm"><b>${esc(nameOf(c.author_id))}</b> ${esc(c.body)}${st.user && (c.author_id === st.user.id || isAdmin()) ? ` <a href="#" data-act="delcomment" data-id="${c.id}">remove</a>` : ''}</div>`).join('')}
          ${st.user ? `<div class="row" style="margin-top:8px"><input type="text" id="ci-${p.id}" placeholder="Write a comment"><button class="btn small" data-act="sendcomment" data-id="${p.id}">Send</button></div>` : '<small>Sign in to comment.</small>'}</div>
      </article>`;
    }).join('');
  }
  APP.postBlocks = postBlocks;

  // one click handler for every button marked with data-act
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act, id = el.dataset.id; let r;
    try {
      if (act === 'signin') return openSignIn();
      if (act === 'google') { closeModal(); return signIn(); }
      if (act === 'pwin' || act === 'pwup') return pwAuth(act);
      if (act === 'signout') return signOut();
      if (act === 'support') return openSupport();
      if (!st.user && ['like', 'sendcomment', 'report'].includes(act)) return toast('Please sign in first');
      if (act === 'comments') { const b = $('#cb-' + id); b.hidden = !b.hidden; return; }
      if (act === 'like') r = el.dataset.on === '1' ? await sb.from('likes').delete().eq('post_id', id).eq('user_id', st.user.id) : await sb.from('likes').insert({ post_id: id, user_id: st.user.id });
      else if (act === 'sendcomment') { const v = $('#ci-' + id).value.trim(); if (!v) return; r = await sb.from('comments').insert({ post_id: id, author_id: st.user.id, body: v }); }
      else if (act === 'delcomment') { e.preventDefault(); r = await sb.from('comments').delete().eq('id', id); }
      else if (act === 'delpost') { if (!confirm('Delete this post?')) return; r = await sb.from('posts').delete().eq('id', id); }
      else if (act === 'report') { r = await sb.from('reports').insert({ reporter_id: st.user.id, target_type: el.dataset.type, target_id: id, reason: 'Reported from the site' }); if (!r.error) return toast('Thank you. The palace will look at it.'); }
      else return;
      if (r && r.error) return toast(r.error.message);
      await render(true);
    } catch (err) { toast(err.message || String(err)); }
  });
  Object.assign(APP, { post: async (row) => sb.from('posts').insert(Object.assign({ author_id: st.user.id }, row)) });

  // ---------- support ----------
  function openSupport() {
    const url = `https://wa.me/${S.supportWhatsApp}?text=${encodeURIComponent('Hello, I have a technical issue on the Adanawo District Council website: ')}`;
    openModal(`<h2>${esc(S.supportLabel)}</h2><p>Tap the button to send a message on WhatsApp. Please say what you were trying to do and what happened.</p>
      <div class="row"><a class="btn" href="${url}" target="_blank" rel="noopener">Open WhatsApp</a>${isAdmin() ? '<a class="btn alt" href="#/admin" data-close="1">Open admin office</a>' : ''}<button class="btn alt" data-close="1">Close</button></div>`);
  }

  // ---------- Home ----------
  PAGES.home = { async view() {
    const note = (st.settings.note_text || '').trim();
    const [an, lp, live] = await Promise.all([
      sb.from('posts').select('*').eq('kind', 'announcement').eq('hidden', false).order('created_at', { ascending: false }).limit(5),
      sb.from('posts').select('*').eq('kind', 'leader_post').eq('hidden', false).order('created_at', { ascending: false }).limit(5),
      sb.from('meetings').select('*').eq('is_live', true)]);
    const canAnn = has('owner', 'admin', 'crown', 'adanawo'), canLead = has('owner', 'admin', 'crown', 'adanawo', 'leader', 'gago');
    const composer = (kind, label) => `<div class="card" style="margin-bottom:14px"><label>${label}</label><input type="text" id="t-${kind}" placeholder="Title (optional)">
      <textarea id="b-${kind}" placeholder="Write here" style="margin-top:8px"></textarea><div class="row"><button class="btn" data-act="newpost" data-kind="${kind}">Post</button></div></div>`;
    const claim = st.user && st.me && st.me.category === 'member' && !st.roles.length ? `<div class="card" style="margin-top:22px"><h3>Are you a leader of Adanawo?</h3>
      <p class="lead" style="margin:6px 0 10px">If the palace gave you a code, enter it once to claim your profile. Everyone else can ignore this.</p>
      <input type="text" id="claimCode" placeholder="Your code" autocapitalize="characters" style="max-width:240px"><div class="row"><button class="btn" data-act="claim">Claim my profile</button></div></div>` : '';
    const liveBar = (live.data || []).map((m) => `<a class="livebar" href="#/meetings"><span class="dot"></span> Live now: ${esc(m.title)}</a>`).join('');
    return `<section class="hero">${ico('palm', 'palms l')}${ico('palm', 'palms r')}<h1>${esc(S.name)}</h1><span class="motto">${esc(S.motto)}</span><div class="bandline"></div></section>
      ${liveBar}${note ? `<section class="note"><p>${esc(note)}</p><small>${esc(st.settings.note_signed || '')}</small></section>` : ''}${claim}
      <section class="section"><h2>${ico('calabash')} Announcements</h2><p class="lead">Words from the Onu Ankpa, the Eje and the Adanawo.</p>
        ${canAnn ? composer('announcement', 'New announcement') : ''}${await postBlocks(an.data || [])}</section>
      <section class="section"><h2>${ico('ribbon')} From the leaders</h2><p class="lead">Notices from Gagos and other leaders. Everyone can comment and like.</p>
        ${canLead ? composer('leader_post', 'New notice') : ''}${await postBlocks(lp.data || [])}</section>
      <div class="support"><button class="btn" data-act="support">${esc(S.supportLabel)}</button></div>`;
  }, async onClick(act, el) {
    if (act === 'newpost') {
      const kind = el.dataset.kind, body = $('#b-' + kind).value.trim(); if (!body) return toast('Write the message first');
      const { error } = await APP.post({ kind, title: $('#t-' + kind).value.trim() || null, body }); if (error) return toast(error.message);
      toast('Posted'); return true;
    }
    if (act === 'claim') {
      const code = $('#claimCode').value.trim(); if (!code) return toast('Enter your code');
      const { error } = await sb.rpc('claim_profile', { p_code: code }); if (error) return toast(error.message);
      toast('Welcome. Your profile is yours now.'); await refresh();
    }
  } };

  // ---------- Leaders ----------
  PAGES.leaders = { view() {
    const crown = st.people.filter((p) => ['king', 'district_head'].includes(p.category) && !p.is_past).sort(byRank);
    const pol = st.people.filter((p) => p.category === 'political').sort(byRank);
    const off = st.people.filter((p) => p.category === 'council_officer').sort(byRank);
    const past = st.people.filter((p) => p.is_past).sort(byRank);
    const grid = (l) => `<div class="people">${l.map(personCard).join('')}</div>`;
    return `<section class="section" style="margin-top:6px"><h2>${ico('crown')} The Crown</h2><p class="lead">The Onu Ankpa, the Eje and the Adanawo.</p>${grid(crown)}</section>
      ${pol.length ? `<section class="section"><h2>${ico('seal')} Political office holders</h2><p class="lead">Sons and daughters of Adanawo District in public office.</p>${grid(pol)}</section>` : ''}
      ${off.length ? `<section class="section"><h2>${ico('ribbon')} District Council officers</h2>${grid(off)}</section>` : ''}
      <section class="section"><h2>${ico('calabash')} Community structures</h2><p class="lead">The bodies that organise the life of Adanawo, and who leads them.</p>
        <div class="people">${S.structures.map((x) => `<article class="card person"><h3>${esc(x.name)}</h3><p class="off" style="margin-top:8px">${esc(x.head)}</p><p class="pt">${esc(x.role)}</p></article>`).join('')}</div></section>
      ${past.length ? `<section class="section"><h2>${ico('palm')} Past District Heads</h2><p class="lead">We remember those who led before.</p>${grid(past)}</section>` : ''}`;
  } };

  // ---------- Places ----------
  function gagoRow(p) {
    const img = photoUrl(p.photo_path), yr = p.appointed_on ? ` · since ${new Date(p.appointed_on).getFullYear()}` : '';
    return `<div class="gago">${img ? `<img class="gp" src="${esc(img)}" alt="" loading="lazy">` : ico('bead')}<div><div class="gn">${esc(p.full_name)}</div><div class="gt">${esc(p.title || '')}${yr}</div></div></div>`;
  }
  function villageGroups(vs, gagos) {
    return vs.map((v) => { const g = gagos.filter((x) => x.village_id === v.id).sort(byRank); if (!g.length) return '';
      return `<details class="vg"><summary>${esc(v.name)}<span>${g.length} Gago${g.length > 1 ? 's' : ''}</span></summary>${g.map(gagoRow).join('')}</details>`; }).join('');
  }
  PAGES.places = { view() {
    const gagos = st.people.filter((p) => p.category === 'gago'), hqV = st.villages.find((v) => v.is_headquarters);
    const hqG = hqV ? gagos.filter((g) => g.village_id === hqV.id).sort(byRank) : [];
    const hq = hqV ? `<section class="area hq"><div class="head"><h2>${esc(hqV.name)}</h2><span>Administrative Headquarters</span></div><div class="body">${hqG.length ? hqG.map(gagoRow).join('') : '<p class="empty">Gagos will appear here.</p>'}</div></section>` : '';
    const areas = st.areas.map((a) => { const vs = st.villages.filter((v) => v.area_id === a.id);
      const ag = gagos.filter((g) => vs.some((v) => v.id === g.village_id && !v.is_headquarters));
      return `<section class="area"><div class="head"><h2>${esc(a.name)}</h2><span>${vs.length} villages · ${ag.length} Gagos</span></div><div class="body"><div class="chips">${vs.map((v) => `<span class="chip ${v.is_headquarters ? 'hq' : ''}">${esc(v.name)}${v.is_headquarters ? ' (HQ)' : ''}</span>`).join('')}</div>
        ${villageGroups(vs.filter((v) => !v.is_headquarters), ag) || '<p class="empty">Gagos will appear here.</p>'}</div></section>`; }).join('');
    const known = new Set(st.villages.map((v) => v.id)), rest = gagos.filter((g) => !g.village_id || !known.has(g.village_id)).sort(byRank);
    const byPlace = {}; rest.forEach((g) => { (byPlace[g.gago_area || 'Other'] = byPlace[g.gago_area || 'Other'] || []).push(g); });
    const other = rest.length ? `<section class="area"><div class="head"><h2>Gagos of other places</h2><span>${rest.length} Gagos</span></div><div class="body">
      ${Object.entries(byPlace).sort((x, y) => x[0].localeCompare(y[0])).map(([pl, l]) => `<details class="vg"><summary>${esc(pl)}<span>${l.length} Gago${l.length > 1 ? 's' : ''}</span></summary>${l.sort(byRank).map(gagoRow).join('')}</details>`).join('')}</div></section>` : '';
    return `<section class="section" style="margin-top:6px"><h2>${ico('bead')} Places and Gagos</h2><p class="lead">Adanawo District is made up of three areas, with Emanyi as the Administrative Headquarters. Tap a village to see its Gagos.</p></section>${hq}${areas}${other}`;
  } };

  // ---------- About (with the suggestion box) ----------
  PAGES.about = { view() {
    return `<section class="section" style="margin-top:6px"><h2>${ico('palm')} About</h2>${S.aboutText.map((t) => `<p>${esc(t)}</p>`).join('')}
      <p style="margin-top:22px;color:var(--soft)">${esc(S.creditLine)}.</p></section>
      <section class="section"><h2>${ico('calabash')} Suggestion box</h2><p class="lead">Have an idea to make this page better? Tell us. Only the page owner reads it.</p>
      ${st.user ? `<textarea id="sugg" placeholder="Your suggestion"></textarea><div class="row"><button class="btn" data-act="suggest">Send suggestion</button></div>` : needSignIn('Please sign in to send a suggestion.')}</section>`;
  }, async onClick(act) {
    if (act === 'suggest') { const b = $('#sugg').value.trim(); if (!b) return toast('Write your suggestion first');
      const { error } = await sb.from('suggestions').insert({ author_id: st.user.id, body: b }); if (error) return toast(error.message);
      $('#sugg').value = ''; toast('Thank you. Your suggestion was sent.'); }
  } };

  // ---------- Admin office ----------
  PAGES.admin = { async view() {
    if (!isAdmin()) return '<p class="empty">This part is only for the palace administrators.</p>';
    const [sg, rp, gr, gm] = await Promise.all([has('owner') ? sb.from('suggestions').select('*').order('created_at', { ascending: false }).limit(30) : { data: [] },
      sb.from('reports').select('*').eq('resolved', false).order('created_at', { ascending: false }).limit(30),
      sb.from('groups').select('*').order('sort_order'), sb.from('group_members').select('*').eq('role', 'admin')]);
    const signed = st.people.filter((p) => p.user_id).sort((x, y) => x.full_name.localeCompare(y.full_name));
    const leadersCard = `<div class="card" style="margin-top:14px"><h3>Group leaders</h3><p class="lead" style="margin:4px 0 8px">Each group leader approves who joins their group. The leader must have signed in once.</p>
      ${(gr.data || []).map((g) => { const ls = (gm.data || []).filter((m) => m.group_id === g.id);
        return `<div class="admin-row" style="display:block"><b>${esc(g.name)}</b><small>Leader: ${ls.map((m) => `${esc(nameOf(m.user_id))} <button class="lnk" data-act="unlead" data-gid="${g.id}" data-uid="${m.user_id}">remove</button>`).join(', ') || 'none yet'}</small>
          <div class="row"><select id="gl-${g.id}" style="flex:1;min-width:0"><option value="">Choose a person who has signed in</option>${signed.map((p) => `<option value="${p.user_id}">${esc(p.full_name)}</option>`).join('')}</select><button class="btn small" data-act="lead" data-gid="${g.id}">Make leader</button></div></div>`; }).join('')}</div>`;
    const open = st.settings.pitch_window_open === 'true';
    return `<section class="section" style="margin-top:6px"><h2>${ico('seal')} Admin office</h2>
      <div class="card" style="margin-top:12px"><h3>The Note</h3><label for="noteText">Text shown on the Home page</label><textarea id="noteText">${esc(st.settings.note_text || '')}</textarea>
        <label for="noteSigned">Signed</label><input type="text" id="noteSigned" value="${esc(st.settings.note_signed || '')}"><div class="row"><button class="btn" data-act="savenote">Save the Note</button></div></div>
      <div class="card" style="margin-top:14px"><h3>Youth pitch day</h3><p class="lead" style="margin:4px 0 8px">The pitch window is <b>${open ? 'OPEN' : 'closed'}</b>. While it is open, anyone signed in can share a pitch.</p>
        <button class="btn ${open ? 'alt' : ''}" data-act="togglepitch">${open ? 'Close the window' : 'Open the window'}</button></div>
      <div class="card" style="margin-top:14px"><h3>Backup</h3><p class="lead" style="margin:4px 0 8px">Download a copy of the people list and the main content. Keep it safe. Do this once a month.</p>
        <div class="row" style="margin:0"><button class="btn alt" data-act="bkcsv">People list (spreadsheet)</button><button class="btn alt" data-act="bkjson">Everything (backup file)</button></div></div>
      ${leadersCard}
      <div class="card" style="margin-top:14px"><h3>People</h3><p class="lead" style="margin:4px 0 8px">Search a person. Make a code so they can claim their profile, add their picture, or give them a role.</p>
        <input type="search" id="pSearch" placeholder="Search by name or place"><div id="pList"></div></div>
      ${(rp.data || []).length ? `<div class="card" style="margin-top:14px"><h3>Reports</h3>${rp.data.map((r) => `<div class="admin-row"><div><b>${esc(r.target_type)}</b><small>${esc(r.reason || '')} · ${fmtDate(r.created_at)}</small></div><div class="row" style="margin:0"><button class="btn small" data-act="hide" data-id="${r.id}" data-type="${esc(r.target_type)}" data-target="${r.target_id}">Hide it</button><button class="btn alt small" data-act="dismiss" data-id="${r.id}">Dismiss</button></div></div>`).join('')}</div>` : ''}
      ${has('owner') ? `<div class="card" style="margin-top:14px"><h3>Suggestions</h3>${(sg.data || []).map((s) => `<div class="admin-row"><div><b>${esc(s.body)}</b><small>${esc(nameOf(s.author_id))} · ${fmtDate(s.created_at)} · ${esc(s.status)}</small></div><button class="btn alt small" data-act="sugdone" data-id="${s.id}">Done</button></div>`).join('') || '<p class="empty">No suggestions yet.</p>'}</div>` : ''}</section>`;
  }, bind() {
    const list = $('#pList'); if (!list) return;
    const draw = () => {
      const q = ($('#pSearch').value || '').toLowerCase().trim();
      let ps = st.people.filter((p) => p.category !== 'member' || p.user_id);
      ps = q ? ps.filter((p) => (p.full_name + ' ' + (p.title || '') + ' ' + (p.gago_area || '')).toLowerCase().includes(q)) : ps.filter((p) => p.needs_review || ['king', 'district_head'].includes(p.category));
      list.innerHTML = ps.sort(byRank).slice(0, 40).map((p) => `<div class="admin-row"><div><b>${esc(p.full_name)}</b><small>${esc(p.title || '')}${p.user_id ? ' · signed in' : ''}</small>${p.needs_review ? '<small class="flag">Please check this entry</small>' : ''}</div>
        <div class="row" style="margin:0"><button class="btn alt small" data-act="editp" data-id="${p.id}">Edit</button><button class="btn alt small" data-act="photoFor" data-id="${p.id}">Picture</button>${p.user_id ? `<button class="btn alt small" data-act="role" data-id="${p.user_id}" data-role="elder">Elder</button>${has('owner') ? `<button class="btn alt small" data-act="role" data-id="${p.user_id}" data-role="admin">Admin</button>` : ''}` : `<button class="btn small" data-act="code" data-id="${p.id}">Make code</button>`}${p.needs_review ? `<button class="btn alt small" data-act="checked" data-id="${p.id}">Checked</button>` : ''}</div></div>`).join('') || '<p class="empty">Nothing to show. Try a search.</p>';
    };
    draw(); $('#pSearch').oninput = draw; PAGES.admin.draw = draw;
  }, async onClick(act, el) {
    const id = el.dataset.id;
    if (act === 'savenote') { await setting('note_text', $('#noteText').value); await setting('note_signed', $('#noteSigned').value); toast('Note saved'); await refresh(); }
    else if (act === 'togglepitch') { await setting('pitch_window_open', st.settings.pitch_window_open === 'true' ? 'false' : 'true'); toast('Updated'); await refresh(); }
    else if (act === 'code') {
      const { data, error } = await sb.rpc('make_claim_code', { p_person: id }); if (error) return toast(error.message);
      const p = st.people.find((x) => x.id === id), msg = `Hello ${p.full_name}. To claim your profile on the Adanawo District Council website: open ${location.origin}, sign in with Google, and enter this code: ${data}`;
      openModal(`<h2>Code for ${esc(p.full_name)}</h2><div class="code">${esc(data)}</div><p>Send it to them by WhatsApp. It works once.</p><div class="row"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Send on WhatsApp</a><button class="btn alt" data-close="1">Close</button></div>`);
    } else if (act === 'checked') { const { error } = await sb.from('people').update({ needs_review: false }).eq('id', id); if (error) return toast(error.message); st.people.find((x) => x.id === id).needs_review = false; PAGES.admin.draw(); toast('Marked as checked'); }
    else if (act === 'photoFor') { const path = await choosePhoto(900); if (!path) return; const { error } = await sb.from('people').update({ photo_path: path }).eq('id', id); if (error) return toast(error.message); st.people.find((x) => x.id === id).photo_path = path; toast('Picture saved'); }
    else if (act === 'role') { const { error } = await sb.from('user_roles').upsert({ user_id: id, role: el.dataset.role }); toast(error ? error.message : 'Role given: ' + el.dataset.role); }
    else if (act === 'dismiss') { await sb.from('reports').update({ resolved: true }).eq('id', id); await render(true); }
    else if (act === 'hide') { const t = { post: 'posts', comment: 'comments', listing: 'market_listings' }[el.dataset.type];
      const { error } = await sb.from(t).update({ hidden: true }).eq('id', el.dataset.target); if (error) return toast(error.message);
      await sb.from('reports').update({ resolved: true }).eq('id', id); toast('Hidden'); await render(true); }
    else if (act === 'bkcsv' || act === 'bkjson') {
      const names = act === 'bkcsv' ? ['people', 'people_private'] : ['areas', 'villages', 'people', 'people_private', 'site_settings', 'history_entries', 'stories', 'story_rota', 'meetings', 'minutes', 'markets', 'posts'];
      const out = {}; for (const n of names) { const r = await sb.from(n).select('*'); if (r.error) return toast(n + ': ' + r.error.message); out[n] = r.data; }
      let blob, name; const day = new Date().toISOString().slice(0, 10);
      if (act === 'bkjson') { blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }); name = `adanawo-backup-${day}.json`; }
      else {
        const priv = Object.fromEntries(out.people_private.map((x) => [x.person_id, x.whatsapp])), cols = ['full_name', 'title', 'category', 'gago_area', 'appointed_on', 'office', 'whatsapp'];
        const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
        const rows = [cols.join(',')].concat(out.people.map((p) => cols.map((c) => q(c === 'whatsapp' ? priv[p.id] : p[c])).join(',')));
        blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv' }); name = `adanawo-people-${day}.csv`;
      }
      const u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Backup downloaded');
    }
    else if (act === 'lead') { const uid = $('#gl-' + el.dataset.gid).value; if (!uid) return toast('Choose a person first');
      const { error } = await sb.from('group_members').upsert({ group_id: el.dataset.gid, user_id: uid, role: 'admin', status: 'member' }); if (error) return toast(error.message); toast('Leader set'); await render(true); }
    else if (act === 'unlead') { const { error } = await sb.from('group_members').delete().eq('group_id', el.dataset.gid).eq('user_id', el.dataset.uid); if (error) return toast(error.message); await render(true); }
    else if (act === 'editp') { const p = st.people.find((x) => x.id === id);
      openModal(`<h2>Edit ${esc(p.full_name)}</h2><label for="epName">Name</label><input type="text" id="epName" value="${esc(p.full_name)}"><label for="epTitle">Title</label><input type="text" id="epTitle" value="${esc(p.title || '')}">
        <label for="epVillage">Village</label><select id="epVillage"><option value="">None</option>${st.villages.map((v) => `<option value="${v.id}"${v.id === p.village_id ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select>
        <label for="epArea">Place they rule (as written)</label><input type="text" id="epArea" value="${esc(p.gago_area || '')}"><label for="epDate">Date of appointment</label><input type="date" id="epDate" value="${esc(p.appointed_on || '')}">
        <div class="row"><button class="btn" data-act="epsave" data-id="${id}">Save</button><button class="btn alt" data-close="1">Cancel</button></div>`); }
    else if (act === 'epsave') { const vid = $('#epVillage').value || null, v = st.villages.find((x) => x.id === vid);
      const row = { full_name: $('#epName').value.trim(), title: $('#epTitle').value.trim() || null, village_id: vid, area_id: v ? v.area_id : null, gago_area: $('#epArea').value.trim() || null, appointed_on: $('#epDate').value || null };
      if (!row.full_name) return toast('The name cannot be empty'); const { error } = await sb.from('people').update(row).eq('id', id); if (error) return toast(error.message);
      closeModal(); toast('Saved'); await refresh(); }
    else if (act === 'sugdone') { await sb.from('suggestions').update({ status: 'done' }).eq('id', id); await render(true); }
  } };

  // ---------- router ----------
  let busy = 0, lastRoute = null;
  async function render(keepScroll) {
    const my = ++busy, y = window.scrollY;
    let cur = (location.hash.replace(/^#\//, '') || 'home').split('?')[0]; if (!PAGES[cur]) cur = 'home';
    const ORDER = ['home', 'leaders', 'places', 'history', 'alo', 'meetings', 'groups', 'youth', 'markets', 'about', 'me', 'admin'];
    const items = ORDER.filter((k) => PAGES[k] && PAGES[k].label && (!PAGES[k].when || PAGES[k].when())).map((k) => [k, PAGES[k].label]);
    $('#nav').innerHTML = items.map(([k, l]) => `<a href="#/${k}" class="${k === cur ? 'on' : ''}">${esc(l)}</a>`).join('');
    renderAuth();
    const v = $('#view');
    if (st.error) { v.innerHTML = `<div class="err">The page could not load its information. Please check your internet and try again.<br><small>${esc(st.error)}</small></div>`; return; }
    let html; try { html = await PAGES[cur].view(); } catch (e) { html = `<div class="err">Something went wrong loading this page.<br><small>${esc(e.message || e)}</small></div>`; }
    if (my !== busy) return;
    v.innerHTML = html; if (PAGES[cur].bind) PAGES[cur].bind();
    window.scrollTo(0, keepScroll === true && lastRoute === cur ? y : 0); lastRoute = cur;
  }
  APP.render = render;
  // clicks that belong to the page being shown
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    let cur = (location.hash.replace(/^#\//, '') || 'home').split('?')[0]; if (!PAGES[cur]) cur = 'home';
    const pg = PAGES[cur]; if (!pg || !pg.onClick) return;
    try { const again = await pg.onClick(el.dataset.act, el); if (again === true) await render(true); } catch (err) { toast(err.message || String(err)); }
  });
  window.addEventListener('hashchange', () => { closeModal(); render(); });

  APP.start = function () {
    sb.auth.onAuthStateChange((_e, session) => { const u = session ? session.user : null; if ((u && u.id) !== (st.user && st.user.id)) { st.user = u; setTimeout(refresh, 0); } });
    (async () => {
      const { data } = await sb.auth.getSession(); st.user = data.session ? data.session.user : null;
      if (location.search.includes('code=')) history.replaceState({}, '', location.pathname + location.hash);
      await refresh();
    })();
  };
  PAGES.home.label = 'Home'; PAGES.leaders.label = 'Leaders'; PAGES.places.label = 'Places'; PAGES.about.label = 'About';
  PAGES.admin.label = 'Admin office'; PAGES.admin.when = isAdmin;
  window.addEventListener('load', () => APP.start());
})();
