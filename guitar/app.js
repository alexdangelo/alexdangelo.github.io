(function () {
'use strict';

// Built-in demo riff (original, written for this app) in alphaTex, alphaTab's text format.
var DEMO_TEX = String.raw`\title "Practice riff"
\artist "Built-in demo"
\tempo 140
\track "Guitar"
\tuning (e4 b3 g3 d3 a2 e2)
\instrument 27
\section "Clean intro"
:8 0.6{lr}{ch "Em"} 2.5{lr} 2.4{lr} 0.3{lr} 2.4{lr} 2.5{lr} 0.6{lr} 2.5{lr} |
3.6{lr}{ch "G"} 2.5{lr} 0.4{lr} 0.3{lr} 0.2{lr} 0.3{lr} 3.6{lr} 2.5{lr} |
3.5{lr}{ch "C"} 2.4{lr} 0.3{lr} 1.2{lr} 0.3{lr} 2.4{lr} 3.5{lr} 2.4{lr} |
0.4{lr}{ch "D"} 2.3{lr} 3.2{lr} 2.1{lr} 3.2{lr} 2.3{lr} :4 0.4{v} |
\section "Main riff"
\ro :8 (2.5 0.6){ch "E5" instrument 30} 0.6{pm} 0.6{pm} (5.5 3.6){ch "G5"} 0.6{pm} (7.5{sl} 5.6{sl}){ch "A5"} (9.5 7.6){ch "B5"} 0.6{pm} |
\rc 2 :8 (2.5 0.6){ch "E5"} 0.6{pm} 0.6{pm} (5.5 3.6){ch "G5"} 0.6{pm} 0.6{g} 7.3{b (0 2)} :4 7.3{v} |
\section "Ending"
:4 (5.5{lr} 3.6{lr}){ch "G5"} :8 (5.5 3.6) (7.5 5.6){ch "A5"} :4 (7.5{lr} 5.6{lr}) :8 0.6{pm} 0.6{pm} |
:2 (2.5{v} 0.6{v}){ch "E5"} :4 (2.5{x} 0.6{x}) r |
\track "Bass"
\tuning (g2 d2 a1 e1)
\instrument 33
:1 0.4 | 3.4 | 3.3 | 5.3 |
:8 0.4 0.4 0.4 3.4 0.4 5.4 7.4 0.4 |
0.4 0.4 0.4 3.4 0.4 0.4 :4 5.3 |
:4 3.4 :8 3.4 5.4 :4 5.4 :8 0.4 0.4 |
:2 0.4 :4 0.4 r |
\track "Drums"
\instrument percussion
\articulation defaults
:4 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed |
(KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed |
(KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed |
(KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) :8 SnareHit SnareHit |
:8 (KickHit CrashMediumHit) HiHatOpen (SnareHit HiHatOpen) HiHatOpen (KickHit HiHatOpen) (KickHit HiHatOpen) (SnareHit HiHatOpen) HiHatOpen |
(KickHit HiHatOpen) HiHatOpen (SnareHit HiHatOpen) HiHatOpen (KickHit HiHatOpen) (KickHit HiHatOpen) (SnareHit HiHatOpen) SnareHit |
(KickHit CrashMediumHit) HiHatOpen (SnareHit HiHatOpen) HiHatOpen (KickHit HiHatOpen) (KickHit HiHatOpen) (SnareHit HiHatOpen) HiHatOpen |
:2 (KickHit CrashMediumHit) :4 SnareHit r |
`;

var APP_VERSION = '1.0.0';                 // shown in the ⋯ menu; bump it when you change the app
var FONT_URL = 'fonts/Bravura.woff2';       // music symbols for the Detailed view
var SAMPLES_URL = 'sounds/samples.json';    // recorded guitar and bass notes
var AT = window.alphaTab;
var $ = function (id) { return document.getElementById(id); };

/* ---------- preferences ---------- */
var PREF_KEY = 'tabPlayerPrefs.v1';
var prefs = {};
try { prefs = JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}; } catch (e) { prefs = {}; }
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }

/* ---------- state ---------- */
var S = {
  score: null, song: null,
  view: prefs.view === 'detailed' ? 'detailed' : 'simple',
  notation: !!prefs.notation,
  speed: 60, trainer: false, countIn: false, band: true, loopOn: false,
  loopA: 0, loopB: 0, picking: false, pickFirst: -1,
  tone: prefs.tone || 'follow', metro: false,
  cur: 0, playing: false
};

/* ---------- menu switches ---------- */
function setSwitch(id, on, state) { $(id).setAttribute('aria-checked', on ? 'true' : 'false'); $(id + 'State').textContent = state; }
function isOn(id) { return $(id).getAttribute('aria-checked') === 'true'; }

