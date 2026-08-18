/**
 * Generatore degli asset SVG del profilo GitHub.
 *
 * PERCHE' UN GENERATORE E NON VENTI FILE SCRITTI A MANO
 * GitHub non esegue CSS del repository: l'unico modo per avere il
 * linguaggio visivo del sito dentro un README e' disegnarlo in SVG.
 * Venti SVG scritti a mano divergono al primo ritocco di colore — qui
 * i token stanno in un posto solo, come in _tokens.scss del tema.
 *
 *   node tools/build.mjs
 *
 * Legge tools/icons.mjs (tracciati simple-icons estratti una volta, cosi'
 * il repo non ha dipendenze) e scrive tutto in assets/.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS } from './icons.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets');

/* ---------------------------------------------------------------
   Token — gli stessi di src/styles/_tokens.scss del tema fymera-x.
   --------------------------------------------------------------- */
const T = {
  s0: '#06070a',
  s1: '#0c0e13',
  s2: '#12151c',
  s3: '#1a1e28',
  strong: '#f2f2f4',
  text: '#c9c9d1',
  muted: '#8a8a96',
  faint: '#5a5a66',
  pink: '#ff2d8f',
  blue: '#3e6aff',
  green: '#22c55e',
  amber: '#fbbf24',
  red: '#ef4444',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.15)',
  mono: "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'DejaVu Sans Mono',monospace",
  sans: "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
};

/* Larghezza di una riga monospaziata. 0.6em e' l'avanzamento di Menlo,
   SF Mono e DejaVu Sans Mono; Consolas e' piu' stretto, quindi la stima
   sbaglia sempre per eccesso — ed e' il verso giusto in cui sbagliare:
   un clip di battitura largo finisce in anticipo, uno stretto taglia. */
const mw = (s, size) => s.length * size * 0.6;

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Numeri pseudo-casuali deterministici: la build deve produrre due volte
   lo stesso file, altrimenti ogni rigenerazione e' un diff finto. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * La forma del bottone principale del sito: due angoli opposti tagliati
 * di netto (alto-sinistra e basso-destra), gli altri due vivi.
 */
const cutShape = (x, y, w, h, c) =>
  `${x + c},${y} ${x + w},${y} ${x + w},${y + h - c} ${x + w - c},${y + h} ${x},${y + h} ${x},${y + c}`;

/** Griglia di punti: la texture tecnica di fondo, tenuta al minimo. */
const dotGrid = (id, step = 22, r = 1, op = 0.05) => `
  <pattern id="${id}" width="${step}" height="${step}" patternUnits="userSpaceOnUse">
    <circle cx="1" cy="1" r="${r}" fill="rgba(255,255,255,${op})"/>
  </pattern>`;

/** Le parentesi angolari agli spigoli: il telaio, come nel sito. */
function brackets(w, h, inset = 18, arm = 26, stroke = T.lineStrong) {
  const a = inset,
    b = arm;
  const p = (d) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1"/>`;
  return [
    p(`M${a},${a + b} L${a},${a} L${a + b},${a}`),
    p(`M${w - a - b},${a} L${w - a},${a} L${w - a},${a + b}`),
    p(`M${a},${h - a - b} L${a},${h - a} L${a + b},${h - a}`),
    p(`M${w - a - b},${h - a} L${w - a},${h - a} L${w - a},${h - a - b}`),
  ].join('\n  ');
}

/** L'unico gradiente ammesso: rosa → blu, come --brand-grad. */
const gradDef = (id, x1 = '0%', y1 = '0%', x2 = '100%', y2 = '0%') => `
  <linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
    <stop offset="0%" stop-color="${T.pink}"/>
    <stop offset="100%" stop-color="${T.blue}"/>
  </linearGradient>`;

/** La riga di luce che scorre: 7s, appena percettibile. */
const scanline = (w, h, dur = 7) => `
  <rect x="0" y="-140" width="${w}" height="140" fill="url(#scan)" opacity="0.9">
    <animate attributeName="y" values="${-140};${h}" dur="${dur}s" repeatCount="indefinite"/>
  </rect>`;

const scanDef = `
  <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="50%" stop-color="#ffffff" stop-opacity="0.035"/>
    <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>`;

