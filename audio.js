/* Adanawo District Council: voice recording and playing.
   Used by the Àlo stories (no time limit) and by voice comments (1 minute). */
(function () {
  const A = window.APP, { sb, st, esc, toast } = A;
  const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  const EXT = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/3gpp': '3gp' };
  const FILEEXT = { webm: 'audio/webm', m4a: 'audio/mp4', mp4: 'audio/mp4', ogg: 'audio/ogg', opus: 'audio/ogg', oga: 'audio/ogg', mp3: 'audio/mpeg', aac: 'audio/aac', wav: 'audio/wav', '3gp': 'audio/3gpp' };
  const base = (t) => String(t || 'audio/webm').split(';')[0].toLowerCase();
  const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  const pickType = () => (window.MediaRecorder && MediaRecorder.isTypeSupported ? TYPES.find((t) => MediaRecorder.isTypeSupported(t)) : '') || '';
  const clock = (n) => Math.floor(n / 60) + ':' + String(Math.floor(n % 60)).padStart(2, '0');
  const MAXBYTES_STORY = 49 * 1024 * 1024;

  // A small recorder inside any box. opt: { max: seconds (0 = no limit), file: allow choosing a file, maxBytes }
  function mountRecorder(host, opt) {
    opt = opt || {}; const max = opt.max || 0, maxBytes = opt.maxBytes || MAXBYTES_STORY;
    const c = { blob: null, mime: '', secs: 0, stream: null, mr: null, chunks: [], size: 0, timer: null, t0: 0 };
    host.innerHTML = `<div class="rec"><div class="rec-top"><button type="button" class="btn small" data-r="start">● Record</button><button type="button" class="btn small alt" data-r="stop" hidden>■ Stop</button><span class="rec-time" data-r="time">${max ? 'Up to ' + clock(max) : ''}</span></div>
      <audio controls class="rec-play" hidden></audio>
      <div class="rec-row"><button type="button" class="lnk" data-r="clear" hidden>Remove this recording</button>${opt.file ? '<label class="lnk">Or choose a recording from your phone<input type="file" accept="audio/*" hidden data-r="file"></label>' : ''}</div></div>`;
    const q = (k) => host.querySelector(`[data-r="${k}"]`), play = host.querySelector('audio');
    const show = () => { const has = !!c.blob; q('start').hidden = !!c.mr || has; q('stop').hidden = !c.mr; q('clear').hidden = !has || !!c.mr; play.hidden = !has;
      if (has) { play.src = URL.createObjectURL(c.blob); q('time').textContent = c.secs ? 'Length ' + clock(c.secs) : 'Ready'; } };
    const stopStream = () => { if (c.stream) c.stream.getTracks().forEach((t) => t.stop()); c.stream = null; };
    function stop() { clearInterval(c.timer); if (c.mr && c.mr.state !== 'inactive') c.mr.stop(); }
    async function start() {
      if (!canRecord()) return toast('This phone cannot record here. Please choose a recording from your phone instead.');
      try { c.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
      catch (e) { return toast('Please allow the microphone, so that you can record.'); }
      const type = pickType(), o = { audioBitsPerSecond: 32000 }; if (type) o.mimeType = type;
      try { c.mr = new MediaRecorder(c.stream, o); } catch (e) { stopStream(); return toast('Recording is not possible on this phone.'); }
      c.chunks = []; c.size = 0;
      c.mr.ondataavailable = (e) => { if (e.data && e.data.size) { c.chunks.push(e.data); c.size += e.data.size; if (c.size > maxBytes) { toast('This recording is as long as the page can keep. It has been stopped.'); stop(); } } };
      c.mr.onstop = () => { c.secs = Math.round((Date.now() - c.t0) / 1000); c.mime = c.mr.mimeType || type || 'audio/webm'; c.blob = new Blob(c.chunks, { type: c.mime }); c.mr = null; stopStream(); show(); if (opt.onChange) opt.onChange(c); };
      c.mr.start(1000); c.t0 = Date.now(); show();
      c.timer = setInterval(() => { const s = (Date.now() - c.t0) / 1000; q('time').textContent = '● ' + clock(s) + (max ? ' of ' + clock(max) : ''); if (max && s >= max) { toast('That is the full minute.'); stop(); } }, 250);
    }
    host.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (!b) return; const k = b.dataset.r;
      if (k === 'start') start(); else if (k === 'stop') stop();
      else if (k === 'clear') { c.blob = null; c.secs = 0; play.removeAttribute('src'); q('time').textContent = max ? 'Up to ' + clock(max) : ''; show(); if (opt.onChange) opt.onChange(c); } });
    const fi = q('file');
    if (fi) fi.onchange = () => { const f = fi.files[0]; if (!f) return;
      const ext = (f.name.split('.').pop() || '').toLowerCase(), mime = (f.type && f.type.startsWith('audio/') ? f.type : FILEEXT[ext]) || '';
      if (!mime) return toast('Please choose an audio file (for example a voice note).');
      if (f.size > maxBytes) return toast('That file is too big. The most is 49 MB.');
      c.blob = f; c.mime = mime; c.secs = 0; show(); if (opt.onChange) opt.onChange(c); };
    c.cancel = () => { clearInterval(c.timer); if (c.mr && c.mr.state !== 'inactive') { c.mr.onstop = null; c.mr.stop(); } stopStream(); };
    return c;
  }

  async function uploadAudio(bucket, c) {
    if (!st.user) throw new Error('Please sign in first');
    const m = base(c.mime), path = `${st.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${EXT[m] || 'webm'}`;
    const { error } = await sb.storage.from(bucket).upload(path, c.blob, { contentType: m });
    if (error) throw error;
    return path;
  }
  const storyAudioUrl = (p) => (p ? sb.storage.from('story-audio').getPublicUrl(p).data.publicUrl : null);
  // voice comments are private: give each player a short-lived link
  async function hydrateVoice(root) {
    const els = [...(root || document).querySelectorAll('audio[data-vc]')]; if (!els.length) return;
    const { data } = await sb.storage.from('voice-comments').createSignedUrls(els.map((e) => e.dataset.vc), 3600);
    (data || []).forEach((d) => { const el = els.find((e) => e.dataset.vc === d.path); if (el && d.signedUrl) el.src = d.signedUrl; });
  }
  Object.assign(A, { mountRecorder, uploadAudio, storyAudioUrl, hydrateVoice, canRecord });
})();