/* ---------- theme ---------- */
function isDark() {
  var t = document.documentElement.getAttribute('data-theme');
  if (t) return t === 'dark';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function applyTheme() {
  if (prefs.theme) document.documentElement.setAttribute('data-theme', prefs.theme);
  var dark = isDark();
  setSwitch('themeBtn', dark, dark ? 'On: dark background' : 'Off: light background');
}
$('themeBtn').addEventListener('click', function () {
  prefs.theme = isDark() ? 'light' : 'dark'; savePrefs(); applyTheme(); retheme();
});

/* ---------- helpers ---------- */
var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function noteName(m) { return NOTE_NAMES[((m % 12) + 12) % 12]; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function setStatus(msg, err) { var el = $('status'); el.textContent = msg || ''; el.className = 'status' + (err ? ' err' : ''); }
function lowerBound(arr, t) { var lo = 0, hi = arr.length; while (lo < hi) { var mid = (lo + hi) >> 1; if (arr[mid].t < t - 1e-9) lo = mid + 1; else hi = mid; } return lo; }

/* ---------- song model ---------- */
function playOrder(score) {
  try {
    var gen = new AT.midi.MidiFileGenerator(score, new AT.Settings(), new AT.midi.AlphaSynthMidiFileHandler(new AT.midi.MidiFile()));
    gen.generate();
    var order = gen.tickLookup.masterBars.map(function (l) { return l.masterBar.index; });
    if (order.length) return order;
  } catch (e) {}
  return score.masterBars.map(function (m, i) { return i; });
}

function classifyTrack(tr) {
  if (tr.isPercussion || (tr.staves[0] && tr.staves[0].isPercussion)) return 'drums';
  var p = tr.playbackInfo.program, n = (tr.name || '').toLowerCase();
  if (/voc|voice|vox|sing|lyric|melody line/.test(n) || (p >= 52 && p <= 54)) return 'voice';
  if (/bass/.test(n) || (p >= 32 && p <= 39)) return 'bass';
  if (p >= 24 && p <= 31) return 'guitar';
  return 'synth';
}
function isDistProgram(p) { return p === 29 || p === 30 || p === 31; }
var DYN = [0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.93, 1, 0.3, 0.25, 0.2, 1];

function percMidi(tr, n) {
  var idx = n.percussionArticulation, arts = tr.percussionArticulations || [];
  if (arts.length && idx >= 0 && idx < arts.length && arts[idx]) return arts[idx].outputMidiNumber;
  return idx;
}

function buildSong(score, ti) {
  var track = score.tracks[ti], staff = track.staves[0];
  var tuning = staff.tuning || [];
  var stringed = tuning.length > 0 && !staff.isPercussion;
  var nStr = stringed ? tuning.length : 1;
  var mbs = score.masterBars;

  var displayBeats = [], beatIdx = new Map();
  staff.bars.forEach(function (bar) {
    bar.voices[0].beats.forEach(function (b) { beatIdx.set(b.id, displayBeats.length); displayBeats.push({ beat: b, bar: bar.index, markers: [] }); });
  });

  // tempo in effect at the start of each bar (in written order), so jumps back pick up the right tempo
  var tempoOf = function (mb) { return (mb.tempoAutomations || []).filter(function (a) { return a.type === 0; }).slice().sort(function (a, b) { return a.ratioPosition - b.ratioPosition; }); };
  var startBpm = [], run = score.tempo || 120;
  mbs.forEach(function (mb, i) {
    var au = tempoOf(mb);
    if (au.length && au[0].ratioPosition <= 0) run = au[0].value;
    startBpm[i] = run;
    if (au.length) run = au[au.length - 1].value;
  });
  var sec = 0, occs = [];
  playOrder(score).forEach(function (mi) {
    var mb = mbs[mi], D = mb.calculateDuration(), autos = tempoOf(mb);
    var cur = startBpm[mi], segs = [], s = 0, lastT = 0, changes = [];
    autos.forEach(function (a) { var at = a.ratioPosition * D; if (at <= 0.5) cur = a.value; else changes.push({ at: at, v: a.value }); });
    segs.push({ t: 0, s: 0, bpm: cur });
    changes.forEach(function (c) { s += (c.at - lastT) * 60 / (960 * cur); segs.push({ t: c.at, s: s, bpm: c.v }); lastT = c.at; cur = c.v; });
    s += (D - lastT) * 60 / (960 * cur);
    occs.push({ mb: mi, start: sec, dur: s, segs: segs, D: D, num: mb.timeSignatureNumerator, den: mb.timeSignatureDenominator });
    sec += s;
  });
  function segAt(occ, tick) { var g = occ.segs[0]; for (var i = 1; i < occ.segs.length; i++) { if (occ.segs[i].t <= tick) g = occ.segs[i]; else break; } return g; }
  function t2s(occ, tick) { var g = segAt(occ, tick); return occ.start + g.s + (tick - g.t) * 60 / (960 * g.bpm); }

  var events = [], markers = [];
  occs.forEach(function (occ, k) {
    var bar = staff.bars[occ.mb];
    if (bar) bar.voices[0].beats.forEach(function (b) {
      var d = beatIdx.get(b.id);
      var m = { t: t2s(occ, b.playbackStart), end: t2s(occ, b.playbackStart + b.playbackDuration), d: d, occ: k };
      m.i = markers.length; markers.push(m); displayBeats[d].markers.push(m.i);
      events.push({ t: m.t, k: 'm', mi: m.i });
    });
    var bt = 3840 / occ.den;
    for (var j = 0; j * bt < occ.D - 1; j++) events.push({ t: t2s(occ, j * bt), k: 'c', a: j === 0 });
  });

  // guitar sound in effect at the start of each bar (in written order), so a jump back restores it
  var barProg = [], prog = track.playbackInfo.program;
  staff.bars.forEach(function (bar) {
    barProg[bar.index] = prog;
    bar.voices[0].beats.forEach(function (b) { (b.automations || []).forEach(function (a) { if (a.type === 2) prog = a.value; }); });
  });
  occs.forEach(function (occ, k) {
    if (k > 0 && occs[k - 1].mb !== occ.mb - 1 && barProg[occ.mb] != null) events.push({ t: occ.start, k: 'tone', p: barProg[occ.mb] });
  });

  var kinds = score.tracks.map(classifyTrack);
  score.tracks.forEach(function (tr, tri) {
    var strTr = tr.staves[0] && tr.staves[0].tuning && tr.staves[0].tuning.length > 0;
    var kind = tri === ti && kinds[tri] !== 'drums' && strTr ? (kinds[tri] === 'bass' ? 'bass' : 'guitar') : kinds[tri];
    if ((kind === 'guitar' || kind === 'bass') && !strTr) kind = 'synth';
    var main = tri === ti;
    tr.staves.forEach(function (st) {
      occs.forEach(function (occ) {
        var bar = st.bars[occ.mb]; if (!bar) return;
        bar.voices.forEach(function (v) {
          v.beats.forEach(function (b) {
            if (main && st.index === 0 && v.index === 0) {
              (b.automations || []).forEach(function (a) { if (a.type === 2) events.push({ t: t2s(occ, b.playbackStart), k: 'tone', p: a.value }); });
            }
            if (b.isRest || !b.notes.length) return;
            var t = t2s(occ, b.playbackStart), g = segAt(occ, b.playbackStart), spt = 60 / (960 * g.bpm);
            var vel = DYN[b.dynamics] != null ? DYN[b.dynamics] : 0.8;
            b.notes.forEach(function (n) {
              if (n.isTieDestination) return;
              var ticks = b.playbackDuration, tn = n.tieDestination, guard = 0;
              while (tn && guard++ < 64) { ticks += tn.beat.playbackDuration; tn = tn.tieDestination; }
              var e = { t: t, k: 'n', tr: tri, kind: kind, d: ticks * spt, v: vel };
              if (kind === 'drums') { e.m = percMidi(tr, n); }
              else {
                e.m = n.realValue; e.s = st.index * 10 + n.string;
                if (n.isGhost) e.v *= 0.4;
                if (n.accentuated) e.v = Math.min(1, e.v * 1.15);
                if (n.isHammerPullDestination) e.v *= 0.75;
                if (n.isDead) e.dead = 1;
                if (n.isPalmMute || b.isPalmMute) e.pm = 1;
                if (n.isLetRing || b.isLetRing) e.lr = 1;
                var vib = n.vibrato || b.vibrato; if (vib) e.vib = vib;
                if (n.hasBend && n.bendPoints) e.bend = n.bendPoints.map(function (p) { return [p.offset, p.value]; });
                if (n.slideInType) e.sin = n.slideInType;
                if (n.slideOutType) { e.sout = n.slideOutType; if (n.slideTarget) e.sd = n.slideTarget.realValue - n.realValue; }
              }
              events.push(e);
            });
          });
        });
      });
    });
  });
  var korder = { tone: 0, m: 1, c: 2, n: 3 };
  events.sort(function (a, b) { return a.t - b.t || korder[a.k] - korder[b.k]; });

  var sections = [];
  mbs.forEach(function (mb) {
    if (mb.section) {
      var first = -1;
      for (var i = 0; i < markers.length; i++) if (occs[markers[i].occ].mb === mb.index) { first = i; break; }
      if (first >= 0) sections.push({ name: mb.section.text || mb.section.marker || ('Bar ' + (mb.index + 1)), mb: mb.index, first: first });
    }
  });

  var prog0 = track.playbackInfo.program;
  return {
    score: score, track: track, staff: staff, ti: ti, nStr: nStr, tuning: tuning, kinds: kinds, stringed: stringed,
    displayBeats: displayBeats, beatIdxOf: function (b) { return beatIdx.has(b.id) ? beatIdx.get(b.id) : null; }, occs: occs, markers: markers, events: events,
    sections: sections, end: sec, prog0: prog0, segAt: segAt
  };
}

/* ---------- techniques ---------- */
var TIPS = {
  pm: ['PM = palm mute', 'Rest the edge of your picking hand lightly on the strings, right next to the bridge. You get a tight, chugging sound.'],
  ghost: ['( ) = ghost note', 'Play it very quietly. It is more of a soft rhythmic sound than a real note.'],
  dead: ['x = dead note', 'Lay your fretting fingers lightly across the strings without pressing down, then pick. You get a percussive click with no pitch.'],
  bend: ['Bend', 'Push the string up toward the ceiling while it rings. ½ means raise the note by one fret’s worth; full means two frets’ worth.'],
  slide: ['sl. = slide', 'Keep pressing the string and slide your finger along the neck to the next fret without picking again.'],
  ham: ['h = hammer-on', 'Pick the first note, then tap your finger down hard on the higher fret so it sounds without picking.'],
  pull: ['p = pull-off', 'Pick the first note, then flick your finger off the string so the lower note sounds without picking.'],
  vib: ['~ = vibrato', 'Gently wiggle the string up and down after you play it so the note shimmers.'],
  ring: ['LR = let ring', 'Keep your fingers down and let the notes keep sounding into the next ones.'],
  harm: ['◇ = harmonic', 'Touch the string lightly right above the fret wire (don’t press it down), pick, then lift your finger. You get a bell-like tone.'],
  tie: ['( ) = tied note', 'Don’t pick this one. It just keeps the note from before ringing.']
};
function bendLabel(n) {
  var v = n.maxBendPoint ? n.maxBendPoint.value : 0;
  var steps = v / 4;
  if (steps === 0.25) return '¼';
  if (steps === 0.5) return '½';
  if (steps === 0.75) return '¾';
  if (steps === 1) return 'full';
  if (steps === 1.5) return '1½';
  return steps ? String(Math.round(steps * 4) / 4) : '↑';
}
function techOf(b) {
  var key = null, label = '';
  var pri = function (k, l) { if (!key) { key = k; label = l; } };
  b.notes.forEach(function (n) {
    if (n.isDead) pri('dead', 'x');
  });
  b.notes.forEach(function (n) {
    if (n.isGhost) pri('ghost', '( )');
    if (n.hasBend) pri('bend', bendLabel(n));
    if (n.slideInType || n.slideOutType || (n.slideOrigin && n.slideOrigin.slideOutType === 2)) pri('slide', 'sl.');
    if (n.isHammerPullDestination && n.hammerPullOrigin) pri(n.fret > n.hammerPullOrigin.fret ? 'ham' : 'pull', n.fret > n.hammerPullOrigin.fret ? 'h' : 'p');
    if (n.isHarmonic) pri('harm', '◇');
  });
  if (b.vibrato || b.notes.some(function (n) { return n.vibrato; })) pri('vib', '~');
  var ringHere = function (x) { return x && (x.isLetRing || x.notes.some(function (n) { return n.isLetRing; })); };
  if (ringHere(b) && !ringHere(b.previousBeat)) pri('ring', 'LR');
  if (b.isPalmMute || b.notes.some(function (n) { return n.isPalmMute; })) pri('pm', 'PM');
  if (b.notes.length && b.notes.every(function (n) { return n.isTieDestination; })) pri('tie', '( )');
  return key ? { key: key, label: label } : null;
}
/* ---------- fingering + descriptions ---------- */
function fingersFor(beat) {
  var res = {};
  var fretted = beat.notes.filter(function (n) { return !n.isDead && n.fret > 0; });
  var minF = Infinity;
  fretted.forEach(function (n) { if (n.fret < minF) minF = n.fret; });
  if (fretted.length === 1) {
    var bar = beat.voice.bar, low = Infinity;
    bar.voices[0].beats.forEach(function (b2) { b2.notes.forEach(function (n2) { if (n2.fret > 0 && !n2.isDead && n2.fret < low) low = n2.fret; }); });
    if (fretted[0].fret - low <= 3) minF = low;
  }
  beat.notes.forEach(function (n) {
    if (n.leftHandFinger >= 1 && n.leftHandFinger <= 4) res[n.id] = String(n.leftHandFinger);
    else if (n.isDead) res[n.id] = 'x';
    else if (n.fret === 0) res[n.id] = 'O';
    else res[n.id] = String(Math.max(1, Math.min(4, 1 + n.fret - minF)));
  });
  return res;
}
/* ---------- simple view ---------- */
function renderSimple() {
  var song = S.song, box = $('simpleView');
  if (!song) { box.innerHTML = ''; return; }
  var html = [], nStr = song.nStr;
  var names = song.tuning.map(function (m) { return noteName(m); });
  var secByBar = {};
  song.sections.forEach(function (s) { secByBar[s.mb] = s.name; });
  if (!song.stringed) names = ['♪'];
  var gutter = '<div class="gutter" aria-hidden="true"><div style="height:44px"></div>' + names.map(function (nm) { return '<div>' + nm + '</div>'; }).join('') + '</div>';
  song.staff.bars.forEach(function (bar) {
    var sec = secByBar[bar.index];
    var ta = bar.masterBar.tempoAutomations.filter(function (x) { return x.type === 0; })[0];
    var tempo = ta && (bar.index > 0 || ta.ratioPosition > 0) ? '<i>♩=' + Math.round(ta.value) + '</i>' : '';
    html.push('<div class="bar' + (sec ? ' first-in-section' : '') + '"><div class="barlabel">' + (bar.index + 1) + (sec ? '<b>' + esc(sec) + '</b>' : '') + tempo + '</div>' + gutter);
    bar.voices[0].beats.forEach(function (b) {
      var d = song.beatIdxOf(b), t = techOf(b);
      var wide = b.notes.some(function (n) { return n.fret >= 10 || n.isGhost; });
      html.push('<div class="beat' + (wide ? ' wide' : '') + '" data-d="' + d + '">');
      html.push('<div class="chd">' + (b.chord && b.chord.name ? esc(b.chord.name) : '') + '</div>');
      html.push('<div class="tec">' + (t ? '<button type="button" class="badge" data-tip="' + t.key + '" aria-label="What does ' + esc(TIPS[t.key][0]) + ' mean?">' + esc(t.label) + '</button>' : '') + '</div>');
      var byRow = {};
      if (!song.stringed) {
        var nm = song.track.isPercussion ? (b.notes.length ? '●' : '') : b.notes.map(function (n) { return noteName(n.realValue); }).join(' ');
        html.push('<div class="st"' + (nm.length > 4 ? ' style="font-size:11px"' : '') + '>' + (nm ? '<span class="fret">' + esc(nm) + '</span>' : '') + '</div></div>');
        return;
      }
      b.notes.forEach(function (n) { byRow[nStr - n.string] = n; });
      for (var r = 0; r < nStr; r++) {
        var n = byRow[r], txt = '';
        if (n) {
          if (n.isDead) txt = 'x';
          else if (n.isGhost || n.isTieDestination) txt = '(' + n.fret + ')';
          else txt = String(n.fret);
        }
        html.push('<div class="st">' + (n ? '<span class="fret">' + txt + '</span>' : '') + '</div>');
      }
      html.push('</div>');
    });
    html.push('</div>');
  });
  box.innerHTML = html.join('');
  S.beatEls = [];
  box.querySelectorAll('.beat').forEach(function (el) { S.beatEls[+el.dataset.d] = el; });
  paintLoop(); highlight(true);
}
$('simpleView').addEventListener('click', function (e) {
  var badge = e.target.closest('.badge');
  if (badge && !S.picking) { showTip(badge.dataset.tip, badge); e.stopPropagation(); return; }
  var el = e.target.closest('.beat');
  if (el) beatClicked(+el.dataset.d);
});

/* ---------- detailed view (alphaTab) ---------- */
var api = null, atReady = false, atRenderedFor = null;
function atColors() {
  var cs = getComputedStyle(document.documentElement);
  var g = function (v) { return cs.getPropertyValue(v).trim(); };
  return { mainGlyphColor: g('--text'), secondaryGlyphColor: g('--muted'), staffLineColor: g('--tabline'), barSeparatorColor: g('--muted'), barNumberColor: g('--muted'), scoreInfoColor: g('--text') };
}
function ensureDetailed() {
  if (!S.song) return;
  $('detailWrap').hidden = false;
  if (!AT) { $('detailMsg').textContent = 'The music drawing library could not load, so only the Simple view is available right now.'; return; }
  if (!api) {
    try {
      var c = atColors();
      api = new AT.AlphaTabApi($('atHost'), {
        core: { useWorkers: false, engine: 'svg', enableLazyLoading: false, smuflFontSources: new Map([['woff2', FONT_URL]]) },
        display: { layoutMode: 'Page', staveProfile: S.notation ? 'ScoreTab' : 'Tab', scale: 0.95, padding: [10, 10, 10, 10],
          resources: { mainGlyphColor: c.mainGlyphColor, secondaryGlyphColor: c.secondaryGlyphColor, staffLineColor: c.staffLineColor, barSeparatorColor: c.barSeparatorColor, barNumberColor: c.barNumberColor, scoreInfoColor: c.scoreInfoColor } },
        player: { enablePlayer: false, enableCursor: false, enableUserInteraction: false }
      });
      api.postRenderFinished.on(function () { atReady = true; $('detailMsg').style.display = 'none'; paintLoop(); highlight(true); });
      api.error.on(function (err) { $('detailMsg').style.display = ''; $('detailMsg').textContent = 'The detailed view couldn’t draw this song (' + (err && err.message ? err.message : 'unknown error') + '). The Simple view still works.'; });
    } catch (err) {
      $('detailMsg').textContent = 'The detailed view couldn’t start (' + err.message + '). The Simple view still works.';
      api = null; return;
    }
  }
  var key = S.song.ti + ':' + (S.notation ? 1 : 0) + ':' + S.song.renderKey;
  if (atRenderedFor !== key) {
    atRenderedFor = key; atReady = false;
    $('detailMsg').style.display = ''; $('detailMsg').textContent = 'Drawing the music…';
    api.settings.display.staveProfile = !S.song.stringed ? AT.StaveProfile.Default : S.notation ? AT.StaveProfile.ScoreTab : AT.StaveProfile.Tab;
    api.updateSettings();
    api.renderScore(S.score, [S.song.ti]);
  }
}
function retheme() {
  if (!api) return;
  var c = atColors(), r = api.settings.display.resources;
  ['mainGlyphColor', 'secondaryGlyphColor', 'staffLineColor', 'barSeparatorColor', 'barNumberColor', 'scoreInfoColor'].forEach(function (k) { r[k] = AT.model.Color.fromJson(c[k]); });
  api.updateSettings();
  if (S.view === 'detailed') { atReady = false; api.render(); } else atRenderedFor = null;
}
function surfaceOffset() {
  var surf = $('atHost').querySelector('.at-surface') || $('atHost');
  var a = surf.getBoundingClientRect(), b = $('detailWrap').getBoundingClientRect();
  return { x: a.left - b.left, y: a.top - b.top };
}
function beatRect(d) {
  if (!api || !atReady || !api.boundsLookup) return null;
  var db = S.song.displayBeats[d]; if (!db) return null;
  var bb = api.boundsLookup.findBeat(db.beat); if (!bb) return null;
  var mbb = bb.barBounds && bb.barBounds.masterBarBounds;
  var sys = mbb ? mbb.realBounds : bb.realBounds;
  return { x: bb.realBounds.x, w: bb.realBounds.w, y: sys.y, h: sys.h };
}
$('detailWrap').addEventListener('click', function (e) {
  if (!api || !atReady || !api.boundsLookup) return;
  var surf = $('atHost').querySelector('.at-surface') || $('atHost');
  var r = surf.getBoundingClientRect();
  var beat = api.boundsLookup.getBeatAtPos(e.clientX - r.left, e.clientY - r.top);
  if (!beat) return;
  var d = S.song.beatIdxOf(beat);
  if (d == null) {
    var bar = S.song.staff.bars[beat.voice.bar.index], best = null;
    if (bar) bar.voices[0].beats.forEach(function (b) { if (b.playbackStart <= beat.playbackStart) best = b; });
    if (best) d = S.song.beatIdxOf(best);
  }
  if (d != null) beatClicked(d);
});

/* ---------- loop + highlight ---------- */
function loopRange() {
  var song = S.song;
  if (!song || !song.markers.length) return { a: 0, b: 0, ts: 0, te: 0 };
  if (!S.loopOn) return { a: 0, b: song.markers.length - 1, ts: 0, te: song.end };
  return { a: S.loopA, b: S.loopB, ts: song.markers[S.loopA].t, te: song.markers[S.loopB].end };
}
function loopDisplaySet() {
  var set = new Set();
  if (!S.loopOn || !S.song) return set;
  for (var i = S.loopA; i <= S.loopB; i++) set.add(S.song.markers[i].d);
  return set;
}
function paintLoop() {
  var song = S.song; if (!song) return;
  var set = loopDisplaySet();
  if (S.beatEls) S.beatEls.forEach(function (el, d) { if (el) el.classList.toggle('in-loop', set.has(d)); });
  var lay = $('atLoop'); lay.innerHTML = '';
  if (S.view === 'detailed' && atReady) {
    var off = surfaceOffset(), html = [];
    set.forEach(function (d) { var r = beatRect(d); if (r) html.push('<div class="lrect" style="left:' + (r.x + off.x) + 'px;top:' + (r.y + off.y) + 'px;width:' + r.w + 'px;height:' + r.h + 'px"></div>'); });
    lay.innerHTML = html.join('');
  }
  updateLoopText(); paintPick();
}
var lastHi = -1;
function highlight(force) {
  var song = S.song; if (!song || !song.markers.length) return;
  var m = song.markers[S.cur], d = m.d;
  if (S.beatEls) {
    if (lastHi >= 0 && S.beatEls[lastHi]) S.beatEls[lastHi].classList.remove('now');
    var el = S.beatEls[d];
    if (el) {
      el.classList.add('now');
      if (S.view === 'simple') keepVisible(el, force);
    }
  }
  lastHi = d;
  var cur = $('atCursor');
  if (S.view === 'detailed' && atReady) {
    var r = beatRect(d), off = surfaceOffset();
    if (r) {
      cur.style.display = 'block';
      cur.style.left = (r.x + off.x) + 'px'; cur.style.top = (r.y + off.y) + 'px'; cur.style.width = r.w + 'px'; cur.style.height = r.h + 'px';
      keepVisible(cur, force);
    }
  } else cur.style.display = 'none';
  updateBoard(); updateSectionNav(); updateSpeedUI();
}
// outline on the beat chosen as the loop start, shown while choosing a loop
var pickShown = -1;
function paintPick() {
  var d = S.picking ? S.pickFirst : -1, pk = $('atPick');
  if (S.beatEls && S.beatEls[pickShown]) S.beatEls[pickShown].classList.remove('pick-start');
  if (S.beatEls && S.beatEls[d]) S.beatEls[d].classList.add('pick-start');
  pickShown = d;
  var pr = d >= 0 && S.view === 'detailed' ? beatRect(d) : null, off = pr && surfaceOffset();
  pk.style.display = pr ? 'block' : 'none';
  if (pr) { pk.style.left = (pr.x + off.x) + 'px'; pk.style.top = (pr.y + off.y) + 'px'; pk.style.width = pr.w + 'px'; pk.style.height = pr.h + 'px'; }
}
function keepVisible(el, force) {
  var r = el.getBoundingClientRect(), bottom = window.innerHeight - $('dock').offsetHeight - 12;
  if (r.top < 8 || r.bottom > bottom) window.scrollBy({ top: r.top - 90, behavior: force ? 'auto' : 'smooth' });
}

function beatClicked(d) {
  var song = S.song; if (!song) return;
  var ms = song.displayBeats[d].markers;
  if (!ms.length) return;
  if (S.picking) {
    if (S.pickFirst < 0) { S.pickFirst = d; updateLoopText(); paintPick(); return; }
    var aD = S.pickFirst, bD = d;
    var aM = song.displayBeats[aD].markers[0], bM = -1;
    var bList = song.displayBeats[bD].markers;
    for (var i = 0; i < bList.length; i++) if (bList[i] >= aM) { bM = bList[i]; break; }
    if (bM < 0) { bM = bList[0]; var tmp = aM; aM = Math.min(aM, bM); bM = Math.max(tmp, bM); }
    S.loopA = aM; S.loopB = bM; S.loopOn = true; S.picking = false; S.pickFirst = -1;
    syncPracticeButtons(); paintLoop();
    seek(aM);
    return;
  }
  var target = ms[0];
  for (var j = 0; j < ms.length; j++) if (ms[j] >= S.cur) { target = ms[j]; break; }
  if (S.loopOn && (target < S.loopA || target > S.loopB)) { S.loopOn = false; syncPracticeButtons(); paintLoop(); }
  seek(target);
}
function seek(mi) {
  var was = S.playing;
  if (was) stopPlayback(true, true);
  S.cur = mi; highlight();
  if (was) startPlayback(false);
}
function currentSection() {
  var song = S.song, secs = song.sections, best = -1;
  var curOcc = song.markers[S.cur].occ;
  for (var i = 0; i < secs.length; i++) {
    var firstOcc = song.markers[secs[i].first].occ;
    if (firstOcc <= curOcc) best = i;
  }
  return best;
}
function sectionMarkerRange(si) {
  var song = S.song, secs = song.sections, startM = secs[si].first;
  var curOcc = song.markers[S.cur].occ, startOcc = null;
  // find the occurrence of this section at or before the current position
  for (var k = curOcc; k >= 0; k--) if (song.occs[k].mb === secs[si].mb) { startOcc = k; break; }
  if (startOcc == null) startOcc = song.markers[startM].occ;
  var a = -1, b = song.markers.length - 1;
  var sectionMbs = new Set(secs.map(function (s) { return s.mb; }));
  for (var i = 0; i < song.markers.length; i++) {
    var m = song.markers[i];
    if (m.occ < startOcc) continue;
    if (a < 0) { a = i; continue; }
    if (m.occ !== song.markers[i - 1].occ && sectionMbs.has(song.occs[m.occ].mb) && song.occs[m.occ].mb !== secs[si].mb) { b = i - 1; break; }
  }
  return { a: Math.max(0, a), b: b };
}
function updateLoopText() {
  var song = S.song; if (!song) return;
  var txt = S.picking ? (S.pickFirst < 0 ? 'Click the loop start' : 'Click the loop end')
    : S.loopOn && song.markers.length ? 'Loop: bars ' + (song.displayBeats[song.markers[S.loopA].d].bar + 1) + '–' + (song.displayBeats[song.markers[S.loopB].d].bar + 1) : 'Loop off';
  $('loopText').textContent = txt;
  $('loopBtn').setAttribute('aria-pressed', S.loopOn && !S.picking);
  $('loopBtn').title = S.loopOn ? 'Loop on: click to turn it off (L)' : 'Turn the loop on (L)';
}

/* ---------- fretboard ---------- */
var FRETS = 22, boardCells = [];
function buildBoard() {
  var song = S.song, fb = $('fretboard'), nStr = song ? song.nStr : 6;
  var tuning = song ? song.tuning : [64, 59, 55, 50, 45, 40];
  fb.style.gridTemplateColumns = '30px 42px repeat(' + FRETS + ', minmax(40px, 1fr))';
  var html = [];
  boardCells = [];
  for (var r = 0; r < nStr; r++) {
    html.push('<div class="fb-name">' + noteName(tuning[r]) + '</div>');
    var thick = (1 + (r / Math.max(1, nStr - 1)) * 2).toFixed(1);
    for (var f = 0; f <= FRETS; f++) html.push('<div class="fb-cell' + (f === 0 ? ' nut' : '') + '" style="background-size:100% ' + thick + 'px"><span class="dot" id="fb' + r + '_' + f + '"></span></div>');
  }
  html.push('<div></div>');
  var marks = { 3: 1, 5: 1, 7: 1, 9: 1, 12: 1, 15: 1, 17: 1, 19: 1, 21: 1 };
  for (var g = 0; g <= FRETS; g++) html.push('<div class="fb-num' + (marks[g] ? ' mark' : '') + '">' + (g ? g : '') + '</div>');
  fb.innerHTML = html.join('');
  for (var r2 = 0; r2 < nStr; r2++) { boardCells[r2] = []; for (var f2 = 0; f2 <= FRETS; f2++) boardCells[r2][f2] = $('fb' + r2 + '_' + f2); }
  lastDots = [];
  $('fbScroll').parentElement.style.display = song && !song.stringed ? 'none' : '';
  sizeDock();
}
var lastDots = [];
function updateBoard() {
  var song = S.song; if (!song || !song.stringed) return;
  lastDots.forEach(function (el) { el.className = 'dot'; el.textContent = ''; });
  lastDots = [];
  var m = song.markers[S.cur]; if (!m) return;
  var nowB = song.displayBeats[m.d].beat, nxt = nextMarker(S.cur), nextB = nxt != null ? song.displayBeats[song.markers[nxt].d].beat : null;
  var used = {};
  function put(b, cls) {
    if (!b || b.isRest) return;
    var f = fingersFor(b);
    b.notes.forEach(function (n) {
      if (n.isTieDestination && cls === 'next') return;
      var r = song.nStr - n.string, fr = Math.min(FRETS, n.fret);
      var el = boardCells[r] && boardCells[r][fr]; if (!el) return;
      var k = r + '_' + fr; if (used[k]) return; used[k] = 1;
      el.className = 'dot ' + cls; el.textContent = f[n.id]; lastDots.push(el);
    });
  }
  put(nowB, 'now'); put(nextB, 'next');
  var maxF = 0;
  nowB.notes.forEach(function (n) { if (n.fret > maxF) maxF = n.fret; });
  var sc = $('fbScroll');
  if (sc.scrollWidth > sc.clientWidth + 4 && boardCells[0] && boardCells[0][maxF]) {
    var cell = boardCells[0][maxF].parentElement, x = cell.offsetLeft;
    if (x < sc.scrollLeft + 60 || x > sc.scrollLeft + sc.clientWidth - 80) sc.scrollLeft = Math.max(0, x - sc.clientWidth / 2);
  }
}
function nextMarker(mi) {
  var r = loopRange();
  if (mi + 1 <= r.b) return mi + 1;
  return S.loopOn ? r.a : null;
}

/* ---------- speed ---------- */
function updateSpeedUI() {
  $('speed').value = S.speed;
  $('speedLbl').textContent = S.speed + '%';
  var bpm = currentBpm();
  $('bpmLbl').textContent = bpm ? Math.round(bpm * S.speed / 100) + ' BPM' : '';
  $('bpmLbl').title = bpm ? 'Song tempo here: ' + Math.round(bpm) + ' BPM' : '';
}
function setSpeed(v) {
  v = Math.max(10, Math.min(100, v));
  if (S.playing && A) { var now = A.ctx.currentTime; if (now >= T.anchorCtx) { T.anchorSec += (now - T.anchorCtx) * S.speed / 100; T.anchorCtx = now; } }
  S.speed = v; updateSpeedUI();
}
function currentBpm() {
  var song = S.song; if (!song || !song.markers.length) return 0;
  var m = song.markers[S.cur], occ = song.occs[m.occ];
  return song.segAt(occ, 0).bpm;
}
function updateSectionNav() {
  var song = S.song; if (!song) return;
  var cs = currentSection();
  $('sections').querySelectorAll('button').forEach(function (b, i) { b.setAttribute('aria-current', i === cs ? 'true' : 'false'); });
}
function renderSections() {
  var song = S.song, nav = $('sections');
  nav.innerHTML = song.sections.map(function (s, i) { return '<button type="button" data-i="' + i + '">' + esc(s.name) + '</button>'; }).join('');
  nav.hidden = !song.sections.length;
}
$('sections').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  var s = S.song.sections[+b.dataset.i];
  if (S.loopOn) { S.cur = s.first; var r = sectionMarkerRange(+b.dataset.i); S.loopA = r.a; S.loopB = r.b; paintLoop(); seek(r.a); }
  else seek(s.first);
});