/** Il cursore del terminale: blocco pieno che lampeggia. */
const caret = (x, y, w, h, fill = T.green, begin = '0s') => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" opacity="0">
    <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.01;0.5;0.51;1"
             dur="1.06s" begin="${begin}" repeatCount="indefinite"/>
  </rect>`;

/** Simbolo riusabile per un marchio di simple-icons. */
function symbolFor(key) {
  const i = ICONS[key];
  if (!i) throw new Error('icona mancante: ' + key);
  return `<symbol id="i-${key}" viewBox="0 0 24 24"><path d="${i.p}"/></symbol>`;
}

const write = (name, svg) => {
  mkdirSync(dirname(join(OUT, name)), { recursive: true });
  writeFileSync(join(OUT, name), svg.replace(/\n{3,}/g, '\n\n'), 'utf8');
  console.log('  ✓ assets/' + name);
};

/* ===============================================================
   1. HERO
   =============================================================== */
function hero() {
  const W = 1200,
    H = 424;

  const logoB64 = readFileSync(join(OUT, 'logo.png')).toString('base64');
  const LW = 300,
    LH = Math.round((261 / 560) * LW); // 140
  const LX = (W - LW) / 2,
    LY = 46;

  // Campo di particelle: deterministico, densita' bassa, alcune pulsano.
  const rand = rng(20260818);
  let dots = '';
  for (let i = 0; i < 110; i++) {
    const x = +(rand() * W).toFixed(1);
    const y = +(rand() * H).toFixed(1);
    const r = +(0.6 + rand() * 1.5).toFixed(2);
    const o = +(0.06 + rand() * 0.24).toFixed(3);
    const twinkle = rand() > 0.78;
    const col = rand() > 0.86 ? (rand() > 0.5 ? T.pink : T.blue) : '#ffffff';
    dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${o}">${
      twinkle
        ? `<animate attributeName="opacity" values="${o};${(o * 2.6).toFixed(3)};${o}" dur="${(
            2.6 +
            rand() * 3.4
          ).toFixed(2)}s" begin="${(rand() * 4).toFixed(2)}s" repeatCount="indefinite"/>`
        : ''
    }</circle>`;
  }

  const eyebrow = 'SOFTWARE HOUSE · AGENZIA DI COMUNICAZIONE · LATINA (LT)';
  const claim = 'Design e ingegneria nello stesso team.';

  // Il blocco di shell: monospaziato, quindi la larghezza si stima e la
  // battitura puo' partire dal punto giusto. Le due righe stanno dentro
  // una cornice centrata ma allineate a sinistra fra loro: una shell in
  // cui l'output e' centrato rispetto al comando non e' una shell.
  const FS = 15;
  const cmd = '$ whoami';
  const out = 'fymera srl · costruiamo il software che regge il lavoro vero';
  const cmdW = mw(cmd, FS),
    outW = mw(out, FS);
  const boxW = Math.round(outW + 56);
  const boxX = Math.round((W - boxW) / 2),
    boxY = 312,
    boxH = 66;
  const cmdX = boxX + 28,
    outX = boxX + 28;
  const CY1 = boxY + 26,
    CY2 = boxY + 50;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Fymera — software house e agenzia di comunicazione, Latina">
<defs>
  ${dotGrid('grid', 26, 1, 0.055)}
  ${gradDef('brand')}
  ${scanDef}
  <!-- I due aloni sono CONDIMENTO: il rosa diffuso su mezza tela e' il
       motivo per cui la maggior parte dei banner sembra un fondale di
       stock. Restano negli angoli, sotto il 12% di opacita'. -->
  <radialGradient id="glowPink" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${T.pink}" stop-opacity="0.115"/>
    <stop offset="100%" stop-color="${T.pink}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowBlue" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${T.blue}" stop-opacity="0.14"/>
    <stop offset="100%" stop-color="${T.blue}" stop-opacity="0"/>
  </radialGradient>
  <clipPath id="typ1"><rect x="${cmdX}" y="${CY1 - 16}" width="0" height="24">
    <animate attributeName="width" from="0" to="${cmdW + 4}" dur="0.42s" begin="0.35s" fill="freeze"/>
  </rect></clipPath>
  <clipPath id="typ2"><rect x="${outX}" y="${CY2 - 16}" width="0" height="24">
    <animate attributeName="width" from="0" to="${outW + 4}" dur="0.75s" begin="1.05s" fill="freeze"/>
  </rect></clipPath>
</defs>

  <rect width="${W}" height="${H}" fill="${T.s0}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <ellipse cx="120" cy="30" rx="430" ry="250" fill="url(#glowPink)"/>
  <ellipse cx="1120" cy="424" rx="470" ry="270" fill="url(#glowBlue)"/>
  <g>${dots}</g>

  <!-- L'anello: un solo tratteggio che ruota lentamente dietro al marchio. -->
  <circle cx="600" cy="116" r="232" fill="none" stroke="rgba(255,255,255,0.07)"
          stroke-width="1" stroke-dasharray="2 12">
    <animateTransform attributeName="transform" type="rotate" from="0 600 116" to="360 600 116"
                      dur="120s" repeatCount="indefinite"/>
  </circle>

  <!-- Le guide del contenitore: la stessa cornice tecnica del sito. -->
  <path d="M60,18 V${H - 18} M${W - 60},18 V${H - 18}" stroke="rgba(255,255,255,0.055)" stroke-width="1"/>
  <rect x="56" y="14" width="8" height="8" fill="rgba(255,255,255,0.13)"/>
  <rect x="${W - 64}" y="14" width="8" height="8" fill="rgba(255,255,255,0.13)"/>
  <rect x="56" y="${H - 22}" width="8" height="8" fill="rgba(255,255,255,0.13)"/>
  <rect x="${W - 64}" y="${H - 22}" width="8" height="8" fill="rgba(255,255,255,0.13)"/>

  ${brackets(W, H, 20, 28)}
  ${scanline(W, H)}

  <image x="${LX}" y="${LY}" width="${LW}" height="${LH}" href="data:image/png;base64,${logoB64}"/>

  <text x="${W / 2}" y="234" text-anchor="middle" font-family="${T.mono}" font-size="12"
        letter-spacing="3.1" fill="${T.faint}">${esc(eyebrow)}</text>

  <text x="${W / 2}" y="286" text-anchor="middle" font-family="${T.sans}" font-size="33"
        font-weight="600" letter-spacing="-0.6" fill="${T.strong}">${esc(claim.slice(0, -1))}<tspan fill="${T.pink}">.</tspan></text>

  <rect x="${boxX}.5" y="${boxY}.5" width="${boxW}" height="${boxH}" rx="12"
        fill="rgba(12,14,19,0.72)" stroke="${T.lineStrong}"/>
  <rect x="${boxX}" y="${boxY + 14}" width="2" height="${boxH - 28}" fill="${T.green}" opacity="0.8"/>

  <g clip-path="url(#typ1)" font-family="${T.mono}" font-size="${FS}">
    <text x="${cmdX}" y="${CY1}" fill="${T.green}">$<tspan fill="${T.strong}"> whoami</tspan></text>
  </g>
  <g clip-path="url(#typ2)" font-family="${T.mono}" font-size="${FS}">
    <text x="${outX}" y="${CY2}" fill="${T.muted}">${esc(out)}</text>
  </g>
  ${caret(outX + outW + 3, CY2 - 12, 8, 16, T.green, '1.85s')}

  <rect x="0" y="${H - 2}" width="${W}" height="2" fill="url(#brand)"/>
</svg>
`;
}

