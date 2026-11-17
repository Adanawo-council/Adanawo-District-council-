/* Adanawo District Council: the other pages
   My profile, History, Àlo (Moonlight Stories), Meetings, Youth Day, Markets. */
(function () {
  const A = window.APP, { S, sb, st, $, esc, ico, has, isAdmin, fmtDate, byRank, PAGES, toast, openModal, closeModal, photoUrl, nameOf, choosePhoto, needSignIn, refresh } = A;
  const opt = (v, t, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(t)}</option>`;
  const digits = (n) => { let d = String(n || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '234' + d.slice(1); return d; };
  const wa = (num, msg) => `https://wa.me/${digits(num)}${msg ? '?text=' + encodeURIComponent(msg) : ''}`;
  const peopleOptions = (sel) => st.people.filter((p) => p.category !== 'member').sort((a, b) => a.full_name.localeCompare(b.full_name)).map((p) => opt(p.id, `${p.full_name}${p.title ? ' (' + p.title + ')' : ''}`, p.id === sel)).join('');
  const friendly = (e) => (/row-level security/i.test(e.message) ? 'That is not allowed right now. Please check you are signed in, and that this section is open to you.' : e.message);

  // ================= MY PROFILE =================
  PAGES.me = { label: 'My profile', when: () => !!st.user, async view() {
    if (!st.user) return needSignIn();
    const p = st.me; if (!p) return '<p class="empty">Your profile is being prepared. Please refresh in a moment.</p>';
    const pr = await sb.from('people_private').select('*').eq('person_id', p.id).maybeSingle();
    const img = photoUrl(p.photo_path), isLeader = p.category !== 'member';
    return `<section class="section" style="margin-top:6px"><h2>${ico('person')} My profile</h2>
      <div class="card" style="margin-top:12px"><div class="person" style="padding:0 0 10px"><div class="photo">${img ? `<img src="${esc(img)}" alt="">` : ico('person', 'p')}</div>
        <button class="btn alt small" data-act="mephoto">${img ? 'Change picture' : 'Add my picture'}</button></div>
        <p class="lead" style="margin:0">${esc(p.title || 'Member')}</p>
        <label for="meName">My name</label><input type="text" id="meName" value="${esc(p.full_name)}">
        <label for="meVillage">My village</label><select id="meVillage"><option value="">Choose</option>${st.villages.map((v) => opt(v.id, v.name, v.id === p.village_id)).join('')}</select>
        <label for="meWa">My WhatsApp number${isLeader ? ' (please fill this in)' : ''}</label><input type="text" id="meWa" inputmode="tel" value="${esc((pr.data && pr.data.whatsapp) || '')}" placeholder="08012345678">
        <small>Only the palace administrators can see this number.</small>
        ${isLeader ? `<label style="font-weight:500"><input type="checkbox" id="meShowWa" ${p.public_whatsapp ? 'checked' : ''}> Show a WhatsApp button on my public profile</label>` : ''}
        <label for="meBio">A few words about me</label><textarea id="meBio">${esc(p.bio || '')}</textarea>
        <div class="row"><button class="btn" data-act="mesave">Save</button></div></div></section>`;
  }, async onClick(act) {
    const p = st.me;
    if (act === 'mephoto') { const path = await choosePhoto(900); if (!path) return; const { error } = await sb.from('people').update({ photo_path: path }).eq('id', p.id); if (error) return toast(friendly(error)); toast('Picture saved'); await refresh(); }
    if (act === 'mesave') {
      const vid = $('#meVillage').value || null, v = st.villages.find((x) => x.id === vid);
      const r1 = await sb.from('people').update({ full_name: $('#meName').value.trim() || p.full_name, bio: $('#meBio').value.trim() || null, village_id: vid, area_id: v ? v.area_id : null, ...(p.category !== 'member' ? { public_whatsapp: ($('#meShowWa') && $('#meShowWa').checked && $('#meWa').value.trim()) ? $('#meWa').value.trim() : null } : {}) }).eq('id', p.id);
      const r2 = await sb.from('people_private').upsert({ person_id: p.id, whatsapp: $('#meWa').value.trim() || null });
      const e = r1.error || r2.error; if (e) return toast(friendly(e)); toast('Saved'); await refresh();
    }
  } };

  // ================= HISTORY =================
  const H = { draft: null };
  PAGES.history = { label: 'History', async view() {
    const { data } = await sb.from('history_entries').select('*').order('sort_order'); const canEdit = has('owner', 'admin', 'elder');
    return `<section class="section" style="margin-top:6px"><h2>${ico('palm')} History of Adanawo</h2><p class="lead">Written and kept by our elders.</p>
      ${canEdit ? '<div class="row" style="margin:0 0 14px"><button class="btn" data-act="hedit">Add a section</button></div>' : ''}
      ${(data || []).map((h) => `<article class="post"><h3>${esc(h.title)}</h3><p>${esc(h.body)}</p>
        ${[h.photo1_path, h.photo2_path].filter(Boolean).map((x) => `<img class="pic" src="${esc(photoUrl(x))}" alt="" loading="lazy">`).join('')}
        ${canEdit ? `<div class="acts"><button data-act="hedit" data-id="${h.id}">Edit</button><button data-act="hdel" data-id="${h.id}">Delete</button></div>` : ''}</article>`).join('') || '<p class="empty">The history will appear here.</p>'}</section>`;
  }, async onClick(act, el) {
    if (act === 'hedit') {
      let h = { title: '', body: '' }; if (el.dataset.id) { const r = await sb.from('history_entries').select('*').eq('id', el.dataset.id).single(); h = r.data; }
      H.draft = { id: h.id, photo1_path: h.photo1_path || null, photo2_path: h.photo2_path || null };
      openModal(`<h2>${h.id ? 'Edit' : 'New'} section</h2><label for="hTitle">Title</label><input type="text" id="hTitle" value="${esc(h.title)}">
        <label for="hBody">Text</label><textarea id="hBody" style="min-height:200px">${esc(h.body)}</textarea>
        <div class="row"><button class="btn alt small" data-act="hphoto" data-n="1" id="hp1">${H.draft.photo1_path ? 'Picture 1 added. Change' : 'Add picture 1'}</button><button class="btn alt small" data-act="hphoto" data-n="2" id="hp2">${H.draft.photo2_path ? 'Picture 2 added. Change' : 'Add picture 2'}</button></div>
        <div class="row"><button class="btn" data-act="hsave">Save</button><button class="btn alt" data-close="1">Cancel</button></div>`);
    } else if (act === 'hphoto') { const path = await choosePhoto(1280); if (!path) return; const n = el.dataset.n; H.draft['photo' + n + '_path'] = path; $('#hp' + n).textContent = `Picture ${n} added. Change`; }
    else if (act === 'hsave') {
      const t = $('#hTitle').value.trim(), b = $('#hBody').value.trim(); if (!t || !b) return toast('Please fill in the title and the text');
      const row = { title: t, body: b, photo1_path: H.draft.photo1_path, photo2_path: H.draft.photo2_path };
      const r = H.draft.id ? await sb.from('history_entries').update(row).eq('id', H.draft.id) : await sb.from('history_entries').insert(Object.assign(row, { author_id: st.user.id, sort_order: 100 }));
      if (r.error) return toast(friendly(r.error)); closeModal(); toast('Saved'); return true;
    } else if (act === 'hdel') { if (!confirm('Delete this section?')) return; const r = await sb.from('history_entries').delete().eq('id', el.dataset.id); if (r.error) return toast(friendly(r.error)); return true; }
  } };

  // ================= ÀLO (MOONLIGHT STORIES) =================
  const L = { photo: null };
  const STATUS = { invited: 'Invited', confirmed: 'Confirmed', unable: 'Unable this time', told: 'Told' };
  PAGES.alo = { label: 'Àlo', async view() {
    const [ro, sr] = await Promise.all([sb.from('story_rota').select('*').order('planned_date'), sb.from('stories').select('*').order('created_at', { ascending: false })]);
    const rota = (ro.data || []).filter((r) => r.status !== 'told'), stories = sr.data || [];
    const editor = has('owner', 'admin', 'elder'), admin = isAdmin();
    const pid = (id) => st.people.find((p) => p.id === id);
    const rotaHtml = rota.map((r) => { const p = pid(r.storyteller_id), mine = st.me && r.storyteller_id === st.me.id;
      return `<div class="admin-row"><div><b>${r.week_no ? 'Week ' + r.week_no + ' · ' : ''}${esc(p ? p.full_name : 'To be announced')}</b><small>${esc(r.planned_date ? fmtDate(r.planned_date) : 'Date to be announced')}${r.topic ? ' · ' + esc(r.topic) : ''}</small></div>
        <div class="row" style="margin:0"><span class="stat s-${esc(r.status)}">${STATUS[r.status]}</span>
        ${mine && r.status !== 'confirmed' ? `<button class="btn small" data-act="rsvp" data-id="${r.id}" data-s="confirmed">I will come</button>` : ''}${mine && r.status === 'invited' ? `<button class="btn alt small" data-act="rsvp" data-id="${r.id}" data-s="unable">I am unable</button>` : ''}
        ${admin ? `<button class="btn alt small" data-act="rtold" data-id="${r.id}">Told</button><button class="btn alt small" data-act="rdel" data-id="${r.id}">Remove</button>` : ''}</div></div>`; }).join('');
    return `<section class="alo-hero"><div class="cloth" style="position:absolute;left:0;right:0;top:0"></div>${ico('calabash', 'cal')}<h1>Àlo</h1><p>Moonlight Stories</p></section>
      <p class="lead" style="margin-top:14px">Every week one of our leaders or elders tells the young ones a story of our history and our people.</p>
      <section class="section"><h2>This season's storytellers</h2>${rotaHtml || '<p class="empty">The next storyteller will be announced soon.</p>'}
      ${admin ? `<details class="card" style="margin-top:12px"><summary><b>Invite a storyteller</b></summary><label for="rWho">Who</label><select id="rWho"><option value="">Choose</option>${peopleOptions()}</select>
        <label for="rDate">Date</label><input type="date" id="rDate"><label for="rTopic">Topic (optional)</label><input type="text" id="rTopic">
        <div class="row"><button class="btn" data-act="invite">Invite and tell everyone</button></div></details>` : ''}</section>
      <section class="section"><h2>${ico('palm')} The stories</h2>
      <div class="note" style="margin-top:0"><p style="font-size:16px">To our respected elders: if you would rather not write, you are most welcome to simply tell your story to someone you trust. They will type it in for you, and it will be kept just as you told it.</p></div>
      ${editor ? `<details class="card" style="margin:14px 0"><summary><b>Add a story</b></summary><label for="sTitle">Title</label><input type="text" id="sTitle"><label for="sWho">Told by</label><select id="sWho"><option value="">Choose</option>${peopleOptions()}</select>
        <label for="sBody">The story</label><textarea id="sBody" style="min-height:180px"></textarea>
        <label><input type="checkbox" id="sProxy"> Someone typed this for the elder</label>
        <div class="row"><button class="btn alt small" data-act="sphoto" id="sph">Add a picture</button><button class="btn" data-act="sstory">Publish story</button></div></details>` : ''}
      ${stories.map((s) => { const p = pid(s.teller_id), img = photoUrl(s.photo_path);
        return `<article class="post"><h3>${esc(s.title)}</h3>${p ? `<small>Told by ${esc(p.full_name)}</small>` : ''}${img ? `<img class="pic" src="${esc(img)}" alt="" loading="lazy">` : ''}<p>${esc(s.body)}</p>${editor ? `<div class="acts"><button data-act="sdel" data-id="${s.id}">Delete</button></div>` : ''}</article>`; }).join('') || '<p class="empty">The first story is coming soon.</p>'}</section>`;
  }, async onClick(act, el) {
    const id = el.dataset.id;
    if (act === 'rsvp') { const r = await sb.from('story_rota').update({ status: el.dataset.s }).eq('id', id); if (r.error) return toast(friendly(r.error)); toast(el.dataset.s === 'confirmed' ? 'Thank you. We look forward to your story.' : 'Thank you for letting us know.'); return true; }
    if (act === 'rtold' || act === 'rdel') { const r = act === 'rdel' ? await sb.from('story_rota').delete().eq('id', id) : await sb.from('story_rota').update({ status: 'told' }).eq('id', id); if (r.error) return toast(friendly(r.error)); return true; }
    if (act === 'sphoto') { const p = await choosePhoto(1280); if (p) { L.photo = p; $('#sph').textContent = 'Picture added'; } return; }
    if (act === 'sdel') { if (!confirm('Delete this story?')) return; const r = await sb.from('stories').delete().eq('id', id); if (r.error) return toast(friendly(r.error)); return true; }
    if (act === 'sstory') {
      const t = $('#sTitle').value.trim(), b = $('#sBody').value.trim(); if (!t || !b) return toast('Please fill in the title and the story');
      const who = $('#sWho').value || null, p = st.people.find((x) => x.id === who);
      const body = b + ($('#sProxy').checked ? `\n\n(Told by ${p ? p.full_name : 'the elder'} and typed on his behalf.)` : '');
      const r = await sb.from('stories').insert({ title: t, body, teller_id: who, photo_path: L.photo, published: true, created_by: st.user.id }); if (r.error) return toast(friendly(r.error));
      L.photo = null; toast('Story published'); return true;
    }
    if (act === 'invite') {
      const who = $('#rWho').value; if (!who) return toast('Choose who to invite');
      const p = st.people.find((x) => x.id === who), date = $('#rDate').value || null, topic = $('#rTopic').value.trim() || null;
      const { data: last } = await sb.from('story_rota').select('week_no').order('week_no', { ascending: false }).limit(1);
      const week = ((last && last[0] && last[0].week_no) || 0) + 1;
      const r = await sb.from('story_rota').insert({ week_no: week, storyteller_id: who, planned_date: date, topic, status: 'invited' }); if (r.error) return toast(friendly(r.error));
      const when = date ? ` on ${fmtDate(date)}` : '';
      await A.post({ kind: 'announcement', title: 'Àlo invitation', body: `The palace has invited ${p.full_name} to tell the Moonlight Story${when}.${topic ? ' Topic: ' + topic + '.' : ''}` });
      const pr = await sb.from('people_private').select('whatsapp').eq('person_id', who).maybeSingle();
      const msg = `Good day, ${p.full_name}. With respect, the Adanawo District Council would be honoured if you would tell the Moonlight Story (Àlo)${when}. Please let us know if you can come. If you would rather not write, you may simply tell your story to someone and it will be typed for you. Thank you.`;
      openModal(`<h2>Invitation sent</h2><p>Everyone can now see on the Home page that you invited <b>${esc(p.full_name)}</b>. You can also send the invitation on WhatsApp.</p>
        <div class="row"><a class="btn" target="_blank" rel="noopener" href="${wa(pr.data && pr.data.whatsapp, msg)}">Send on WhatsApp</a><button class="btn alt" data-close="1">Close</button></div>`);
      return true;
    }
  } };

  // ================= MEETINGS =================
  const M = {};
  const KIND = { google_meet: ['Google Meet', 'Join by video link'], whatsapp: ['WhatsApp', 'Join by WhatsApp'], physical: ['In person', 'Meet at the venue'] };
  PAGES.meetings = { label: 'Meetings', async view() {
    const [mt, mn] = await Promise.all([sb.from('meetings').select('*').order('starts_at', { ascending: false }), sb.from('minutes').select('*').order('held_on', { ascending: false })]);
    const meetings = mt.data || [], minutes = mn.data || [];
    const ph = meetings.length ? ((await sb.from('meeting_photos').select('*').in('meeting_id', meetings.map((m) => m.id))).data || []) : [];
    const room = has('owner', 'admin', 'gago', 'adanawo'), admin = isAdmin(), now = Date.now();
    const card = (m) => { const [lbl] = KIND[m.kind]; const pics = ph.filter((x) => x.meeting_id === m.id);
      const join = m.join_url ? `<a class="btn small" href="${esc(m.join_url)}" target="_blank" rel="noopener">${m.is_live ? 'Join now' : 'Open link'}</a>` : '';
      return `<article class="post meet ${m.is_live ? 'live' : ''}"><div class="row" style="margin:0 0 4px"><span class="tag">${esc(lbl)}</span>${m.is_live ? '<span class="stat s-confirmed">Live now</span>' : ''}${m.visibility === 'gagos' ? '<span class="stat s-invited">Gagos only</span>' : ''}</div>
        <h3>${esc(m.title)}</h3><small>${m.starts_at ? fmtDate(m.starts_at, true) : 'Time to be announced'}${m.venue ? ' · ' + esc(m.venue) : ''}</small>${join ? `<div class="row">${join}</div>` : ''}
        ${pics.length ? `<div class="gallery">${pics.map((x) => `<img src="${esc(photoUrl(x.photo_path))}" alt="" loading="lazy">`).join('')}</div>` : ''}
        ${admin ? `<div class="acts"><button data-act="mlive" data-id="${m.id}" data-on="${m.is_live ? 1 : 0}">${m.is_live ? 'End live' : 'Go live'}</button><button data-act="mphoto" data-id="${m.id}">Add picture</button><button data-act="mdel" data-id="${m.id}">Delete</button></div>` : ''}</article>`; };
    const mins = (l) => l.map((x) => `<details class="post"><summary><b>${esc(x.title)}</b> <small>${x.held_on ? fmtDate(x.held_on) : ''}${x.visibility === 'gagos' ? ' · Gagos only' : ''}</small></summary><p>${esc(x.body)}</p></details>`).join('') || '<p class="empty">No minutes yet.</p>';
    const open = meetings.filter((m) => m.visibility === 'everyone'), priv = meetings.filter((m) => m.visibility === 'gagos');
    const upcoming = (l) => l.filter((m) => m.is_live || (m.starts_at && new Date(m.starts_at) > now - 3 * 36e5) || !m.starts_at);
    const past = (l) => l.filter((m) => !upcoming(l).includes(m));
    return `<section class="section" style="margin-top:6px"><h2>${ico('seal')} Meetings</h2>
      <div class="tiles">${Object.values(KIND).map(([a, b]) => `<div class="tile"><b>${esc(a)}</b><small>${esc(b)}</small></div>`).join('')}</div>
      ${admin ? `<details class="card" style="margin:14px 0"><summary><b>Add a meeting</b></summary>
        <label for="mKind">Kind</label><select id="mKind"><option value="google_meet">Google Meet</option><option value="whatsapp">WhatsApp</option><option value="physical">In person</option></select>
        <label for="mTitle">Title</label><input type="text" id="mTitle"><label for="mUrl">Link (Google Meet or WhatsApp group)</label><input type="text" id="mUrl" placeholder="https://">
        <label for="mWhen">Date and time</label><input type="datetime-local" id="mWhen"><label for="mVenue">Venue (for in person)</label><input type="text" id="mVenue">
        <label for="mVis">Who can see it</label><select id="mVis"><option value="everyone">Everyone</option><option value="gagos">Gagos and the Adanawo only</option></select>
        <label><input type="checkbox" id="mLive"> It is live now</label><div class="row"><button class="btn" data-act="msave">Save meeting</button></div></details>
        <details class="card" style="margin:14px 0"><summary><b>Add minutes</b></summary><label for="nTitle">Title</label><input type="text" id="nTitle"><label for="nDate">Date of the meeting</label><input type="date" id="nDate">
        <label for="nVis">Who can see it</label><select id="nVis"><option value="everyone">Everyone</option><option value="gagos">Gagos and the Adanawo only</option></select>
        <label for="nBody">Minutes</label><textarea id="nBody" style="min-height:160px"></textarea><div class="row"><button class="btn" data-act="nsave">Save minutes</button></div></details>` : ''}
      <h2 style="font-size:19px;margin-top:20px">Now and next</h2>${upcoming(open).map(card).join('') || '<p class="empty">No meeting is planned yet.</p>'}
      <h2 style="font-size:19px;margin-top:20px">Minutes</h2>${mins(minutes.filter((x) => x.visibility === 'everyone'))}
      ${past(open).length ? `<h2 style="font-size:19px;margin-top:20px">Earlier meetings</h2>${past(open).slice(0, 10).map(card).join('')}` : ''}</section>
      ${room ? `<section class="section room"><h2>${ico('bead')} The Gagos' room</h2><p class="lead">Private. Only the Gagos and the Adanawo can see this.</p>
        ${upcoming(priv).map(card).join('') || '<p class="empty">No private meeting is planned.</p>'}<h3 style="margin:14px 0 6px">Private minutes</h3>${mins(minutes.filter((x) => x.visibility === 'gagos'))}${past(priv).slice(0, 10).map(card).join('')}</section>` : ''}`;
  }, async onClick(act, el) {
    const id = el.dataset.id;
    if (act === 'msave') {
      const t = $('#mTitle').value.trim(); if (!t) return toast('Please add a title'); const w = $('#mWhen').value;
      const r = await sb.from('meetings').insert({ kind: $('#mKind').value, title: t, join_url: $('#mUrl').value.trim() || null, starts_at: w ? new Date(w).toISOString() : null, venue: $('#mVenue').value.trim() || null, visibility: $('#mVis').value, is_live: $('#mLive').checked, created_by: st.user.id });
      if (r.error) return toast(friendly(r.error)); toast('Meeting saved'); return true;
    }
    if (act === 'nsave') {
      const t = $('#nTitle').value.trim(), b = $('#nBody').value.trim(); if (!t || !b) return toast('Please add a title and the minutes');
      const r = await sb.from('minutes').insert({ title: t, body: b, held_on: $('#nDate').value || null, visibility: $('#nVis').value }); if (r.error) return toast(friendly(r.error)); toast('Minutes saved'); return true;
    }
    if (act === 'mlive') { const r = await sb.from('meetings').update({ is_live: el.dataset.on !== '1' }).eq('id', id); if (r.error) return toast(friendly(r.error)); return true; }
    if (act === 'mdel') { if (!confirm('Delete this meeting?')) return; const r = await sb.from('meetings').delete().eq('id', id); if (r.error) return toast(friendly(r.error)); return true; }
    if (act === 'mphoto') { const p = await choosePhoto(1280); if (!p) return; const r = await sb.from('meeting_photos').insert({ meeting_id: id, photo_path: p }); if (r.error) return toast(friendly(r.error)); toast('Picture added'); return true; }
  } };

  // ================= YOUTH DAY =================
  const Y = { photo: null };
  PAGES.youth = { label: 'Youth Day', async view() {
    const open = st.settings.pitch_window_open === 'true';
    const [pi, nf] = await Promise.all([sb.from('posts').select('*').eq('kind', 'pitch').eq('hidden', false).order('created_at', { ascending: false }).limit(30),
      sb.from('posts').select('*').eq('kind', 'community').eq('hidden', false).order('created_at', { ascending: false }).limit(10)]);
    const canIntro = has('owner', 'admin', 'crown', 'adanawo', 'leader', 'gago');
    const form = !open ? '' : !st.user ? needSignIn('Sign in to share your pitch.') : `<div class="card" style="margin-bottom:14px"><h3>Share your pitch</h3>
      <label for="yTitle">What is your idea or talent called?</label><input type="text" id="yTitle"><label for="yTalent">Your talent</label><input type="text" id="yTalent" placeholder="Singing, farming, coding, tailoring…">
      <label for="yBody">Tell us about it</label><textarea id="yBody"></textarea><label for="ySupport">What support do you need?</label><input type="text" id="ySupport">
      <div class="row"><button class="btn alt small" data-act="yphoto" id="yph">Add a picture</button><button class="btn" data-act="ypitch">Share my pitch</button></div></div>`;
    return `<section class="section" style="margin-top:6px"><h2>${ico('crown')} Youth Day</h2>
      <p class="lead">A place for our young people to show their ideas and talents, and to ask for support. The window is <b>${open ? 'open now' : 'closed'}</b>${open && st.settings.pitch_window_closes ? ', until ' + esc(st.settings.pitch_window_closes) : ''}. ${open ? '' : 'Watch the Home page for the next Youth Day.'}</p>
      ${form}${st.user ? await A.postBlocks(pi.data || []) : (open ? '' : needSignIn('Sign in to see the pitches.'))}</section>
      <section class="section"><h2>${ico('person')} New faces</h2><p class="lead">We welcome new members of the community and say where they come from.</p>
      ${canIntro ? `<div class="card" style="margin-bottom:14px"><label for="nfT">Welcome someone</label><input type="text" id="nfT" placeholder="Name and village"><textarea id="nfB" placeholder="A few words" style="margin-top:8px"></textarea><div class="row"><button class="btn" data-act="newface">Post welcome</button></div></div>` : ''}
      ${st.user ? await A.postBlocks(nf.data || []) : ''}</section>`;
  }, async onClick(act) {
    if (act === 'yphoto') { const p = await choosePhoto(1280); if (p) { Y.photo = p; $('#yph').textContent = 'Picture added'; } return; }
    if (act === 'ypitch') {
      const t = $('#yTitle').value.trim(), b = $('#yBody').value.trim(); if (!t || !b) return toast('Please fill in the title and tell us about it');
      const r = await A.post({ kind: 'pitch', title: t, talent: $('#yTalent').value.trim() || null, body: b, support_needed: $('#ySupport').value.trim() || null, photo_path: Y.photo });
      if (r.error) return toast(friendly(r.error)); Y.photo = null; toast('Your pitch is shared. Good luck!'); return true;
    }
    if (act === 'newface') { const t = $('#nfT').value.trim(), b = $('#nfB').value.trim(); if (!t || !b) return toast('Please fill in both boxes');
      const r = await A.post({ kind: 'community', title: t, body: b }); if (r.error) return toast(friendly(r.error)); toast('Posted'); return true; }
  } };

  // ================= MARKETS =================
  const K = { photo: null };
  PAGES.markets = { label: 'Markets', async view() {
    const [mk, li] = await Promise.all([sb.from('markets').select('*'), sb.from('market_listings').select('*').order('created_at', { ascending: false })]);
    const markets = mk.data || [], listings = li.data || [];
    const item = (l) => { const img = photoUrl(l.photo_path), own = st.user && l.seller_id === st.user.id;
      return `<div class="listing">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<div class="noimg">${ico('calabash')}</div>`}<div><b>${esc(l.item)}</b><div>${esc(l.price_text || '')}</div><small>${esc(nameOf(l.seller_id))}</small>
        <div class="row" style="margin-top:6px">${l.whatsapp ? `<a class="btn small" target="_blank" rel="noopener" href="${wa(l.whatsapp, 'Hello, I saw your ' + l.item + ' on the Adanawo market.')}">WhatsApp</a>` : ''}
        ${own || isAdmin() ? `<button class="btn alt small" data-act="ldel" data-id="${l.id}">Remove</button>` : (st.user ? `<button class="btn alt small" data-act="report" data-type="listing" data-id="${l.id}">Report</button>` : '')}</div></div></div>`; };
    const sell = st.user ? `<details class="card" style="margin:14px 0"><summary><b>Sell something</b></summary><small>You can have up to 5 items at a time. Each stays for 30 days.</small>
      <label for="lMarket">Which market</label><select id="lMarket">${markets.map((m) => opt(m.id, m.name)).join('')}</select><label for="lItem">What are you selling</label><input type="text" id="lItem">
      <label for="lPrice">Price</label><input type="text" id="lPrice" placeholder="e.g. ₦5,000 or ask me"><label for="lWa">Your WhatsApp number</label><input type="text" id="lWa" inputmode="tel" >
      <div class="row"><button class="btn alt small" data-act="lphoto" id="lph">Add a picture</button><button class="btn" data-act="lsave">Put it on the market</button></div></details>` : needSignIn('Sign in to sell something.');
    return `<section class="section" style="margin-top:6px"><h2>${ico('calabash')} Our markets</h2><p class="lead">Buy and sell with your neighbours. The palace does not handle any payment. Please meet and agree between yourselves.</p>${sell}
      ${markets.map((m) => { const l = listings.filter((x) => x.market_id === m.id); return `<section class="area"><div class="head"><h2>${esc(m.name)}</h2><span>${l.length} item${l.length === 1 ? '' : 's'}</span></div><div class="body">${l.map(item).join('') || '<p class="empty">Nothing listed yet.</p>'}</div></section>`; }).join('')}</section>`;
  }, async onClick(act, el) {
    if (act === 'lphoto') { const p = await choosePhoto(900); if (p) { K.photo = p; $('#lph').textContent = 'Picture added'; } return; }
    if (act === 'ldel') { const r = await sb.from('market_listings').delete().eq('id', el.dataset.id); if (r.error) return toast(friendly(r.error)); return true; }
    if (act === 'lsave') {
      const it = $('#lItem').value.trim(); if (!it) return toast('Say what you are selling');
      const r = await sb.from('market_listings').insert({ market_id: $('#lMarket').value, seller_id: st.user.id, item: it, price_text: $('#lPrice').value.trim() || null, whatsapp: $('#lWa').value.trim() || null, photo_path: K.photo });
      if (r.error) return toast(/row-level security/i.test(r.error.message) ? 'You can have up to 5 items at a time. Please remove one first.' : r.error.message);
      K.photo = null; toast('Your item is on the market'); return true;
    }
  } };
})();