/* ---------- tip ---------- */
function showTip(key, anchor) {
  var tip = TIPS[key], el = $('tip');
  if (!tip || !anchor) { el.hidden = true; return; }
  $('tipT').textContent = tip[0]; $('tipB').textContent = tip[1];
  var r = anchor.getBoundingClientRect();
  el.hidden = false;
  el.style.left = Math.max(8, Math.min(window.innerWidth - el.offsetWidth - 8, r.left + window.scrollX - 20)) + 'px';
  el.style.top = (r.bottom + window.scrollY + 6) + 'px';
}
document.addEventListener('click', function (e) {
  if (!e.target.closest('.badge')) $('tip').hidden = true;
  if (!e.target.closest('.popwrap')) closePops();
});
function closePops(except) {
  document.querySelectorAll('[data-pop]').forEach(function (b) { if (b.dataset.pop !== except) { b.setAttribute('aria-expanded', 'false'); $(b.dataset.pop).hidden = true; } });
}
document.querySelectorAll('[data-pop]').forEach(function (b) {
  b.addEventListener('click', function () { var p = $(b.dataset.pop), open = p.hidden; closePops(b.dataset.pop); p.hidden = !open; b.setAttribute('aria-expanded', open); });
});

/* ---------- audio engine ---------- */
var A = null;
function makeCurve(drive, asym) {
  var n = 8192, c = new Float32Array(n), max = 0;
  for (var i = 0; i < n; i++) { var x = i * 2 / n - 1; c[i] = Math.tanh(drive * x + asym * x * x); max = Math.max(max, Math.abs(c[i])); }
  for (var k = 0; k < n; k++) c[k] /= max;
  return c;
}
function biquad(ctx, type, f, q, g) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; if (g) b.gain.value = g; return b; }
function chain(nodes) { for (var i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes; }
// Modeled 4x12 closed-back cab + close mic: short irregular impulse (cone ripple) followed by speaker/mic EQ.
function cabIR(ctx) {
  var sr = ctx.sampleRate, len = Math.round(sr * 0.012), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), seed = 7;
  var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };
  for (var i = 0; i < len; i++) d[i] = rnd() * Math.exp(-i / (sr * 0.0006));
  d[0] += 1.5; d[Math.round(sr * 0.00031)] += 0.5; d[Math.round(sr * 0.00087)] -= 0.3;
  return buf;
}
function makeChain(ctx, kind, drive) {
  var input = ctx.createGain(), out = ctx.createGain();
  if (kind === 'grunge') {
    var g1 = ctx.createGain(), g2 = ctx.createGain(), ws1 = ctx.createWaveShaper(), ws2 = ctx.createWaveShaper(), cab = ctx.createConvolver();
    g1.gain.value = drive || 10; g2.gain.value = 2.5;
    ws1.curve = makeCurve(3, 0.4); ws1.oversample = '4x';
    ws2.curve = makeCurve(1.6, 0); ws2.oversample = '4x';
    cab.normalize = true; cab.buffer = cabIR(ctx);
    chain([input, biquad(ctx, 'highpass', 110, 0.7), biquad(ctx, 'peaking', 750, 0.8, 4), g1, ws1, biquad(ctx, 'lowpass', 6000, 0.6), g2, ws2,
      biquad(ctx, 'lowshelf', 120, 0, 4), biquad(ctx, 'peaking', 520, 0.6, -8), biquad(ctx, 'peaking', 1800, 1, 2),
      cab, biquad(ctx, 'highpass', 75, 0.7), biquad(ctx, 'peaking', 110, 1.2, 3), biquad(ctx, 'peaking', 2600, 1.4, 3),
      biquad(ctx, 'lowpass', 4800, 0.8), biquad(ctx, 'lowpass', 5600, 0.6), out]);
    out.gain.value = 3.2;
  } else {
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3;
    chain([input, biquad(ctx, 'lowpass', 7500, 0.7), biquad(ctx, 'peaking', 220, 1, 2), comp, out]);
    out.gain.value = 2.4;
  }
  return { input: input, out: out };
}
function initAudio() {
  if (A) { if (A.ctx.state === 'suspended') A.ctx.resume(); return A; }
  var Ctx = window.AudioContext || window.webkitAudioContext;
  var ctx = new Ctx({ latencyHint: 'interactive' });
  var master = ctx.createGain(); master.gain.value = 0.9;
  var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -6; lim.ratio.value = 8; lim.attack.value = 0.003; lim.release.value = 0.2;
  master.connect(lim); lim.connect(ctx.destination);
  var mainVol = ctx.createGain(), backVol = ctx.createGain(), clickGain = ctx.createGain();
  mainVol.connect(master); backVol.connect(master); clickGain.connect(master); clickGain.gain.value = 0.6;
  var mClean = makeChain(ctx, 'clean');
  var mainIn = ctx.createGain(), mixC = ctx.createGain(), mixG = ctx.createGain();
  mainIn.connect(mClean.input); mClean.out.connect(mixC); mixC.connect(mainVol); mixG.connect(mainVol);
  // grunge "double tracking": two amps, one fed slightly later, panned left and right
  var gL = makeChain(ctx, 'grunge', 10), gR = makeChain(ctx, 'grunge', 12), dly = ctx.createDelay(), pL = ctx.createStereoPanner(), pR = ctx.createStereoPanner();
  dly.delayTime.value = 0.017; pL.pan.value = -0.7; pR.pan.value = 0.7;
  chain([mainIn, gL.input]); chain([mainIn, dly, gR.input]); chain([gL.out, pL, mixG]); chain([gR.out, pR, mixG]);
  var bClean = makeChain(ctx, 'clean'), bGrunge = makeChain(ctx, 'grunge');
  bClean.out.connect(backVol); bGrunge.out.connect(backVol);
  var backDirect = ctx.createGain(); backDirect.connect(backVol);
  var noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = noise.getChannelData(0);
  for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  A = { ctx: ctx, master: master, mainVol: mainVol, backVol: backVol, clickGain: clickGain, mainIn: mainIn, mixC: mixC, mixG: mixG,
    bClean: bClean, bGrunge: bGrunge, backDirect: backDirect, noise: noise, ks: new Map(), voices: new Map(), session: null };
  A.samples = { clean: {}, muted: {}, bass: {} };
  A.samplesReady = fetch(SAMPLES_URL).then(function (r) { return r.json(); }).then(function (data) {
    var jobs = [];
    Object.keys(data).forEach(function (set) {
      Object.keys(data[set]).forEach(function (m) {
        var bytes = Uint8Array.from(atob(data[set][m]), function (c) { return c.charCodeAt(0); });
        jobs.push(ctx.decodeAudioData(bytes.buffer).then(function (buf) { A.samples[set][m] = buf; }, function () {}));
      });
    });
    return Promise.all(jobs);
  }).catch(function () {});
  applyVolumes(); applyToneNow();
  return A;
}
function applyVolumes() {
  if (!A) return;
  var gv = +$('gtrVol').value / 100, bv = +$('backVol').value / 100;
  A.mainVol.gain.setTargetAtTime(S.tone === 'off' ? 0 : gv * gv * 1.2, A.ctx.currentTime, 0.02);
  A.backVol.gain.setTargetAtTime(S.band ? bv * bv * 1.1 : 0, A.ctx.currentTime, 0.02);
}
function toneIsDist(program) {
  if (S.tone === 'grunge') return true;
  if (S.tone === 'clean') return false;
  return isDistProgram(program);
}
function setMainTone(dist, when) {
  if (!A) return;
  var t = Math.max(when || 0, A.ctx.currentTime);
  A.mixG.gain.setTargetAtTime(dist ? 1 : 0, t, 0.01);
  A.mixC.gain.setTargetAtTime(dist ? 0 : 1, t, 0.01);
}
function programAt(sec) {
  var song = S.song, p = song.prog0;
  for (var i = 0; i < song.events.length; i++) { var e = song.events[i]; if (e.t > sec + 1e-6) break; if (e.k === 'tone') p = e.p; }
  return p;
}
function applyToneNow() {
  if (!A || !S.song) return;
  var sec = S.song.markers.length ? S.song.markers[S.cur].t : 0;
  setMainTone(toneIsDist(programAt(sec)), 0);
}
function ksBuffer(m, kind) {
  var key = kind + m;
  var hit = A.ks.get(key); if (hit) return hit;
  var ctx = A.ctx, sr = ctx.sampleRate;
  var freq = 440 * Math.pow(2, (m - 69) / 12);
  var exact = sr / freq, N = Math.max(2, Math.round(exact));
  var T60 = kind === 'bass' ? 3.2 : Math.max(1.4, Math.min(4.5, 4.5 - (m - 40) * 0.07));
  var len = Math.floor(sr * (kind === 'bass' ? 3 : Math.min(4.5, T60 + 0.5)));
  var buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
  var prev = 0;
  for (var i = 0; i < N && i < len; i++) {
    var r = Math.random() * 2 - 1;
    if (kind === 'bass') { prev = prev * 0.7 + r * 0.3; d[i] = prev * 2; } else { prev = prev * 0.25 + r * 0.75; d[i] = prev; }
  }
  var loss = Math.pow(0.001, N / (sr * T60));
  for (var j = N; j < len; j++) d[j] = loss * 0.5 * (d[j - N] + (j - N - 1 >= 0 ? d[j - N - 1] : 0));
  var peak = 0; for (var p = 0; p < Math.min(len, N * 4); p++) peak = Math.max(peak, Math.abs(d[p]));
  if (peak > 0) for (var q = 0; q < len; q++) d[q] /= peak;
  var res = { buf: buf, rate: N / exact };
  A.ks.set(key, res);
  return res;
}
function sampleFor(set, m) {
  var bank = A.samples && A.samples[set];
  if (!bank) return null;
  for (var off = 0; off <= 6; off++) {
    var cand = [m - off, m + off];
    for (var i = 0; i < 2; i++) if (bank[cand[i]]) return { buf: bank[cand[i]], rate: Math.pow(2, (m - cand[i]) / 12), real: true };
  }
  return null;
}
function sessionDest(tri, kind) {
  var sess = A.session, g = sess.gains[tri];
  if (!g) {
    g = A.ctx.createGain(); g.gain.value = trackEnabled(tri) ? 1 : 0;
    if (tri === S.song.ti) g.connect(A.mainIn);
    else if (kind === 'guitar') g.connect(isDistProgram(S.song.score.tracks[tri].playbackInfo.program) ? A.bGrunge.input : A.bClean.input);
    else g.connect(A.backDirect);
    sess.gains[tri] = g;
  }
  return g;
}
function trackEnabled(tri) {
  if (!S.song) return true;
  if (tri === S.song.ti) return true;
  return S.mix[tri] !== false;
}
function stealVoice(key, when) {
  var prev = A.voices.get(key);
  if (prev && prev.end > when) {
    try { prev.g.gain.cancelScheduledValues(when); prev.g.gain.setTargetAtTime(0, when, 0.012); } catch (e) {}
  }
}
function playString(e, when, dest, dur) {
  var ctx = A.ctx, kind = e.kind === 'bass' ? 'bass' : 'gtr';
  var key = e.tr + ':' + e.s;
  stealVoice(key, when);
  var d = Math.max(0.05, dur);
  var g = ctx.createGain(), v = e.v * (kind === 'bass' ? 0.9 : 0.7);
  if (e.dead) {
    var ns = ctx.createBufferSource(); ns.buffer = A.noise;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = kind === 'bass' ? 500 : 1800; bp.Q.value = 1.2;
    ns.connect(bp); bp.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(v * 0.7, when + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    ns.start(when, Math.random()); ns.stop(when + 0.08);
    A.voices.set(key, { g: g, end: when + 0.05 });
    return;
  }
  var ks = sampleFor(kind === 'bass' ? 'bass' : e.pm ? 'muted' : 'clean', e.m) || ksBuffer(e.m, kind);
  var src = ctx.createBufferSource(); src.buffer = ks.buf; src.playbackRate.value = ks.rate;
  var node = src;
  if (!ks.real && (e.pm || kind === 'bass')) {
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = e.pm ? (kind === 'bass' ? 500 : 1100) : 1600; lp.Q.value = 0.7;
    src.connect(lp); node = lp;
  }
  node.connect(g); g.connect(dest);
  var end = when + (e.lr ? Math.max(d, 3.5) : d * 0.97 + 0.02);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(v, when + 0.003);
  if (e.pm && !ks.real) g.gain.setTargetAtTime(v * 0.2, when + 0.012, 0.045);
  g.gain.setTargetAtTime(0, end, 0.03);
  src.start(when); src.stop(end + 0.3);
  var det = src.detune;
  if (e.bend && e.bend.length) {
    e.bend.forEach(function (p, i) { var tt = when + (p[0] / 60) * d; if (i === 0) det.setValueAtTime(p[1] * 50, tt); else det.linearRampToValueAtTime(p[1] * 50, tt); });
  } else if (e.sin) {
    det.setValueAtTime(e.sin === 1 ? -300 : 300, when); det.linearRampToValueAtTime(0, when + Math.min(0.12, d * 0.4));
  }
  if (e.sout) {
    if ((e.sout === 1 || e.sout === 2) && e.sd) { det.setValueAtTime(0, when + d * 0.55); det.linearRampToValueAtTime(e.sd * 100, when + d * 0.95); }
    else if (e.sout === 3 || e.sout === 4 || e.sout === 5 || e.sout === 6) {
      det.setValueAtTime(0, when + d * 0.5); det.linearRampToValueAtTime((e.sout === 3 || e.sout === 6) ? 700 : -700, when + d);
      g.gain.setTargetAtTime(0, when + d * 0.8, 0.04);
    }
  }
  if (e.vib) {
    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.5; lg.gain.value = e.vib === 2 ? 55 : 28;
    lfo.connect(lg); lg.connect(det);
    lfo.start(when + Math.min(0.15, d * 0.3)); lfo.stop(end + 0.3);
  }
  A.voices.set(key, { g: g, end: end });
}
function playSynth(e, when, dest, dur) {
  var ctx = A.ctx, o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  o.type = 'triangle'; o.frequency.value = 440 * Math.pow(2, (e.m - 69) / 12);
  lp.type = 'lowpass'; lp.frequency.value = 2400;
  o.connect(lp); lp.connect(g); g.connect(dest);
  var d = Math.max(0.08, dur), v = e.v * 0.16;
  g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(v, when + 0.02); g.gain.setTargetAtTime(v * 0.7, when + 0.03, 0.2);
  g.gain.setTargetAtTime(0, when + d, 0.05);
  o.start(when); o.stop(when + d + 0.4);
}
function noiseHit(when, dest, type, freq, q, decay, v) {
  var ctx = A.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = A.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
  s.connect(f); f.connect(g); g.connect(dest);
  g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(v, when + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
  s.start(when, Math.random() * 1.5); s.stop(when + decay + 0.05);
}
function toneHit(when, dest, f0, f1, decay, v, type) {
  var ctx = A.ctx, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f0, when); o.frequency.exponentialRampToValueAtTime(f1, when + decay * 0.6);
  o.connect(g); g.connect(dest);
  g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(v, when + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
  o.start(when); o.stop(when + decay + 0.05);
}
function playDrum(e, when, dest) {
  var m = e.m, v = e.v;
  if (m === 35 || m === 36) { toneHit(when, dest, 140, 45, 0.35, v * 1.0); noiseHit(when, dest, 'lowpass', 3000, 0.7, 0.02, v * 0.25); }
  else if (m === 38 || m === 40 || m === 37 || m === 31 || m === 33 || m === 34 || m === 91) { noiseHit(when, dest, 'bandpass', 2000, 0.6, m === 37 || m === 31 ? 0.06 : 0.2, v * 0.7); toneHit(when, dest, 220, 160, 0.09, v * 0.4, 'triangle'); }
  else if (m === 42 || m === 44 || m === 92) noiseHit(when, dest, 'highpass', 7500, 0.8, m === 44 ? 0.04 : 0.06, v * 0.28);
  else if (m === 46) noiseHit(when, dest, 'highpass', 7000, 0.8, 0.3, v * 0.25);
  else if (m === 49 || m === 57 || m === 52 || m === 55 || m === 30 || m === 97 || m === 98) noiseHit(when, dest, 'highpass', 4500, 0.6, m === 55 ? 0.5 : 1.4, v * 0.32);
  else if (m === 51 || m === 59 || m === 53 || m === 93 || m === 126 || m === 127 || m === 29) { noiseHit(when, dest, 'bandpass', 6500, 1.5, 0.5, v * 0.22); toneHit(when, dest, 3200, 3000, 0.3, v * 0.05); }
  else if (m >= 41 && m <= 50) { var f = 70 + (m - 41) * 14; toneHit(when, dest, f * 1.6, f, 0.32, v * 0.75); }
  else noiseHit(when, dest, 'bandpass', 3000, 1, 0.05, v * 0.2);
}
function click(when, accent, dest) {
  var ctx = A.ctx, o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = accent ? 1600 : 1050;
  o.connect(g); g.connect(dest || A.clickGain);
  g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(0.5, when + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
  o.start(when); o.stop(when + 0.08);
}

/* ---------- transport ---------- */
var T = { anchorCtx: 0, anchorSec: 0, ptr: 0, timer: null, vis: [], beatVis: [], endAt: null };
function realTime(sec) { return T.anchorCtx + (sec - T.anchorSec) / (S.speed / 100); }
function fire(e, when) {
  if (e.k === 'm') { T.vis.push({ time: when, mi: e.mi }); return; }
  if (e.k === 'c') { if (S.metro) { click(when, e.a, A.session.gains.clicks); T.beatVis.push({ time: when, a: e.a }); } return; }
  if (e.k === 'tone') { if (S.tone === 'follow') setMainTone(isDistProgram(e.p), when); return; }
  if (e.k === 'n') {
    if (!trackEnabled(e.tr)) return;
    var dest = sessionDest(e.tr, e.kind);
    var dur = e.d * 100 / S.speed; // note lengths are stored at full speed; stretch them when slowed down
    if (e.kind === 'drums') playDrum(e, when, dest);
    else if (e.kind === 'guitar' || e.kind === 'bass') playString(e, when, dest, dur);
    else playSynth(e, when, dest, dur);
  }
}
function scheduler() {
  var song = S.song; if (!song || !S.playing) return;
  var ctx = A.ctx, horizon = ctx.currentTime + 0.22, guard = 0;
  while (guard++ < 4000) {
    var r = loopRange(), segEnd = S.loopOn ? r.te : song.end;
    var e = song.events[T.ptr];
    if (e && e.t < segEnd - 1e-6) {
      var rt = realTime(e.t);
      if (rt <= horizon) { if (rt >= ctx.currentTime - 0.03) fire(e, Math.max(rt, ctx.currentTime)); T.ptr++; continue; }
      break;
    }
    var rtEnd = realTime(segEnd);
    if (rtEnd <= horizon) {
      if (S.loopOn) {
        if (S.trainer && S.speed < 100) { S.speed = Math.min(100, S.speed + 5); T.pendingSpeedUI = true; }
        T.anchorCtx = rtEnd; T.anchorSec = r.ts; T.ptr = lowerBound(song.events, r.ts);
        setMainTone(toneIsDist(programAt(r.ts)), rtEnd); // the loop start may use a different guitar sound
        continue;
      }
      if (!T.endAt) T.endAt = rtEnd;
    }
    break;
  }
}
function startPlayback(withCountIn) {
  var song = S.song; if (!song || !song.markers.length) return;
  initAudio(); stopFreeMetro();
  var ctx = A.ctx;
  var r = loopRange();
  if (S.cur < r.a || S.cur > r.b) S.cur = r.a;
  if (!S.loopOn && S.cur >= song.markers.length - 1) S.cur = 0;
  var sec = song.markers[S.cur].t;
  // clicks during playback (count-in + metronome) go through the session so Stop silences them too
  var sessClicks = ctx.createGain(); sessClicks.connect(A.clickGain);
  A.session = { gains: { clicks: sessClicks } };
  A.voices = new Map();
  setMainTone(toneIsDist(programAt(sec)), 0);
  var start = ctx.currentTime + 0.08;
  T.vis = []; T.beatVis = []; T.endAt = null;
  if (withCountIn && S.countIn) {
    var occ = song.occs[song.markers[S.cur].occ], bpm = song.segAt(occ, 0).bpm * S.speed / 100;
    var beatDur = 60 / bpm * (4 / occ.den), n = occ.num;
    for (var i = 0; i < n; i++) { click(start + i * beatDur, i === 0, sessClicks); T.beatVis.push({ time: start + i * beatDur, a: i === 0, count: i + 1 }); }
    start += n * beatDur;
  }
  T.anchorCtx = start; T.anchorSec = sec; T.ptr = lowerBound(song.events, sec);
  S.playing = true; setPlayIcon();
  T.timer = setInterval(scheduler, 25);
  scheduler();
}
function stopPlayback(quick, restarting) {
  S.playing = false; clearInterval(T.timer); T.timer = null; T.vis = []; T.beatVis = [];
  if (A && A.session) {
    var now = A.ctx.currentTime;
    Object.keys(A.session.gains).forEach(function (k) { var g = A.session.gains[k]; g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(0, now, quick ? 0.01 : 0.03); var gg = g; setTimeout(function () { try { gg.disconnect(); } catch (e) {} }, 400); });
    A.session = null;
  }
  setPlayIcon(); lightBeat(-1); $('countIn').textContent = '';
  if (S.metro && !restarting) startFreeMetro();
}
function setPlayIcon() {
  $('icoPlay').style.display = S.playing ? 'none' : '';
  $('icoPause').style.display = S.playing ? '' : 'none';
  $('playBtn').setAttribute('aria-label', S.playing ? 'Pause' : 'Play');
}
function lightBeat(i) {
  var spans = $('beats').children;
  for (var k = 0; k < spans.length; k++) spans[k].classList.toggle('lit', k === i);
}
var beatCounter = 0;
function frame() {
  if (A && (S.playing || S.metro)) {
    var now = A.ctx.currentTime, changed = false;
    while (S.playing && T.vis.length && T.vis[0].time <= now) { S.cur = T.vis.shift().mi; changed = true; }
    while (T.beatVis.length && T.beatVis[0].time <= now) {
      var b = T.beatVis.shift();
      beatCounter = b.a ? 0 : beatCounter + 1;
      lightBeat(beatCounter % 4);
      if (b.count) $('countIn').textContent = b.count;
    }
    if (changed) { $('countIn').textContent = ''; highlight(); }
    if (T.pendingSpeedUI) { T.pendingSpeedUI = false; updateSpeedUI(); }
    if (S.playing && T.endAt && now >= T.endAt) { stopPlayback(); S.cur = S.song.markers.length - 1; highlight(); }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* free-running metronome when stopped */
var freeMetro = { timer: null, next: 0, n: 0 };
function freeMetroTick() {
  if (!S.metro || S.playing || !A) return;
  var ctx = A.ctx;
  while (freeMetro.next < ctx.currentTime + 0.15) {
    var song = S.song, occ = song && song.markers.length ? song.occs[song.markers[S.cur].occ] : { num: 4, den: 4 };
    var bpm = (currentBpm() || 100) * S.speed / 100, beatDur = 60 / bpm * (4 / (occ.den || 4));
    var acc = freeMetro.n % (occ.num || 4) === 0;
    click(freeMetro.next, acc); T.beatVis.push({ time: freeMetro.next, a: acc });
    freeMetro.n++; freeMetro.next += beatDur;
  }
}
/* ---------- controls ---------- */
$('playBtn').addEventListener('click', function () {
  if (!S.song) return;
  if (S.playing) { stopPlayback(); return; }
  initAudio();
  var btn = this; btn.disabled = true;
  A.samplesReady.then(function () { btn.disabled = false; if (!S.playing) startPlayback(true); });
});
$('rewindBtn').addEventListener('click', function () { if (!S.song) return; var r = loopRange(); seek(S.loopOn ? r.a : 0); });
$('speed').addEventListener('input', function () { setSpeed(+this.value); });
$('slower').addEventListener('click', function () { setSpeed(S.speed - 5); });
$('faster').addEventListener('click', function () { setSpeed(S.speed + 5); });
function stopFreeMetro() { clearInterval(freeMetro.timer); freeMetro.timer = null; }
function startFreeMetro() { initAudio(); stopFreeMetro(); freeMetro.next = A.ctx.currentTime + 0.05; freeMetro.n = 0; T.beatVis = []; freeMetro.timer = setInterval(freeMetroTick, 25); freeMetroTick(); }
$('metroBtn').addEventListener('click', function () {
  S.metro = !S.metro;
  this.setAttribute('aria-pressed', S.metro);
  if (S.metro && !S.playing) startFreeMetro(); else stopFreeMetro();
  if (!S.metro) lightBeat(-1);
});
function syncPracticeButtons() {
  $('trainerBtn').setAttribute('aria-pressed', S.trainer);
  $('countInBtn').setAttribute('aria-pressed', S.countIn);
  $('bandBtn').setAttribute('aria-pressed', S.band);
  $('pickLoopBtn').setAttribute('aria-pressed', S.picking);
  document.body.classList.toggle('picking', S.picking);
  updateSpeedUI(); updateLoopText();
}
$('loopBtn').addEventListener('click', function () {
  if (!S.song) return;
  if (!S.loopOn && S.loopB <= S.loopA) { var cs = currentSection(); var r = cs >= 0 ? sectionMarkerRange(cs) : { a: 0, b: S.song.markers.length - 1 }; S.loopA = r.a; S.loopB = r.b; }
  S.loopOn = !S.loopOn; S.picking = false; S.pickFirst = -1; syncPracticeButtons(); paintLoop(); highlight();
});
$('trainerBtn').addEventListener('click', function () {
  S.trainer = !S.trainer; syncPracticeButtons();
  if (S.trainer) toast('<b>Speed trainer on:</b> +5% each time the loop repeats.' + (S.loopOn ? '' : ' Set a loop to use it.'), !S.loopOn);
  else $('toast').hidden = true;
});

/* styled tooltips: data-tt="Title|Body|Shortcut" */
var ttTimer = null;
function showTT(el) {
  var p = el.dataset.tt.split('|'), tt = $('tt');
  $('ttT').textContent = p[0]; $('ttB').textContent = p[1]; $('ttK').textContent = p[2] ? 'Shortcut: ' + p[2] : '';
  tt.hidden = false;
  var r = el.getBoundingClientRect(), w = tt.offsetWidth, cx = r.left + r.width / 2;
  var left = Math.max(8, Math.min(window.innerWidth - w - 8, cx - w / 2));
  tt.style.left = left + 'px';
  tt.style.top = (r.top - tt.offsetHeight - 12) + 'px';
  tt.style.setProperty('--arrow', (cx - left) + 'px');
}
function hideTT() { clearTimeout(ttTimer); $('tt').hidden = true; }
document.querySelectorAll('[data-tt]').forEach(function (el) {
  el.addEventListener('mouseenter', function () { clearTimeout(ttTimer); ttTimer = setTimeout(function () { showTT(el); }, 450); });
  el.addEventListener('focus', function () { if (el.matches(':focus-visible')) showTT(el); });
  ['mouseleave', 'blur', 'click'].forEach(function (ev) { el.addEventListener(ev, hideTT); });
});
window.addEventListener('scroll', hideTT, { passive: true });

var toastTimer = null;
function toast(html, withLoopBtn) {
  var t = $('toast');
  $('toastText').innerHTML = html; $('toastBtn').hidden = !withLoopBtn;
  t.hidden = false; t.style.bottom = ($('dock').offsetHeight + 14) + 'px';
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, withLoopBtn ? 6000 : 4000);
}
$('toastBtn').addEventListener('click', function () { $('toast').hidden = true; if (!S.picking) $('pickLoopBtn').click(); });
$('countInBtn').addEventListener('click', function () { S.countIn = !S.countIn; syncPracticeButtons(); });
$('bandBtn').addEventListener('click', function () { S.band = !S.band; syncPracticeButtons(); applyVolumes(); });
$('gtrVol').addEventListener('input', applyVolumes);
$('backVol').addEventListener('input', applyVolumes);
$('pickLoopBtn').addEventListener('click', function () { S.picking = !S.picking; S.pickFirst = -1; syncPracticeButtons(); paintPick(); });
$('loopSectionBtn').addEventListener('click', function () {
  if (!S.song) return;
  var cs = currentSection();
  var r = cs >= 0 ? sectionMarkerRange(cs) : (function () { var occ = S.song.markers[S.cur].occ, a = S.cur, b = S.cur; while (a > 0 && S.song.markers[a - 1].occ === occ) a--; while (b < S.song.markers.length - 1 && S.song.markers[b + 1].occ === occ) b++; return { a: a, b: b }; })();
  S.loopA = r.a; S.loopB = r.b; S.loopOn = true; S.picking = false; S.pickFirst = -1;
  syncPracticeButtons(); paintLoop(); seek(r.a);
});

var TONES = [
  ['follow', 'Follow the song', 'Switches between clean and distorted wherever the tab file changes the guitar sound.'],
  ['grunge', 'Grunge distortion', 'Thick, fuzzy distortion through an amp and speaker-cabinet model, in the style of early-’90s Seattle rock.'],
  ['clean', 'Clean electric', 'A plain electric guitar with no distortion, so every note is easy to hear.'],
  ['off', 'Off', 'Your part is silent. Only the band and metronome play, so your guitar carries the part.']
];
function renderTones() {
  $('tones').innerHTML = TONES.map(function (t) { return '<button type="button" class="tb" data-tone="' + t[0] + '" aria-pressed="' + (S.tone === t[0]) + '">' + t[1] + '</button>'; }).join('');
  var cur = TONES.filter(function (t) { return t[0] === S.tone; })[0];
  $('toneHint').textContent = cur ? cur[2] : '';
}
$('tones').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  S.tone = b.dataset.tone; prefs.tone = S.tone; savePrefs(); renderTones(); applyVolumes();
  if (A && S.song) {
    var sec = S.playing ? T.anchorSec + (A.ctx.currentTime - T.anchorCtx) * S.speed / 100 : (S.song.markers[S.cur] ? S.song.markers[S.cur].t : 0);
    setMainTone(toneIsDist(programAt(sec)), 0);
  }
});

function renderMixer() {
  var song = S.song, mx = $('mixer');
  var rows = song.score.tracks.map(function (tr, i) {
    if (i === song.ti) return '';
    var on = S.mix[i] !== false;
    return '<label><input type="checkbox" data-tr="' + i + '"' + (on ? ' checked' : '') + '>' + esc(tr.name || ('Track ' + (i + 1))) + (function () { var kl = ({ drums: 'drums', bass: 'bass', guitar: 'guitar', voice: 'vocal melody', synth: 'other instrument' })[song.kinds[i]]; return (tr.name || '').toLowerCase().indexOf(kl) >= 0 ? '' : ' <span class="small muted">' + kl + '</span>'; })() + '</label>';
  }).join('');
  mx.innerHTML = rows ? '<div class="small muted">Band tracks</div>' + rows : '<div class="small muted">This file has no other tracks to play along with.</div>';
}
$('mixer').addEventListener('change', function (e) {
  var cb = e.target; if (!cb.dataset.tr) return;
  var i = +cb.dataset.tr; S.mix[i] = cb.checked;
  if (A && A.session && A.session.gains[i]) A.session.gains[i].gain.setTargetAtTime(cb.checked ? 1 : 0, A.ctx.currentTime, 0.02);
});

$('viewSimple').addEventListener('click', function () { setView('simple'); });
$('viewDetailed').addEventListener('click', function () { setView('detailed'); });
$('notationBtn').addEventListener('click', function () {
  S.notation = !S.notation; prefs.notation = S.notation; savePrefs();
  syncNotation();
  if (S.view === 'detailed') ensureDetailed(); else setView('detailed');
});
function syncNotation() { setSwitch('notationBtn', S.notation, S.notation ? 'On: sheet music above the tab (Detailed view)' : 'Off: tab only'); }
function setView(v) {
  S.view = v; prefs.view = v; savePrefs();
  $('viewSimple').setAttribute('aria-pressed', v === 'simple');
  $('viewDetailed').setAttribute('aria-pressed', v === 'detailed');
  syncNotation();
  $('simpleView').hidden = v !== 'simple';
  $('simpleView').style.display = v === 'simple' ? '' : 'none';
  $('detailWrap').hidden = v !== 'detailed';
  if (v === 'detailed') ensureDetailed();
  paintLoop(); highlight(true);
}
function sizeDock() { document.documentElement.style.setProperty('--dock-h', ($('dock').offsetHeight + 24) + 'px'); }
window.addEventListener('resize', function () { sizeDock(); if (S.view === 'detailed') { paintLoop(); highlight(); } });
function setFretboard(on) { prefs.fb = on; savePrefs(); $('fbWrap').hidden = !on; $('fbBtn').setAttribute('aria-pressed', on); sizeDock(); }
$('fbBtn').addEventListener('click', function () { setFretboard(!!$('fbWrap').hidden); });
document.addEventListener('keydown', function (e) {
  var el = e.target, slider = el.type === 'range';
  if (e.ctrlKey || e.metaKey || e.altKey || !S.song) return;
  if (/INPUT|SELECT|TEXTAREA/.test(el.tagName) && !slider) return; // typing in a field
  if (slider && /^(Arrow|Home|End|Page)/.test(e.key)) return; // let the slider handle its own keys
  var k = e.key;
  if (k === ' ') { e.preventDefault(); $('playBtn').click(); }
  else if (k === 'l' || k === 'L') $('loopBtn').click();
  else if (k === 'm' || k === 'M') $('metroBtn').click();
  else if (k === '+' || k === '=') setSpeed(S.speed + 5);
  else if (k === '-' || k === '_') setSpeed(S.speed - 5);
  else if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); seek(Math.max(0, Math.min(S.song.markers.length - 1, S.cur + (k === 'ArrowRight' ? 1 : -1)))); }
  else if (k === 'Escape') { closePops(); $('tip').hidden = true; }
});