/* ===============================================================
   2. TERMINALE
   =============================================================== */
function terminal() {
  const W = 1200;
  const PAD = 16;
  const BAR = 44;
  const FS = 14.5;
  const LH = 27;
  const BX = PAD + 26; // colonna del testo

  /** kind: cmd | out | dim | ok | run | wait | blank */
  const L = [
    ['cmd', 'whoami'],
    ['out', 'fymera srl · software house e agenzia di comunicazione · latina (lt)'],
    ['blank', ''],
    ['cmd', 'cat ./principi.txt'],
    ['out', 'il codice è tuo: server, account e credenziali sono intestati a te'],
    ['out', 'il preventivo arriva dopo il prototipo, non prima'],
    ['out', 'a volte la risposta giusta è «non vi serve»'],
    ['blank', ''],
    ['cmd', 'ls ./competenze'],
    ['dim', 'gestionali/   portali-clienti/   app-mobile/   ai-automazioni/'],
    ['dim', 'siti-web/     brand-identity/    pentest/      foto-video-3d/'],
    ['blank', ''],
    ['cmd', 'systemctl status fymera'],
    ['ok', 'attivo — accettiamo progetti · lun–ven 10:00–20:00 · it en es de'],
  ];

  const bodyTop = PAD + BAR + 30;
  const H = bodyTop + L.length * LH + 26;

  let t = 0.3;
  const clips = [];
  const rows = [];
  let lastEnd = 0,
    lastX = 0,
    lastY = 0;

  L.forEach(([kind, txt], i) => {
    const y = bodyTop + i * LH;
    if (kind === 'blank') return;

    const prefix = kind === 'cmd' ? '$ ' : kind === 'ok' ? '● ' : '';
    const full = prefix + txt;
    const w = mw(full, FS) + 6;
    const id = `c${i}`;
    // I comandi si battono a mano (≈26ms/carattere); l'output di un
    // comando non si batte, compare — e comparire e' una dissolvenza corta.
    const dur = kind === 'cmd' ? Math.max(0.28, txt.length * 0.026) : 0.34;

    clips.push(
      `<clipPath id="${id}"><rect x="${BX}" y="${y - 18}" width="0" height="26">` +
        `<animate attributeName="width" from="0" to="${w}" dur="${dur.toFixed(2)}s" begin="${t.toFixed(
          2
        )}s" fill="freeze"/></rect></clipPath>`
    );

    let body;
    if (kind === 'cmd') {
      body = `<text x="${BX}" y="${y}" fill="${T.green}" style="filter:url(#g)">$<tspan fill="${T.strong}" style="filter:none"> ${esc(
        txt
      )}</tspan></text>`;
    } else if (kind === 'ok') {
      body = `<text x="${BX}" y="${y}" fill="${T.green}">●<tspan fill="${T.text}"> ${esc(txt)}</tspan></text>`;
    } else if (kind === 'dim') {
      body = `<text x="${BX}" y="${y}" fill="${T.muted}">${esc(txt)}</text>`;
    } else {
      body = `<text x="${BX}" y="${y}" fill="${T.text}">${esc(txt)}</text>`;
    }

    rows.push(`<g clip-path="url(#${id})" font-family="${T.mono}" font-size="${FS}">${body}</g>`);

    lastEnd = t + dur;
    lastX = BX + w;
    lastY = y;
    t = lastEnd + (kind === 'cmd' ? 0.24 : 0.12);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sessione di terminale: chi è Fymera, principi, competenze, stato">
<defs>
  ${dotGrid('grid', 24, 1, 0.035)}
  <filter id="g" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="2.2" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  ${clips.join('\n  ')}
</defs>
  <rect width="${W}" height="${H}" fill="${T.s0}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>

  <rect x="${PAD}.5" y="${PAD}.5" width="${W - PAD * 2 - 1}" height="${H - PAD * 2 - 1}" rx="12"
        fill="${T.s1}" stroke="${T.lineStrong}"/>
  <path d="M${PAD},${PAD + BAR} H${W - PAD}" stroke="${T.line}" stroke-width="1"/>
  <path d="M${PAD + 12},${PAD}.5 H${W - PAD - 12} A12,12 0 0 1 ${W - PAD}.5,${PAD + 12} V${PAD + BAR} H${PAD}
           V${PAD + 12} A12,12 0 0 1 ${PAD + 12},${PAD}.5 Z" fill="${T.s2}" stroke="none" opacity="0.9"/>

  <circle cx="${PAD + 24}" cy="${PAD + BAR / 2}" r="5" fill="rgba(239,68,68,0.55)"/>
  <circle cx="${PAD + 42}" cy="${PAD + BAR / 2}" r="5" fill="rgba(251,191,36,0.55)"/>
  <circle cx="${PAD + 60}" cy="${PAD + BAR / 2}" r="5" fill="rgba(34,197,94,0.55)"/>
  <text x="${W / 2}" y="${PAD + BAR / 2 + 4}" text-anchor="middle" font-family="${T.mono}"
        font-size="12" fill="${T.faint}">fymera@core — ~/</text>

  ${rows.join('\n  ')}
  ${caret(lastX + 2, lastY - 13, 8, 17, T.green, (lastEnd + 0.15).toFixed(2) + 's')}
</svg>
`;
}

/* ===============================================================
   3. METODO
   =============================================================== */
function metodo() {
  const W = 1200,
    H = 196;
  const steps = [
    ['discovery', 'completato', 'Guardiamo come lavorate davvero,', 'non come dovreste lavorare.'],
    ['prototipo', 'completato', 'Lo vedi funzionare prima di', 'finanziarlo per intero.'],
    ['sviluppo', 'in corso', 'Rilasci frequenti su ambiente di', 'prova. Niente scatole chiuse.'],
    ['rilascio', 'in coda', 'Server, account e credenziali', 'intestati a te.'],
  ];
  const x0 = 140,
    x1 = W - 140;
  const step = (x1 - x0) / (steps.length - 1);
  const cy = 58;
  const doneTo = x0 + step * 2; // la linea piena arriva al nodo "in corso"

  const nodes = steps
    .map(([nome, stato, d1, d2], i) => {
      const x = x0 + step * i;
      const done = stato === 'completato';
      const now = stato === 'in corso';
      const col = done || now ? T.green : T.faint;
      const ring = now
        ? `<circle cx="${x}" cy="${cy}" r="14" fill="none" stroke="${T.green}" stroke-width="1.5" opacity="0.9">
             <animate attributeName="r" values="14;26;26" keyTimes="0;0.7;1" dur="2.4s" repeatCount="indefinite"/>
             <animate attributeName="opacity" values="0.75;0;0" keyTimes="0;0.7;1" dur="2.4s" repeatCount="indefinite"/>
           </circle>`
        : '';
      const glyph = done
        ? `<path d="M${x - 5},${cy} l3.6,3.8 L${x + 5.6},${cy - 5}" fill="none" stroke="${T.s0}"
              stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`
        : now
        ? `<circle cx="${x}" cy="${cy}" r="4.4" fill="${T.s0}"/>`
        : '';
      const core = done
        ? `<circle cx="${x}" cy="${cy}" r="13" fill="${T.green}"/>`
        : now
        ? `<circle cx="${x}" cy="${cy}" r="13" fill="${T.green}"/>`
        : `<circle cx="${x}" cy="${cy}" r="13" fill="${T.s2}" stroke="${T.lineStrong}"/>`;

      return `<g>
    ${ring}${core}${glyph}
    <text x="${x}" y="${cy + 46}" text-anchor="middle" font-family="${T.mono}" font-size="12.5"
          letter-spacing="2.4" fill="${T.strong}">${nome.toUpperCase()}</text>
    <text x="${x}" y="${cy + 66}" text-anchor="middle" font-family="${T.mono}" font-size="10.5"
          letter-spacing="1.4" fill="${col}">[ ${esc(stato)} ]</text>
    <text x="${x}" y="${cy + 92}" text-anchor="middle" font-family="${T.sans}" font-size="12.5"
          fill="${T.muted}">${esc(d1)}</text>
    <text x="${x}" y="${cy + 109}" text-anchor="middle" font-family="${T.sans}" font-size="12.5"
          fill="${T.muted}">${esc(d2)}</text>
  </g>`;
    })
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Metodo: discovery completato, prototipo completato, sviluppo in corso, rilascio in coda">
<defs>
  ${dotGrid('grid', 24, 1, 0.035)}
  <linearGradient id="fill" gradientUnits="userSpaceOnUse" x1="${x0}" y1="0" x2="${doneTo}" y2="0">
    <stop offset="0%" stop-color="${T.green}" stop-opacity="0.5"/>
    <stop offset="100%" stop-color="${T.green}"/>
  </linearGradient>
</defs>
  <rect width="${W}" height="${H}" fill="${T.s0}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>

  <path d="M${x0},${cy} H${x1}" stroke="${T.line}" stroke-width="2" stroke-linecap="round"/>
  <path d="M${x0},${cy} H${doneTo}" stroke="url(#fill)" stroke-width="2.5" stroke-linecap="round"
        stroke-dasharray="${doneTo - x0}" stroke-dashoffset="${doneTo - x0}">
    <animate attributeName="stroke-dashoffset" from="${doneTo - x0}" to="0" dur="1.5s" begin="0.2s" fill="freeze"/>
  </path>

  ${nodes}
</svg>
`;
}

/* ===============================================================
   4. STACK — due nastri che scorrono in direzioni opposte
   =============================================================== */
function stack() {
  const W = 1200,
    H = 148;

  // [etichetta, chiave icona | null, colore]. Il colore e' quello del
  // marchio: e' l'appiglio che permette di riconoscerli mentre scorrono.
  const R1 = [
    ['TypeScript', 'typescript', '#3178c6'],
    ['React', 'react', '#61dafb'],
    ['Next.js', 'nextjs', '#e8e8e8'],
    ['Node.js', 'nodejs', '#5fa04e'],
    ['PostgreSQL', 'postgresql', '#4169e1'],
    ['Three.js', 'threejs', '#e8e8e8'],
    ['GSAP', 'gsap', '#0ae448'],
    ['Vite', 'vite', '#a35bff'],
    ['Tailwind', 'tailwind', '#38bdf8'],
    ['Laravel', 'laravel', '#ff2d20'],
    ['PHP 8.3', 'php', '#777bb4'],
    ['Python', 'python', '#3776ab'],
    ['Docker', 'docker', '#2496ed'],
    ['GraphQL', 'graphql', '#e10098'],
    ['Redis', 'redis', '#ff4438'],
  ];
  const R2 = [
    ['Swift', 'swift', '#f05138'],
    ['Kotlin', 'kotlin', '#a97bff'],
    ['Flutter', 'flutter', '#02569b'],
    ['WordPress', 'wordpress', '#3858e9'],
    ['WooCommerce', 'woocommerce', '#96588a'],
    ['Shopify', 'shopify', '#95bf47'],
    ['Stripe', 'stripe', '#635bff'],
    ['Anthropic', 'anthropic', '#d97757'],
    ['RAG', null, '#22c55e'],
    ['nginx', 'nginx', '#009639'],
    ['Linux', 'linux', '#fcc624'],
    ['Cloudflare', 'cloudflare', '#f38020'],
    ['Figma', 'figma', '#f24e1e'],
    ['Blender', 'blender', '#ea7600'],
    ['WebGL', 'webgl', '#e8e8e8'],
  ];

  const FS = 13;
  const ICO = 16;
  const PADX = 15;
  const GAP = 12;
  const CH = 36;

  const chipW = ([label, key]) => PADX * 2 + (key ? ICO + 9 : 0) + mw(label, FS);

  function row(items, y) {
    let x = 0;
    let out = '';
    for (const it of items) {
      const [label, key, col] = it;
      const w = chipW(it);
      out += `<g transform="translate(${x.toFixed(1)},0)">
      <rect x="0.5" y="${y}.5" width="${w.toFixed(1)}" height="${CH}" rx="${CH / 2}"
            fill="${T.s2}" stroke="${T.line}"/>
      ${key ? `<use href="#i-${key}" x="${PADX}" y="${y + (CH - ICO) / 2}" width="${ICO}" height="${ICO}" fill="${col}"/>` : ''}
      ${key ? '' : `<circle cx="${PADX + 4}" cy="${y + CH / 2}" r="3" fill="${col}"/>`}
      <text x="${PADX + (key ? ICO + 9 : 13)}" y="${y + CH / 2 + 4.6}" font-family="${T.mono}"
            font-size="${FS}" fill="${T.text}">${esc(label)}</text>
    </g>`;
      x += w + GAP;
    }
    return { markup: out, width: x };
  }

  const r1 = row(R1, 0);
  const r2 = row(R2, 0);

  const keys = [...new Set([...R1, ...R2].map((r) => r[1]).filter(Boolean))];

  const belt = (r, yTop, dir, dur) => `
  <g transform="translate(0,${yTop})">
    <g>
      <animateTransform attributeName="transform" type="translate"
        from="${dir < 0 ? 0 : -r.width}" to="${dir < 0 ? -r.width : 0}" dur="${dur}s" repeatCount="indefinite"/>
      <g>${r.markup}</g>
      <g transform="translate(${r.width},0)">${r.markup}</g>
    </g>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stack tecnologico Fymera">
<defs>
  ${keys.map(symbolFor).join('\n  ')}
  ${dotGrid('grid', 24, 1, 0.035)}
  <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#000"/>
    <stop offset="7%" stop-color="#fff"/>
    <stop offset="93%" stop-color="#fff"/>
    <stop offset="100%" stop-color="#000"/>
  </linearGradient>
  <mask id="edge"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
</defs>
  <rect width="${W}" height="${H}" fill="${T.s0}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <g mask="url(#edge)">
    ${belt(r1, 26, -1, 42)}
    ${belt(r2, 84, 1, 48)}
  </g>
</svg>
`;
}

/* ===============================================================
   5. SCHEDE SERVIZIO — cliccabili, una per pagina del sito
   =============================================================== */
const SERVIZI = [
  {
    slug: 'web-app-piattaforme',
    acc: '#ff2d8f',
    t: 'Gestionali, Web App e Portali',
    d: ['Il software che regge il lavoro dentro e il portale', 'con cui il cliente lo vede da fuori.'],
    s: ['TypeScript', 'Node.js', 'PostgreSQL', 'Stripe'],
  },
  {
    slug: 'app-mobile',
    acc: '#f5399f',
    t: 'App Mobile',
    d: ['Native e cross-platform per iOS e Android, dal', 'product design alla pubblicazione sugli store.'],
    s: ['Swift', 'Kotlin', 'React Native'],
  },
  {
    slug: 'ai-automazioni',
    acc: '#d84cc4',
    t: 'AI e Automazioni',
    d: ['Assistenti e automazioni dentro i sistemi che usi', 'già, con un punto di controllo umano.'],
    s: ['OpenAI', 'RAG', 'Webhook', 'Queue'],
  },
  {
    slug: 'siti-web',
    acc: '#9b5fef',
    t: 'Siti Web',
    d: ['Veloci per architettura, non per plugin installati', 'dopo. Core Web Vitals dalla prima riga.'],
    s: ['Vite', 'SSR', 'Edge cache', 'Schema.org'],
  },
  {
    slug: 'brand-identity',
    acc: '#7a68f5',
    t: 'Brand Identity',
    d: ['Marchio, colori e tipografia in un sistema che il', 'tuo team sa applicare da solo.'],
    s: ['Design system', 'Token', 'Manuale'],
  },
  {
    slug: 'marketing-comunicazione',
    acc: '#586ffa',
    t: 'Marketing e Comunicazione',
    d: ['Il tracciamento prima della spesa: sai quali', 'contatti arrivano e quanto costa ognuno.'],
    s: ['GA4', 'Server-side', 'SEO', 'Ads'],
  },
  {
    slug: 'cybersecurity',
    acc: '#2f8fff',
    t: 'Cybersecurity e Pentest',
    d: ['Proviamo a entrare noi, prima che ci provi qualcun', 'altro. Poi ti diciamo come chiudere le porte.'],
    s: ['OWASP', 'Burp Suite', 'Nmap', 'Metasploit'],
  },
  {
    slug: 'foto-video',
    acc: '#3e6aff',
    t: 'Foto, Video e 3D',
    d: ['Contenuti consegnati già ottimizzati per il peso e', 'i formati del tuo sito.'],
    s: ['Foto', 'Video', 'Drone', '3D'],
  },
];

function card(srv, idx) {
  const W = 470,
    H = 172;
  const PX = 26;
  const n = String(idx + 1).padStart(2, '0');

  // Pastiglie dello stack: mono, quindi la larghezza si calcola.
  const FS = 11;
  let tx = PX;
  const tags = srv.s
    .map((s) => {
      const w = mw(s, FS) + 20;
      const g = `<g transform="translate(${tx.toFixed(1)},0)">
      <rect x="0.5" y="${H - 42}.5" width="${w.toFixed(1)}" height="23" rx="11.5" fill="${T.s2}" stroke="${T.line}"/>
      <text x="${w / 2}" y="${H - 42 + 15.5}" text-anchor="middle" font-family="${T.mono}" font-size="${FS}"
            fill="${T.muted}">${esc(s)}</text>
    </g>`;
      tx += w + 8;
      return g;
    })
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(
    srv.t
  )}">
<defs>
  ${dotGrid('grid', 22, 1, 0.03)}
  <linearGradient id="acc" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${srv.acc}" stop-opacity="0.085"/>
    <stop offset="42%" stop-color="${srv.acc}" stop-opacity="0"/>
  </linearGradient>
  <filter id="soft" x="-100%" y="-100%" width="300%" height="300%">
    <feGaussianBlur stdDeviation="6"/>
  </filter>
</defs>
  <!-- Nessuna animazione d'ingresso: una scheda che parte da opacity 0 e
       si accende con un'animazione e' una scheda che, se per qualsiasi
       motivo l'animazione non parte (anteprima social, lettore che non
       esegue SMIL, screenshot), resta invisibile. Il rischio non vale
       mezzo secondo di dissolvenza. -->
  <g>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${T.s1}" stroke="${T.line}"/>
    <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="13" fill="url(#grid)"/>
    <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="13" fill="url(#acc)"/>

    <rect x="0" y="16" width="13" height="${H - 32}" fill="${srv.acc}" opacity="0.55" filter="url(#soft)"/>
    <rect x="0" y="16" width="3" height="${H - 32}" fill="${srv.acc}"/>

    <text x="${PX}" y="36" font-family="${T.mono}" font-size="11" letter-spacing="1.6"
          fill="${T.faint}">// ${n}</text>
    <text x="${W - PX}" y="37" text-anchor="end" font-family="${T.mono}" font-size="16"
          fill="${srv.acc}">→</text>

    <text x="${PX}" y="70" font-family="${T.sans}" font-size="19.5" font-weight="600"
          letter-spacing="-0.3" fill="${T.strong}">${esc(srv.t)}</text>

    <text x="${PX}" y="98" font-family="${T.sans}" font-size="13" fill="${T.muted}">${esc(srv.d[0])}</text>
    <text x="${PX}" y="116" font-family="${T.sans}" font-size="13" fill="${T.muted}">${esc(srv.d[1])}</text>

    ${tags}
  </g>
</svg>
`;
}

/* ===============================================================
   6. BOTTONI — la forma tagliata del sito
   =============================================================== */
function pill(text, { primary = true, w = 400, h = 60 } = {}) {
  /* Il canvas e' piu' grande della forma: l'alone del bottone principale
     deve avere spazio dove sfumare, altrimenti il filtro viene tagliato
     dal bordo dell'SVG e si vede un rettangolo netto attorno alla luce. */
  const PX = 12,
    PT = 8,
    PB = 20;
  const CW = w + PX * 2,
    CH = h + PT + PB;
  const CUT = 14;
  const FS = 15.5;
  const pts = cutShape(PX, PT, w, h, CUT);
  const cx = PX + w / 2,
    cy = PT + h / 2;

  if (!primary) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="${esc(
      text
    )}">
  <polygon points="${pts}" fill="${T.s1}" stroke="${T.lineStrong}" stroke-width="1"/>
  <text x="${cx}" y="${cy + 5.4}" text-anchor="middle" font-family="${T.sans}" font-size="${FS}"
        font-weight="600" fill="${T.strong}">${esc(text)}</text>
</svg>
`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="${esc(
    text
  )}">
