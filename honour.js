/* Adanawo District Council: Hall of Honour.
   Everyone can see it. Administrators add honours from the Admin office. */
(function () {
  const A = window.APP, { S, sb, st, $, esc, ico, isAdmin, fmtDate, PAGES, toast, openModal, closeModal, photoUrl, choosePhoto } = A;
  const FRAMES = S.honourFrames;
  const H = { draft: null };
  const byDate = (a, b) => (b.awarded_on || '').localeCompare(a.awarded_on || '') || (b.created_at || '').localeCompare(a.created_at || '');

  function frameHtml(h) {
    const per = st.people.find((p) => p.id === h.person_id);
    const img = photoUrl(h.photo_path) || (per && photoUrl(per.photo_path));
    const name = per && (per.category !== 'member' || st.user) ? `<a href="#/profile/${per.id}">${esc(h.recipient_name)}</a>` : esc(h.recipient_name);
    return `<figure class="frame f-${esc(h.frame)}"><div class="mat">${img ? `<img src="${esc(img)}" alt="${esc(h.recipient_name)}" loading="lazy">` : `<div class="noimg">${ico('seal')}</div>`}</div>
      <figcaption class="plate"><span class="aw">${esc(h.award)}</span><b>${name}</b>
      <small>${[h.awarded_by ? 'Presented by ' + esc(h.awarded_by) : '', h.awarded_on ? esc(fmtDate(h.awarded_on)) : ''].filter(Boolean).join(' · ')}</small>
      ${h.note ? `<p>${esc(h.note)}</p>` : ''}</figcaption></figure>`;
  }

  PAGES.honour = { label: 'Hall of Honour', async view() {
    const { data, error } = await sb.from('honours').select('*'); if (error) throw error;
    const list = (data || []).sort(byDate), groups = {};
    list.forEach((h) => { const y = h.awarded_on ? h.awarded_on.slice(0, 4) : 'Earlier'; (groups[y] = groups[y] || []).push(h); });
    const years = Object.keys(groups).sort((a, b) => (a === 'Earlier') - (b === 'Earlier') || b.localeCompare(a));
    return `<section class="alo-hero hall"><div class="cloth" style="position:absolute;left:0;right:0;top:0"></div>${ico('crown', 'cal')}<h1>Hall of Honour</h1><p>Adanawo District Council</p></section>
      <p class="lead" style="margin-top:14px">We honour the sons and daughters of Adanawo, and all who have served it well. Each honour is kept here for everyone to see.</p>
      ${years.map((y) => `<section class="section"><h2>${y}</h2><div class="wall">${groups[y].map(frameHtml).join('')}</div></section>`).join('') || '<p class="empty">The first honours will be hung here soon.</p>'}`;
  } };

  // ---------- Admin office card ----------
  A.adminHonour = async function () {
    const { data } = await sb.from('honours').select('*'); const list = (data || []).sort(byDate);
    return `<div class="card" style="margin-top:14px"><h3>Hall of Honour</h3>
      <details class="howto"><summary><b>How this works (tap to read)</b></summary>
        <ol><li>Tap <b>Add an honour</b>.</li><li>Choose the person from the list. If they are not on the site, choose "Someone else" and type the name.</li><li>Type the award, for example "Outstanding Service Award".</li><li>Add the date, and who presented it. Add a short note if you wish.</li><li>Add the picture. A photo of the framed award, or of the person receiving it, works best.</li><li>Choose a frame: Gold, Green and gold, Carved wood, or In memoriam (for someone who has passed).</li><li>Tap Save. It appears at once in the <b>Hall of Honour</b> page, which everyone can see, signed in or not. It is placed under its year.</li></ol>
        <p>To change an honour, tap Edit. To take one down, tap Remove.</p></details>
      <div class="row"><button class="btn" data-act="hnadd">Add an honour</button></div>
      ${list.map((h) => `<div class="admin-row"><div><b>${esc(h.award)}</b><small>${esc(h.recipient_name)}${h.awarded_on ? ' · ' + esc(fmtDate(h.awarded_on)) : ''}</small></div>
        <div class="row" style="margin:0"><button class="btn alt small" data-act="hnedit" data-id="${h.id}">Edit</button><button class="btn alt small" data-act="hndel" data-id="${h.id}">Remove</button></div></div>`).join('') || '<p class="empty">No honours yet.</p>'}</div>`;
  };

  function form(h) {
    const people = st.people.filter((p) => p.category !== 'member').sort((a, b) => a.full_name.localeCompare(b.full_name));
    H.draft = { id: h.id || null, photo_path: h.photo_path || null };
    openModal(`<h2>${h.id ? 'Edit the honour' : 'Add an honour'}</h2>
      <label for="hnWho">Who is being honoured</label><select id="hnWho"><option value="">Someone else (type the name below)</option>${people.map((p) => `<option value="${p.id}"${p.id === h.person_id ? ' selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select>
      <label for="hnName">Name (needed only for "someone else")</label><input type="text" id="hnName" value="${esc(h.person_id ? '' : h.recipient_name || '')}">
      <label for="hnAward">The award</label><input type="text" id="hnAward" value="${esc(h.award || '')}" placeholder="e.g. Outstanding Service Award">
      <label for="hnDate">Date</label><input type="date" id="hnDate" value="${esc(h.awarded_on || '')}">
      <label for="hnBy">Presented by</label><input type="text" id="hnBy" value="${esc(h.awarded_by || '')}" placeholder="e.g. HRH Chief Hon. Idris Ray Akus">
      <label for="hnNote">A short note (optional)</label><textarea id="hnNote">${esc(h.note || '')}</textarea>
      <label for="hnFrame">Frame</label><select id="hnFrame">${Object.entries(FRAMES).map(([k, t]) => `<option value="${k}"${k === (h.frame || 'gold') ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
      <div class="row"><button class="btn alt small" data-act="hnphoto" id="hnph">${H.draft.photo_path ? 'Picture added. Change it' : 'Add the picture'}</button></div>
      <small>If you add no picture, the person's own profile picture is used.</small>
      <div class="row"><button class="btn" data-act="hnsave">Save</button><button class="btn alt" data-close="1">Cancel</button></div>`);
  }

  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act^="hn"]'); if (!el) return; const act = el.dataset.act;
    try {
      if (act === 'hnadd') return form({});
      if (act === 'hnedit') { const r = await sb.from('honours').select('*').eq('id', el.dataset.id).single(); return form(r.data); }
      if (act === 'hnphoto') { const p = await choosePhoto(1100); if (p) { H.draft.photo_path = p; $('#hnph').textContent = 'Picture added. Change it'; } return; }
      if (act === 'hndel') { if (!confirm('Take this honour down?')) return; const r = await sb.from('honours').delete().eq('id', el.dataset.id); if (r.error) return toast(r.error.message); toast('Removed'); return A.render(true); }
      if (act === 'hnsave') {
        const who = $('#hnWho').value || null, per = st.people.find((p) => p.id === who), name = per ? per.full_name : $('#hnName').value.trim(), award = $('#hnAward').value.trim();
        if (!name) return toast('Choose the person, or type the name'); if (!award) return toast('Please type the award');
        const row = { person_id: who, recipient_name: name, award, awarded_on: $('#hnDate').value || null, awarded_by: $('#hnBy').value.trim() || null, note: $('#hnNote').value.trim() || null, frame: $('#hnFrame').value, photo_path: H.draft.photo_path };
        const r = H.draft.id ? await sb.from('honours').update(row).eq('id', H.draft.id) : await sb.from('honours').insert(row);
        if (r.error) return toast(r.error.message); closeModal(); toast('Saved. It is now in the Hall of Honour.'); return A.render(true);
      }
    } catch (err) { toast(err.message || String(err)); }
  });
})();