document.addEventListener('keyup', function (e) { if (e.key === ' ' && e.target.tagName === 'BUTTON') e.preventDefault(); });

/* ---------- loading ---------- */
function loadScore(score, name) {
  if (S.playing) stopPlayback(true);
  S.score = score;
  var best = 0, bestScore = -1;
  score.tracks.forEach(function (tr, i) {
    var k = classifyTrack(tr), st0 = tr.staves[0];
    var sc = (st0 && st0.tuning.length && !tr.isPercussion ? 2 : 0) + (k === 'guitar' || /guit/i.test(tr.name) ? 1 : 0) - (k === 'bass' ? 0.5 : 0) + (/rhythm/i.test(tr.name) ? 0.25 : 0);
    if (sc > bestScore) { bestScore = sc; best = i; }
  });
  $('trackSel').innerHTML = score.tracks.map(function (tr, i) { return '<option value="' + i + '"' + (i === best ? ' selected' : '') + '>' + esc((i + 1) + '. ' + (tr.name || 'Track ' + (i + 1))) + '</option>'; }).join('');
  $('songTitle').textContent = score.title || name || 'Untitled song';
  selectTrack(best);
}
var renderSeq = 0;
function selectTrack(ti) {
  var score = S.score;
  if (S.playing) stopPlayback(true);
  var song = buildSong(score, ti);
  song.renderKey = ++renderSeq;
  S.song = song;
  S.mix = {};
  song.kinds.forEach(function (k, i) { if (k === 'voice') S.mix[i] = false; });
  S.cur = 0; S.loopOn = false; S.loopA = 0; S.loopB = 0; S.picking = false; S.pickFirst = -1;
  var tr = song.track, st = song.staff;
  var meta = [];
  if (score.artist) meta.push(score.artist);
  meta.push(Math.round(score.tempo) + ' BPM');
  if (!tr.isPercussion && song.tuning.length) meta.push('Tuning: ' + (st.tuningName || song.tuning.slice().reverse().map(noteName).join(' ')));
  if (st.capo) meta.push('Capo ' + st.capo);
  var mins = Math.floor(song.end / 60), secs = Math.round(song.end % 60);
  meta.push(st.bars.length + ' bars, ' + mins + ':' + (secs < 10 ? '0' : '') + secs);
  $('songMeta').textContent = meta.join(' · ');
  renderSections(); renderMixer(); buildBoard(); renderTones();
  showTip(null);
  syncPracticeButtons();
  atRenderedFor = null;
  renderSimple();
  setView(S.view);
}
$('trackSel').addEventListener('change', function () { selectTrack(+this.value); });

