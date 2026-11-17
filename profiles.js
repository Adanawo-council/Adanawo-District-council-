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
    const badge = (m.crown ? `<span class="crownTop">${ico('crown')}</span>` : '') + (m.icon ? `<span class="badge">${ico(m.icon)}</span>` : '');
    return `<section class="section" style="margin-top:6px"><a href="javascript:history.back()" class="lnk" style="padding:0;text-decoration:none">← Back</a>
      <div class="card profile mark-${esc(p.mark)}" style="margin-top:10px"><div class="photo">${img ? `<img src="${esc(img)}" alt="${esc(p.full_name)}">` : ico('person', 'p')}${badge}</div>
        <h1>${esc(p.full_name)}</h1><p class="pt">${esc(p.title || '')}</p>${p.office ? `<p class="off" style="color:var(--blue);font-weight:500;margin:2px 0">${esc(p.office)}</p>` : ''}
        ${p.is_late ? '<p class="late">Late</p>' : ''}${where.length ? `<p class="pt">${esc(where.join(' · '))}</p>` : ''}
        ${p.public_whatsapp ? `<div class="row" style="justify-content:center"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${digits(p.public_whatsapp)}">Message on WhatsApp</a></div>` : ''}
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}</div>${posts}</section>`;
  } };
})();