<defs>
  ${gradDef('brand')}
  <clipPath id="cut"><polygon points="${pts}"/></clipPath>
  <filter id="halo" x="-40%" y="-60%" width="180%" height="240%"><feGaussianBlur stdDeviation="9"/></filter>
  <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
    <stop offset="50%" stop-color="#fff" stop-opacity="0.4"/>
    <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
</defs>
  <polygon points="${cutShape(PX + 6, PT + 10, w - 12, h - 8, CUT)}" fill="url(#brand)"
           opacity="0.5" filter="url(#halo)"/>
  <g clip-path="url(#cut)">
    <polygon points="${pts}" fill="url(#brand)"/>
    <rect x="${-140}" y="${PT}" width="120" height="${h}" fill="url(#sheen)">
      <animate attributeName="x" values="${-140};${CW + 30}" dur="3.6s" begin="1s" repeatCount="indefinite"/>
    </rect>
  </g>
  <text x="${cx}" y="${cy + 5.4}" text-anchor="middle" font-family="${T.sans}" font-size="${FS}"
        font-weight="600" fill="#ffffff">${esc(text)}</text>
</svg>
`;
}

/* ===============================================================
   7. SOCIAL — un bottone per profilo, cliccabile
   =============================================================== */
const LINKEDIN_PATH =
  'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z';

const SOCIAL = [
  { slug: 'instagram', key: 'instagram', hex: '#ff0069', label: 'Instagram' },
  { slug: 'linkedin', key: null, hex: '#0a66c2', label: 'LinkedIn', path: LINKEDIN_PATH },
  { slug: 'tiktok', key: 'tiktok', hex: '#ee1d52', label: 'TikTok' },
  { slug: 'facebook', key: 'facebook', hex: '#0866ff', label: 'Facebook' },
  { slug: 'github', key: 'github', hex: '#f0f0f0', label: 'GitHub' },
];

function socialBtn(s) {
  const S = 50,
    I = 21;
  const d = s.path ?? ICONS[s.key].p;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" role="img" aria-label="${esc(
    s.label
  )}">
<defs>
  <filter id="gl" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>
</defs>
  <circle cx="${S / 2}" cy="${S / 2}" r="${S / 2 - 6}" fill="${s.hex}" opacity="0.22" filter="url(#gl)"/>
  <rect x="0.5" y="0.5" width="${S - 1}" height="${S - 1}" rx="14" fill="${T.s1}" stroke="${T.lineStrong}"/>
  <g transform="translate(${(S - I) / 2},${(S - I) / 2}) scale(${I / 24})">
    <path d="${d}" fill="${s.hex}"/>
  </g>
</svg>
`;
}