function loadBytes(bytes, name, remember) {
  var score;
  try { score = AT.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes), new AT.Settings()); }
  catch (err) {
    setStatus('Couldn’t read “' + name + '”. This tool opens Guitar Pro (.gp, .gpx, .gp5, .gp4, .gp3), MusicXML (.musicxml, .xml, .mxl), Capella (.capx) and alphaTex files.', true);
    return;
  }
  try {
    loadScore(score, name);
    setStatus('Opened ' + name + '. Pick your part, then press Play.');
    if (remember) rememberFile(name, bytes);
  } catch (err) {
    console.error(err);
    setStatus('“' + name + '” was read, but something went wrong while setting it up (' + err.message + ').', true);
  }
}
$('fileInput').addEventListener('change', function () {
  var f = this.files && this.files[0]; if (!f) return;
  var reader = new FileReader();
  reader.onload = function () { loadBytes(reader.result, f.name, true); };
  reader.onerror = function () { setStatus('Couldn’t open that file. Try choosing it again.', true); };
  reader.readAsArrayBuffer(f);
  this.value = '';
});
var dragDepth = 0;
window.addEventListener('dragenter', function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0) { dragDepth++; $('drop').classList.add('on'); } });
window.addEventListener('dragleave', function () { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('drop').classList.remove('on'); });
window.addEventListener('dragover', function (e) { e.preventDefault(); });
window.addEventListener('drop', function (e) {
  e.preventDefault(); dragDepth = 0; $('drop').classList.remove('on');
  var f = e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return;
  f.arrayBuffer().then(function (buf) { loadBytes(buf, f.name, true); }, function () { setStatus('Couldn’t open that file. Try dropping it again.', true); });
});

