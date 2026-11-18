/* Adanawo District Council: profile pages (tap a person to open) */
(function () {
  const A = window.APP, { S, sb, st, esc, ico, PAGES, photoUrl, needSignIn } = A;
  const digits = (n) => { let d = String(n || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '234' + d.slice(1); return d; };
  PAGES.profile = { async view() {
    const p = st.people.find((x) => x.id === A.arg);
    if (!p) return st.user ? '<p class="empty">This profile could not be found.</p>' : needSignIn('Please sign in to see this profile.');
    const m = S.marks[p.mark] || S.marks.none, img = photoUrl(p.photo_path);
    const village = st.villages.find((v) => v.id === p.village_id), area = st.areas.find((x) => x.id === p.area_id);
    const where = [p.gago_area && p.category === 'gago' ? 'Gago of ' + p.gago_area : null, village ? village.name : null, area ? area.name + ' area' : null].filter(Boolean);
    let posts = '';
    if (p.user_id) {
      const r = await sb.from('posts').select('*').eq('author_id', p.user_id).eq('hidden', false).order('created_at', { ascending: false }).limit(20);
      const list = r.data || [];
      posts = `<section class="section"><h2>${ico('calabash')} Posts</h2>${list.length ? await A.postBlocks(list) : '<p class="empty">No public posts yet.</p>'}${!st.user ? '<p class="lead">Sign in to see more.</p>' : ''}</section>`;
    }
    const ct = (await sb.from('people_contact').select('whatsapp').eq('person_id', p.id).maybeSingle()).data;
    const badge = (m.crown ? `<span class="crownTop">${ico('crown')}</span>` : '') + (m.icon ? `<span class="badge">${ico(m.icon)}</span>` : '');
    return `<section class="section" style="margin-top:6px"><a href="javascript:history.back()" class="lnk" style="padding:0;text-decoration:none">← Back</a>
      <div class="card profile mark-${esc(p.mark)}" style="margin-top:10px"><div class="photo">${img ? `<img src="${esc(img)}" alt="${esc(p.full_name)}">` : ico('person', 'p')}${badge}</div>
        <h1>${esc(p.full_name)}</h1><p class="pt">${esc(p.title || '')}</p>${p.office ? `<p class="off" style="color:var(--blue);font-weight:500;margin:2px 0">${esc(p.office)}</p>` : ''}
        ${p.is_late ? '<p class="late">Late</p>' : ''}${where.length ? `<p class="pt">${esc(where.join(' · '))}</p>` : ''}
        ${ct ? `<div class="row" style="justify-content:center"><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/${digits(ct.whatsapp)}">${ico('wa')} Message on WhatsApp</a></div>` : ''}
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}</div>${posts}</section>`;
  } };

  // ---------- People: browse everyone (signed-in only) ----------
  const P = { q: '', f: 'all', n: 60 };
  const LEADER = ['king', 'district_head', 'political', 'council_officer'];
  const FILTERS = [['all', 'Everyone'], ['leaders', 'Leaders'], ['gago', 'Gagos'], ['member', 'Members and youths']];
  function listHtml() {
    const q = P.q.toLowerCase().trim(), vname = (id) => (st.villages.find((v) => v.id === id) || {}).name || '';
    let l = st.people.filter((p) => !p.is_past || P.f === 'all' || P.f === 'leaders');
    if (P.f === 'leaders') l = l.filter((p) => LEADER.includes(p.category));
    else if (P.f === 'gago') l = l.filter((p) => p.category === 'gago');
    else if (P.f === 'member') l = l.filter((p) => p.category === 'member');
    if (q) l = l.filter((p) => (p.full_name + ' ' + (p.title || '') + ' ' + vname(p.village_id) + ' ' + (p.gago_area || '')).toLowerCase().includes(q));
    const order = { king: 0, district_head: 1, political: 2, council_officer: 3, gago: 4, member: 5 };
    l = l.slice().sort((a, b) => (order[a.category] - order[b.category]) || (a.rank_order - b.rank_order) || a.full_name.localeCompare(b.full_name));
    const shown = l.slice(0, P.n);
    return `<p class="lead" style="margin:6px 0 8px">${l.length} ${l.length === 1 ? 'person' : 'people'}</p>` + (shown.map((p) => {
      const img = photoUrl(p.photo_path), sub = p.title || [vname(p.village_id), p.category === 'member' ? 'Member' : ''].filter(Boolean).join(' · ') || 'Member';
      return `<a class="gago plink" href="#/profile/${p.id}">${img ? `<img class="gp" src="${esc(img)}" alt="" loading="lazy">` : ico('person')}<div><div class="gn">${esc(p.full_name)}</div><div class="gt">${esc(sub)}</div></div></a>`;
    }).join('') || '<p class="empty">Nobody matches your search.</p>') + (l.length > P.n ? '<div class="row" style="justify-content:center"><button class="btn alt" data-act="pmore">Show more</button></div>' : '');
  }
  PAGES.people = { label: 'People', when: () => !!st.user, view() {
    if (!st.user) return needSignIn('Please sign in to browse the people of Adanawo.');
    return `<section class="section" style="margin-top:6px"><h2>${ico('person')} People of Adanawo</h2><p class="lead">Tap anyone to see their page. This list is only for people who are signed in.</p>
      <input type="search" id="pq" placeholder="Search by name or village" value="${esc(P.q)}">
      <div class="gtabs" style="margin-bottom:6px">${FILTERS.map(([k, t]) => `<button data-act="pf" data-f="${k}" class="${P.f === k ? 'on' : ''}">${esc(t)}</button>`).join('')}</div>
      <div id="pList2" class="card" style="padding:6px 14px">${listHtml()}</div></section>`;
  }, bind() {
    const i = document.getElementById('pq'); if (!i) return;
    i.oninput = () => { P.q = i.value; P.n = 60; document.getElementById('pList2').innerHTML = listHtml(); };
  }, onClick(act, el) {
    if (act === 'pf') { P.f = el.dataset.f; P.n = 60; return true; }
    if (act === 'pmore') { P.n += 60; return true; }
  } };
})();