/* ===============================================================
   8. PIEDE
   =============================================================== */
function footer() {
  const W = 1200,
    H = 150;
  const FS = 13;
  const cmd = '$ exit';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Fymera Srl — Corso Giacomo Matteotti 149, 04100 Latina (LT) — contatti@fymera.it">
<defs>
  ${dotGrid('grid', 24, 1, 0.035)}
  ${gradDef('brand')}
  ${scanDef}
  <radialGradient id="gp" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${T.blue}" stop-opacity="0.16"/>
    <stop offset="100%" stop-color="${T.blue}" stop-opacity="0"/>
  </radialGradient>
</defs>
  <rect width="${W}" height="${H}" fill="${T.s0}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <ellipse cx="600" cy="0" rx="640" ry="150" fill="url(#gp)"/>
  <rect x="0" y="0" width="${W}" height="2" fill="url(#brand)"/>

  <text x="60" y="58" font-family="${T.mono}" font-size="${FS}" fill="${T.green}">$<tspan fill="${T.text}"> exit</tspan></text>
  ${caret(60 + mw(cmd, FS) + 3, 45, 8, 16, T.green, '0s')}

  <text x="60" y="94" font-family="${T.mono}" font-size="12.5" fill="${T.muted}">Fymera Srl · P. IVA 03333300592 · Corso Giacomo Matteotti 149 · 04100 Latina (LT) · Italia</text>
  <text x="60" y="116" font-family="${T.mono}" font-size="12.5" fill="${T.muted}">contatti@fymera.it · +39 353 484 6396 · lun–ven 10:00–20:00</text>

  <text x="${W - 60}" y="94" text-anchor="end" font-family="${T.mono}" font-size="12.5"
        letter-spacing="2.6" fill="${T.faint}">FYMERA.IT</text>
  <text x="${W - 60}" y="116" text-anchor="end" font-family="${T.mono}" font-size="12.5"
        fill="${T.faint}">it · en · es · de</text>

  ${brackets(W, H, 22, 24, T.line)}
</svg>
`;
}

/* =============================================================== */
console.log('build assets →');
mkdirSync(join(OUT, 'servizi'), { recursive: true });
write('hero.svg', hero());
write('terminal.svg', terminal());
write('metodo.svg', metodo());
write('stack.svg', stack());
write('footer.svg', footer());
write('cta-call.svg', pill('Prenota una call', { primary: true, w: 300 }));
write('cta-site.svg', pill('fymera.it', { primary: false, w: 220 }));
SERVIZI.forEach((s, i) => write(`servizi/${s.slug}.svg`, card(s, i)));
SOCIAL.forEach((s) => write(`soc-${s.slug}.svg`, socialBtn(s)));
console.log('fatto.');