/* recent file in IndexedDB (stays in this browser only) */
function idb() {
  return new Promise(function (res, rej) {
    try {
      var r = indexedDB.open('tabPlayer', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('files'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    } catch (e) { rej(e); }
  });
}
function rememberFile(name, bytes) {
  idb().then(function (db) { var tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put({ name: name, bytes: bytes }, 'last'); showReopen(name); }).catch(function () {});
}
function showReopen(name) {
  var b = $('reopenBtn'); b.hidden = false; b.textContent = 'Reopen ' + (name.length > 28 ? name.slice(0, 26) + '…' : name);
}
$('reopenBtn').addEventListener('click', function () {
  idb().then(function (db) {
    var rq = db.transaction('files').objectStore('files').get('last');
    rq.onsuccess = function () { if (rq.result) loadBytes(rq.result.bytes, rq.result.name, false); };
  }).catch(function () { setStatus('Couldn’t find your last file. Open it again with “Open tab file”.', true); });
});
$('demoBtn').addEventListener('click', loadDemo);
function loadDemo() {
  try {
    var score = AT.importer.ScoreLoader.loadAlphaTex(DEMO_TEX, new AT.Settings());
    loadScore(score, 'Demo riff');
    setStatus('This is a short built-in demo riff. Open your own Guitar Pro file to practice a real song.');
  } catch (err) { setStatus('The demo riff couldn’t load: ' + err.message, true); }
}

/* ---------- keep screen on (Screen Wake Lock) ---------- */
var wakeLock = null;
var WAKE_OFF = 'Off: your screen may dim or lock';
function setWake(on) {
  prefs.wake = on; savePrefs();
  if (!on) { if (wakeLock) wakeLock.release(); wakeLock = null; setSwitch('wakeBtn', false, WAKE_OFF); return; }
  var fail = function (msg) { prefs.wake = false; savePrefs(); setSwitch('wakeBtn', false, msg); };
  if (!('wakeLock' in navigator)) return fail('Off: this browser can’t keep the screen on. Try Chrome, Edge, Safari or a recent Firefox.');
  setSwitch('wakeBtn', true, 'Turning on…');
  navigator.wakeLock.request('screen').then(function (l) {
    wakeLock = l; setSwitch('wakeBtn', true, 'On: your screen won’t dim or lock');
    l.addEventListener('release', function () { if (wakeLock === l) wakeLock = null; });
  }).catch(function () { fail('Off: your browser didn’t allow it here. Try again, or open the page in its own tab.'); });
}
$('wakeBtn').addEventListener('click', function () { setWake(!isOn('wakeBtn')); });
// the browser drops the lock when you switch tabs; take it back when you return
document.addEventListener('visibilitychange', function () { if (prefs.wake && !wakeLock && document.visibilityState === 'visible') setWake(true); });
if (prefs.wake) setWake(true); else setSwitch('wakeBtn', false, WAKE_OFF);
syncNotation();

/* ---------- boot ---------- */
$('appVersion').textContent = 'Tab Practice Player, version ' + APP_VERSION;
applyTheme();
if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { applyTheme(); retheme(); });
renderTones(); updateSpeedUI(); setFretboard(prefs.fb !== false);
if (!AT) {
  $('songTitle').textContent = 'Tab Practice Player';
  setStatus('The tab-reading library didn’t load. Check your internet connection and reload the page.', true);
  return;
}
idb().then(function (db) {
  var rq = db.transaction('files').objectStore('files').get('last');
  rq.onsuccess = function () { if (rq.result) showReopen(rq.result.name); };
}).catch(function () {});
loadDemo();
$('demoBtn').hidden = false;
setTimeout(initAudio, 300); // start decoding guitar sounds right away; audio stays paused until you press Play
})();
