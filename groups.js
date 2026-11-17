/* Adanawo District Council: Groups (private bodies with posts, files and a small live chat) */
(function () {
  const A = window.APP, { sb, st, $, esc, ico, has, fmtDate, PAGES, toast, openModal, closeModal, nameOf, needSignIn } = A;
  const G = { open: null, tab: 'posts', ch: null, seen: new Set(), attach: {} };
  const BUCKET = 'group-files';
  const clock = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  function unsub() { if (G.ch) { try { sb.removeChannel(G.ch); } catch (e) {} G.ch = null; } }
  window.addEventListener('hashchange', () => { if (!/^#\/groups/.test(location.hash)) unsub(); });

  function pickAny(accept) { return new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); }); }
  async function uploadGroupFile(gid, file) {
    let blob = file, name = file.name.replace(/[^a-z0-9._-]/gi, '_');
    if (file.type.startsWith('image/')) { blob = await A.shrink(file, 1280); name = name.replace(/\.[^.]+$/, '') + '.jpg'; }
    else if (file.size > 2 * 1024 * 1024) throw new Error('That document is bigger than 2 MB. Please send a smaller one.');
    const path = `${gid}/${st.user.id}/${Date.now()}-${name}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || file.type || 'application/octet-stream' });
    if (error) throw error;
    return { path, name: file.name };
  }

  // ---------- the page ----------
  PAGES.groups = { label: 'Groups', when: () => !!st.user, async view() {
    unsub();
    if (!st.user) return needSignIn('Please sign in to see your groups.');
    const [gr, mm] = await Promise.all([sb.from('groups').select('*').order('sort_order'), sb.from('group_members').select('*').eq('user_id', st.user.id)]);
    const groups = gr.data || [], mine = mm.data || [];
    const mem = (gid) => mine.find((m) => m.group_id === gid);
    if (G.open) { const m = mem(G.open); if (m && m.status === 'member') return viewGroup(groups.find((g) => g.id === G.open), m); G.open = null; }
    const inG = groups.filter((g) => (mem(g.id) || {}).status === 'member'), others = groups.filter((g) => !inG.includes(g));
    return `<section class="section" style="margin-top:6px"><h2>${ico('seal')} Groups</h2>
      <p class="lead">Private spaces for the bodies of Adanawo. Only members can see what is inside.</p>
      <h3 style="margin:14px 0 8px">My groups</h3>${inG.map((g) => `<div class="gcard"><div><b>${esc(g.name)}</b><small>${esc(g.description || '')}</small></div><button class="btn small" data-act="gopen" data-id="${g.id}">Open</button></div>`).join('') || '<p class="empty">You are not in any group yet. Ask to join one below.</p>'}
      ${others.length ? `<h3 style="margin:18px 0 8px">Ask to join</h3>${others.map((g) => { const m = mem(g.id);
        return `<div class="gcard"><div><b>${esc(g.name)}</b><small>${esc(g.description || '')}</small></div>${m ? '<span class="stat s-invited">Request sent</span>' : `<button class="btn alt small" data-act="gjoin" data-id="${g.id}">Ask to join</button>`}</div>`; }).join('')}` : ''}</section>`;
  }, bind() { if (G.open && G.tab === 'chat') startChat(); },

  async onClick(act, el) {
    const id = el.dataset.id, gid = G.open;
    if (act === 'gopen') { G.open = id; G.tab = 'posts'; G.attach = {}; return true; }
    if (act === 'gback') { G.open = null; return true; }
    if (act === 'gtab') { G.tab = el.dataset.tab; return true; }
    if (act === 'gjoin') { const r = await sb.from('group_members').insert({ group_id: id, user_id: st.user.id, role: 'member', status: 'requested' }); if (r.error) return toast(r.error.message); toast('Request sent. The group leader will answer.'); return true; }
    if (act === 'gleave') { if (!confirm('Leave this group?')) return; const r = await sb.from('group_members').delete().eq('group_id', gid).eq('user_id', st.user.id); if (r.error) return toast(r.error.message); G.open = null; return true; }
    // posts
    if (act === 'gpic' || act === 'gdoc') {
      const f = await pickAny(act === 'gpic' ? 'image/*' : '.pdf,.doc,.docx,.xls,.xlsx,.txt'); if (!f) return;
      toast('Uploading…'); const u = await uploadGroupFile(gid, f);
      if (act === 'gpic') { G.attach.photo = u.path; $('#gpicB').textContent = 'Picture added'; } else { G.attach.doc = u.path; G.attach.docName = u.name; $('#gdocB').textContent = 'Document added: ' + u.name; }
      return;
    }
    if (act === 'gpost') {
      const b = $('#gBody').value.trim(); if (!b) return toast('Write something first');
      const r = await sb.from('group_posts').insert({ group_id: gid, author_id: st.user.id, body: b, photo_path: G.attach.photo || null, doc_path: G.attach.doc || null, doc_name: G.attach.docName || null });
      if (r.error) return toast(r.error.message); G.attach = {}; toast('Posted'); return true;
    }
    if (act === 'gpin') { const r = await sb.from('group_posts').update({ pinned: el.dataset.on !== '1' }).eq('id', id); if (r.error) return toast(r.error.message); return true; }
    if (act === 'gdelpost') { if (!confirm('Delete this post?')) return; const r = await sb.from('group_posts').delete().eq('id', id); if (r.error) return toast(r.error.message); return true; }
    if (act === 'gcomments') { const b = $('#gc-' + id); b.hidden = !b.hidden; return; }
    if (act === 'gsendcomment') { const v = $('#gci-' + id).value.trim(); if (!v) return; const r = await sb.from('group_comments').insert({ post_id: id, group_id: gid, author_id: st.user.id, body: v }); if (r.error) return toast(r.error.message); return true; }
    if (act === 'gdelcomment') { const r = await sb.from('group_comments').delete().eq('id', id); if (r.error) return toast(r.error.message); return true; }
    // chat
    if (act === 'gsend') {
      const inp = $('#chatIn'), v = inp.value.trim(); if (!v) return; inp.value = '';
      const r = await sb.from('group_messages').insert({ group_id: gid, author_id: st.user.id, body: v }).select().single();
      if (r.error) { inp.value = v; return toast(r.error.message); } if (r.data) addMsg(r.data); return;
    }
    if (act === 'gdelmsg') { const r = await sb.from('group_messages').delete().eq('id', id); if (r.error) return toast(r.error.message); const n = document.querySelector(`[data-mid="${id}"]`); if (n) n.remove(); return; }
    // members (leader)
    if (act === 'gapprove') { const r = await sb.from('group_members').update({ status: 'member' }).eq('group_id', gid).eq('user_id', el.dataset.uid); if (r.error) return toast(r.error.message); toast('Approved'); return true; }
    if (act === 'gremove') { if (!confirm('Remove this person from the group?')) return; const r = await sb.from('group_members').delete().eq('group_id', gid).eq('user_id', el.dataset.uid); if (r.error) return toast(r.error.message); return true; }
    if (act === 'gadd') { const uid = $('#gAddWho').value; if (!uid) return toast('Choose a person'); const r = await sb.from('group_members').upsert({ group_id: gid, user_id: uid, role: 'member', status: 'member' }); if (r.error) return toast(r.error.message); toast('Added'); return true; }
    if (act === 'gwa') { const link = $('#gWa').value.trim(); if (link && !/^https:\/\/(chat\.whatsapp\.com|wa\.me|whatsapp\.com)\//i.test(link)) return toast('That does not look like a WhatsApp group link');
      const r = await sb.from('group_private').upsert({ group_id: gid, whatsapp_link: link || null }); if (r.error) return toast(r.error.message); toast('Saved'); return true; }
  } };

  // ---------- inside one group ----------
  async function viewGroup(g, me) {
    const isLead = me.role === 'admin';
    const [pv, mb] = await Promise.all([sb.from('group_private').select('*').eq('group_id', g.id).maybeSingle(), sb.from('group_members').select('*').eq('group_id', g.id)]);
    const wa = pv.data && pv.data.whatsapp_link, members = mb.data || [];
    const pending = members.filter((m) => m.status === 'requested');
    let body = '';
    if (G.tab === 'posts') body = await postsTab(g, isLead);
    else if (G.tab === 'chat') body = await chatTab(g);
    else body = membersTab(g, isLead, members, pending, wa);
    return `<section class="section" style="margin-top:6px"><button class="lnk" data-act="gback" style="padding:0">← All groups</button>
      <h2 style="margin-top:6px">${esc(g.name)}</h2><p class="lead" style="margin:2px 0 10px">${esc(g.description || '')}</p>
      ${wa ? `<a class="btn" href="${esc(wa)}" target="_blank" rel="noopener">Join our WhatsApp group</a>` : (isLead ? '<small>Add your WhatsApp group link under Members → Settings so everyone can join it.</small>' : '')}
      <div class="gtabs"><button data-act="gtab" data-tab="posts" class="${G.tab === 'posts' ? 'on' : ''}">Posts</button><button data-act="gtab" data-tab="chat" class="${G.tab === 'chat' ? 'on' : ''}">Chat</button>
        <button data-act="gtab" data-tab="members" class="${G.tab === 'members' ? 'on' : ''}">Members${isLead && pending.length ? ` (${pending.length} new)` : ''}</button></div>${body}</section>`;
  }

  async function signedUrls(paths) {
    paths = paths.filter(Boolean); if (!paths.length) return {};
    const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths, 3600);
    return Object.fromEntries((data || []).map((x) => [x.path, x.signedUrl]));
  }
  async function postsTab(g, isLead) {
    const { data } = await sb.from('group_posts').select('*').eq('group_id', g.id).order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(30);
    const posts = data || [], ids = posts.map((p) => p.id);
    const [cm, urls] = await Promise.all([ids.length ? sb.from('group_comments').select('*').in('post_id', ids).order('created_at') : { data: [] }, signedUrls(posts.flatMap((p) => [p.photo_path, p.doc_path]))]);
    const comments = cm.data || [];
    return `<div class="card" style="margin-bottom:14px"><textarea id="gBody" placeholder="Share a notice, news or a question with the group"></textarea>
      <div class="row"><button class="btn alt small" data-act="gpic" id="gpicB">Add a picture</button><button class="btn alt small" data-act="gdoc" id="gdocB">Add a document</button><button class="btn" data-act="gpost">Post</button></div>
      <small>Documents can be PDF, Word, Excel or text, up to 2 MB.</small></div>
      ${posts.map((p) => { const cs = comments.filter((c) => c.post_id === p.id), own = p.author_id === st.user.id;
        return `<article class="post">${p.pinned ? '<span class="pin">Pinned</span>' : ''}<p>${esc(p.body)}</p>
          ${p.photo_path && urls[p.photo_path] ? `<img class="pic" src="${esc(urls[p.photo_path])}" alt="" loading="lazy">` : ''}
          ${p.doc_path && urls[p.doc_path] ? `<a class="attach" href="${esc(urls[p.doc_path])}" target="_blank" rel="noopener">Document: ${esc(p.doc_name || 'Open')}</a>` : ''}
          <small style="display:block;margin-top:6px">${esc(nameOf(p.author_id))} · ${fmtDate(p.created_at)}</small>
          <div class="acts"><button data-act="gcomments" data-id="${p.id}">Comments (${cs.length})</button>${isLead ? `<button data-act="gpin" data-id="${p.id}" data-on="${p.pinned ? 1 : 0}">${p.pinned ? 'Unpin' : 'Pin'}</button>` : ''}${own || isLead ? `<button data-act="gdelpost" data-id="${p.id}">Delete</button>` : ''}</div>
          <div class="cbox" id="gc-${p.id}" hidden>${cs.map((c) => `<div class="cm"><b>${esc(nameOf(c.author_id))}</b> ${esc(c.body)}${c.author_id === st.user.id || isLead ? ` <button class="lnk" data-act="gdelcomment" data-id="${c.id}">remove</button>` : ''}</div>`).join('')}
            <div class="row" style="margin-top:8px"><input type="text" id="gci-${p.id}" placeholder="Write a comment"><button class="btn small" data-act="gsendcomment" data-id="${p.id}">Send</button></div></div></article>`; }).join('') || '<p class="empty">No posts yet. Be the first to write.</p>'}`;
  }

  // ---------- chat ----------
  function msgHtml(m) {
    const mine = m.author_id === st.user.id, lead = G.isLead;
    return `<div class="msg ${mine ? 'mine' : ''}" data-mid="${m.id}"><b>${mine ? 'You' : esc(nameOf(m.author_id))}</b>${esc(m.body)}<small> ${clock(m.created_at)}${mine || lead ? ` <button class="lnk" data-act="gdelmsg" data-id="${m.id}">delete</button>` : ''}</small></div>`;
  }
  function addMsg(m) {
    const box = $('#chatList'); if (!box || G.seen.has(m.id)) return; G.seen.add(m.id);
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.insertAdjacentHTML('beforeend', msgHtml(m)); if (near || m.author_id === st.user.id) box.scrollTop = box.scrollHeight;
  }
  async function chatTab(g) {
    const { data } = await sb.from('group_messages').select('*').eq('group_id', g.id).order('created_at', { ascending: false }).limit(50);
    const list = (data || []).slice().reverse(); G.seen = new Set(list.map((m) => m.id));
    const me = ((await sb.from('group_members').select('role').eq('group_id', g.id).eq('user_id', st.user.id).maybeSingle()).data || {}); G.isLead = me.role === 'admin';
    return `<small>A quick chat for short messages. Messages older than 30 days are removed. Please share pictures and documents under Posts.</small>
      <div class="chat" id="chatList">${list.map(msgHtml).join('') || ''}</div>
      <div class="row"><input type="text" id="chatIn" placeholder="Write a message" maxlength="1000"><button class="btn" data-act="gsend">Send</button></div>`;
  }
  function startChat() {
    const box = $('#chatList'); if (box) box.scrollTop = box.scrollHeight;
    const inp = $('#chatIn'); if (inp) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); document.querySelector('[data-act="gsend"]').click(); } });
    unsub();
    try {
      G.ch = sb.channel('gchat-' + G.open).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: 'group_id=eq.' + G.open }, (p) => addMsg(p.new)).subscribe();
    } catch (e) { /* chat still works by reopening the tab */ }
  }

  // ---------- members ----------
  function membersTab(g, isLead, members, pending, wa) {
    const active = members.filter((m) => m.status === 'member').sort((a, b) => (b.role === 'admin') - (a.role === 'admin'));
    const inGroup = new Set(members.map((m) => m.user_id));
    const candidates = st.people.filter((p) => p.user_id && !inGroup.has(p.user_id)).sort((a, b) => a.full_name.localeCompare(b.full_name));
    return `${isLead && pending.length ? `<div class="card" style="margin-bottom:14px"><h3>Asking to join</h3>${pending.map((m) => `<div class="admin-row"><b>${esc(nameOf(m.user_id))}</b><div class="row" style="margin:0"><button class="btn small" data-act="gapprove" data-uid="${m.user_id}">Approve</button><button class="btn alt small" data-act="gremove" data-uid="${m.user_id}">Decline</button></div></div>`).join('')}</div>` : ''}
      <div class="card"><h3>${active.length} member${active.length === 1 ? '' : 's'}</h3>${active.map((m) => `<div class="admin-row"><div><b>${esc(nameOf(m.user_id))}</b>${m.role === 'admin' ? '<small>Leader</small>' : ''}</div>${isLead && m.role !== 'admin' ? `<button class="btn alt small" data-act="gremove" data-uid="${m.user_id}">Remove</button>` : ''}</div>`).join('')}</div>
      ${isLead ? `<div class="card" style="margin-top:14px"><h3>Add a member</h3><p class="lead" style="margin:2px 0 8px">Only people who have signed in to the website can be added.</p>
        <select id="gAddWho"><option value="">Choose a person</option>${candidates.map((p) => `<option value="${p.user_id}">${esc(p.full_name)}</option>`).join('')}</select><div class="row"><button class="btn" data-act="gadd">Add to group</button></div></div>
        <div class="card" style="margin-top:14px"><h3>Settings</h3><label for="gWa">WhatsApp group link</label><input type="text" id="gWa" value="${esc(wa || '')}" placeholder="https://chat.whatsapp.com/…"><div class="row"><button class="btn" data-act="gwa">Save link</button></div></div>` : ''}
      <div class="row"><button class="btn alt small" data-act="gleave">Leave this group</button></div>`;
  }
})();
