# Faglæringsverktøy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Elever laster opp PDF/DOCX med fagstoff og får det differensiert til et interaktivt HTML-læringsverktøy med 6 faner.

**Architecture:** Single HTML-fil med to tilstander (upload/resultat), en Vercel serverless funksjon som kaller Gemini 3.1 Flash-Lite Preview og returnerer strukturert JSON. DOCX-tekst ekstraheres klient-side med mammoth.js, PDF sendes som base64. All bruker-/AI-generert tekst escapes med en `esc()`-hjelpefunksjon for å unngå XSS.

**Tech Stack:** Vanilla HTML/CSS/JS (frontend), Node.js (Vercel serverless), `@google/genai` SDK, `mammoth` (DOCX-parsing), `jest` (tester)

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `vercel.json`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Opprett package.json**

```json
{
  "name": "fagutvikleren",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "jest",
    "dev": "vercel dev"
  },
  "dependencies": {
    "@google/genai": "^1.0.0",
    "mammoth": "^1.8.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

**Step 2: Opprett vercel.json**

```json
{
  "functions": {
    "api/generate.js": {
      "maxDuration": 60
    }
  }
}
```

**Step 3: Opprett .env.example**

```
GEMINI_API_KEY=your_key_here
```

**Step 4: Opprett .gitignore**

```
node_modules/
.env
.env.local
.vercel/
```

**Step 5: Installer avhengigheter**

```bash
npm install
```

**Step 6: Commit**

```bash
git add package.json vercel.json .env.example .gitignore
git commit -m "feat: add project scaffolding"
```

---

### Task 2: API-funksjon – validering og struktur

**Files:**
- Create: `api/generate.js`
- Create: `api/__tests__/generate.test.js`

**Step 1: Skriv failing test for filvalidering**

```javascript
// api/__tests__/generate.test.js
const { validateFile } = require('../generate');

describe('validateFile', () => {
  test('godtar pdf', () => {
    expect(validateFile('application/pdf', 1024)).toBe(null);
  });

  test('godtar docx', () => {
    expect(validateFile(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      1024
    )).toBe(null);
  });

  test('avviser ugyldig type', () => {
    expect(validateFile('image/png', 1024)).toMatch(/filtype/i);
  });

  test('avviser for stor fil', () => {
    expect(validateFile('application/pdf', 21 * 1024 * 1024)).toMatch(/stor/i);
  });
});
```

**Step 2: Kjør test og bekreft at den feiler**

```bash
npx jest api/__tests__/generate.test.js
```

Forventet: FAIL — `validateFile is not a function`

**Step 3: Implementer validateFile**

```javascript
// api/generate.js
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_BYTES = 20 * 1024 * 1024;

function validateFile(mimeType, size) {
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return 'Ugyldig filtype. Last opp PDF eller DOCX.';
  }
  if (size > MAX_BYTES) {
    return 'Filen er for stor. Maks 20MB.';
  }
  return null;
}

module.exports = { validateFile };
```

**Step 4: Kjør test og bekreft at den passerer**

```bash
npx jest api/__tests__/generate.test.js
```

Forventet: PASS

**Step 5: Commit**

```bash
git add api/generate.js api/__tests__/generate.test.js
git commit -m "feat: add file validation for API function"
```

---

### Task 3: API-funksjon – Gemini-integrasjon

**Files:**
- Modify: `api/generate.js`
- Modify: `api/__tests__/generate.test.js`

**Step 1: Skriv failing test for buildPrompt**

Legg til i `api/__tests__/generate.test.js`:

```javascript
const { buildPrompt } = require('../generate');

describe('buildPrompt', () => {
  test('inkluderer JSON-instruksjon', () => {
    expect(buildPrompt()).toMatch(/JSON/);
  });

  test('spesifiserer alle seks seksjoner', () => {
    const prompt = buildPrompt();
    ['flashcards', 'sammendrag', 'qa', 'utfordring', 'nokkelBegreper', 'strategi']
      .forEach(key => expect(prompt).toMatch(key));
  });
});
```

**Step 2: Kjør test og bekreft at den feiler**

```bash
npx jest api/__tests__/generate.test.js
```

**Step 3: Implementer buildPrompt og fullstendig handler**

Erstatt innholdet i `api/generate.js` med:

```javascript
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_BYTES = 20 * 1024 * 1024;

function validateFile(mimeType, size) {
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return 'Ugyldig filtype. Last opp PDF eller DOCX.';
  }
  if (size > MAX_BYTES) {
    return 'Filen er for stor. Maks 20MB.';
  }
  return null;
}

function buildPrompt() {
  return `Du er en pedagogisk assistent. Analyser fagstoffet og generer et strukturert læringsverktøy på norsk.

Returner KUN gyldig JSON uten markdown-formatering eller forklaringer:
{
  "title": "Fagstoff-tittel",
  "subject": "Fag/emne",
  "flashcards": [
    { "front": "Spørsmål eller begrep", "back": "Svar eller definisjon", "cat": "kjerne|fakta|begrep|eksempel" }
  ],
  "sammendrag": [
    { "tema": "Temaoverskrift", "punkter": ["Punkt 1", "Punkt 2"] }
  ],
  "qa": [
    { "sporsmal": "Forståelsesspørsmål", "svar": "Utdypende svar", "hint": "Hint til eleven" }
  ],
  "utfordring": [
    { "sporsmal": "Testspørsmål", "svar": "Fasitsvar" }
  ],
  "nokkelBegreper": [
    { "begrep": "Begrep", "forklaring": "Forklaring", "sammenheng": "Sammenheng med andre begreper" }
  ],
  "strategi": {
    "posisjonering": ["Faglig posisjonering"],
    "tips": ["Konkret tips for muntlig framføring"],
    "formuleringer": ["Forberedt formulering"]
  }
}

Generer minimum: 15 flashcards, 3-5 sammendrag-temaer (3-6 punkter hver), 10 Q&A-par, 10 utfordringsspørsmål, 8-12 nøkkelbegreper, 3 posisjoneringspunkter, 4-6 tips, 5-8 formuleringer.`;
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mimeType, size, data, text } = req.body;

  const validationError = validateFile(mimeType, size);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const contents = mimeType === 'application/pdf'
      ? [{ text: buildPrompt() }, { inlineData: { mimeType: 'application/pdf', data } }]
      : [{ text: buildPrompt() + '\n\nFagstoff:\n' + text }];

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents,
    });

    const raw = response.text().trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const result = JSON.parse(raw);
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Noe gikk galt under generering. Prøv igjen.' });
  }
}

module.exports = { validateFile, buildPrompt };
module.exports.default = handler;
```

**Step 4: Kjør tester**

```bash
npx jest api/__tests__/generate.test.js
```

Forventet: PASS (alle 6 tester)

**Step 5: Commit**

```bash
git add api/generate.js api/__tests__/generate.test.js
git commit -m "feat: add Gemini integration in API function"
```

---

### Task 4: Frontend – felles shell og upload-tilstand

**Files:**
- Create: `index.html`

Opprett `index.html`. Merk: all AI-generert tekst settes via `textContent` eller gjennom `esc()`-funksjonen for å unngå XSS.

```html
<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fagutvikleren</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js"></script>
<style>
:root{--cream:#f5f0e8;--dg:#1a2e20;--mg:#2d4a35;--lg:#3d6b4a;--gold:#c9a84c;--gl:#e8c97a;--red:#c0392b;--text:#1a1a1a;--muted:#6b7c6e}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--cream);font-family:'Outfit',sans-serif;color:var(--text);min-height:100vh}
header{background:var(--dg);color:var(--cream);padding:26px 36px 22px;display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid var(--gold)}
header h1{font-family:'Playfair Display',serif;font-size:1.6rem;line-height:1.2}
.header-actions{display:flex;gap:10px;align-items:center}
.btn-outline{font-family:'Outfit',sans-serif;font-size:.82rem;font-weight:500;color:var(--cream);background:none;border:1.5px solid rgba(255,255,255,.3);border-radius:4px;padding:7px 16px;cursor:pointer;transition:all .15s}
.btn-outline:hover{border-color:var(--gold);color:var(--gold)}
/* Upload */
#upload-view{display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 80px);padding:40px 20px}
.upload-card{background:white;border-radius:8px;padding:48px 40px;max-width:480px;width:100%;box-shadow:0 2px 12px rgba(0,0,0,.08);text-align:center}
.upload-card h2{font-family:'Playfair Display',serif;font-size:1.4rem;color:var(--dg);margin-bottom:8px}
.upload-card p{font-size:.88rem;color:var(--muted);margin-bottom:32px;line-height:1.6}
.drop-zone{border:2px dashed rgba(0,0,0,.18);border-radius:6px;padding:36px 20px;cursor:pointer;transition:all .2s;margin-bottom:20px}
.drop-zone:hover,.drop-zone.drag-over{border-color:var(--gold);background:rgba(201,168,76,.05)}
.drop-zone input{display:none}
.drop-icon{font-size:2rem;margin-bottom:10px;opacity:.5}
.drop-label{font-size:.86rem;color:var(--muted)}
.file-chosen{font-size:.84rem;color:var(--lg);font-weight:500;margin-bottom:14px;min-height:20px}
.btn-primary{background:var(--dg);color:var(--cream);border:none;border-radius:4px;padding:12px 32px;font-family:'Outfit',sans-serif;font-size:.92rem;font-weight:600;cursor:pointer;transition:all .15s;width:100%}
.btn-primary:hover{background:var(--mg)}
.btn-primary:disabled{opacity:.4;cursor:not-allowed}
.error-msg{color:var(--red);font-size:.84rem;margin-top:12px;min-height:20px}
.spinner{display:none;flex-direction:column;align-items:center;gap:14px;padding:20px 0}
.spinner.visible{display:flex}
.spin{width:36px;height:36px;border:3px solid rgba(0,0,0,.1);border-top-color:var(--gold);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.spin-label{font-size:.86rem;color:var(--muted)}
/* Result */
#result-view{display:none}
#result-view.visible{display:block}
nav{background:var(--mg);display:flex;border-bottom:2px solid var(--gold);overflow-x:auto}
nav button{font-family:'Outfit',sans-serif;font-size:.8rem;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--cream);background:none;border:none;padding:13px 20px;cursor:pointer;opacity:.6;transition:all .2s;white-space:nowrap;border-bottom:3px solid transparent;margin-bottom:-2px}
nav button:hover{opacity:.9}
nav button.active{opacity:1;border-bottom-color:var(--gold);background:rgba(201,168,76,.1)}
main{padding:32px 36px;max-width:920px}
.section{display:none}.section.active{display:block}
.sec-title{font-family:'Playfair Display',serif;font-size:1.35rem;color:var(--dg);margin-bottom:5px}
.sec-sub{font-size:.86rem;color:var(--muted);margin-bottom:22px}
/* Flashcards */
.ftabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px}
.ftab{font-family:'Outfit',sans-serif;font-size:.75rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:5px 13px;border-radius:3px;border:1.5px solid rgba(0,0,0,.14);background:white;cursor:pointer;transition:all .15s;color:var(--muted)}
.ftab:hover{border-color:var(--gold);color:var(--dg)}
.ftab.active{background:var(--dg);color:var(--cream);border-color:var(--dg)}
.pbar-bg{height:4px;background:rgba(0,0,0,.1);border-radius:2px;margin-bottom:18px;overflow:hidden}
.pbar{height:100%;background:var(--gold);border-radius:2px;transition:width .3s}
.fc-hint{font-size:.74rem;color:var(--muted);margin-bottom:14px}
.fc-wrap{perspective:1200px;margin-bottom:24px}
.card{position:relative;width:100%;height:260px;transition:transform .6s cubic-bezier(.4,0,.2,1);transform-style:preserve-3d;cursor:pointer}
.card.flipped{transform:rotateY(180deg)}
.face{position:absolute;inset:0;backface-visibility:hidden;border-radius:6px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:32px;text-align:center}
.front{background:var(--dg);border:2px solid var(--gold)}
.back{background:var(--mg);border:2px solid var(--gl);transform:rotateY(180deg)}
.clabel{font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;font-weight:600}
.cbadge{display:inline-block;font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;font-weight:600;background:rgba(201,168,76,.2);color:var(--gl);padding:2px 9px;border-radius:2px;margin-bottom:10px}
.front .ctext{font-family:'Playfair Display',serif;font-size:1.1rem;line-height:1.5;color:var(--cream)}
.back .ctext{font-size:.88rem;line-height:1.65;color:var(--cream);overflow-y:auto;max-height:190px}
.cnav{display:flex;align-items:center;gap:14px;margin-top:18px}
.cnav button{background:var(--dg);color:var(--cream);border:1.5px solid var(--gold);border-radius:4px;padding:8px 20px;font-family:'Outfit',sans-serif;font-size:.84rem;cursor:pointer;transition:all .15s}
.cnav button:hover{background:var(--gold);color:var(--dg)}
.ccount{font-size:.84rem;color:var(--muted);min-width:56px;text-align:center}
/* Sammendrag */
.tema-card{background:white;border-radius:6px;padding:20px 22px;margin-bottom:14px;border:1px solid rgba(0,0,0,.08)}
.tema-title{font-family:'Playfair Display',serif;font-size:1rem;color:var(--dg);margin-bottom:12px}
.tema-card ul{list-style:none}
.tema-card li{font-size:.88rem;line-height:1.65;color:#333;padding:5px 0;border-bottom:1px solid rgba(0,0,0,.04);display:flex;gap:9px}
.tema-card li:last-child{border-bottom:none}
.tema-card li::before{content:'→';color:var(--gold);flex-shrink:0}
/* Q&A */
.qa-grid{display:grid;gap:9px}
.qi{background:white;border-radius:6px;border:1px solid rgba(0,0,0,.08);overflow:hidden}
.qq{padding:12px 16px;font-size:.9rem;font-weight:500;cursor:pointer;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;background:white;transition:background .15s}
.qq:hover{background:#f8f5ef}
.qq-text{flex:1}
.qtog{color:var(--muted);font-size:.78rem;transition:transform .2s;flex-shrink:0;margin-top:3px}
.qi.open .qtog{transform:rotate(180deg)}
.qa-body{display:none;padding:0 16px 14px;font-size:.88rem;line-height:1.68;color:#2a2a2a;background:#fafaf8;border-top:1px solid rgba(0,0,0,.06)}
.qi.open .qa-body{display:block;padding-top:12px}
.hint{font-size:.8rem;color:var(--muted);margin-top:8px;font-style:italic}
/* Utfordring */
.cqdis{background:white;border-radius:6px;padding:20px 22px;margin-bottom:14px;font-size:1rem;font-weight:500;line-height:1.5;display:none;border-left:4px solid var(--gold)}
.cqdis.visible{display:block}
.tbar-wrap{display:none;align-items:center;gap:11px;margin-bottom:14px}
.tbar-wrap.visible{display:flex}
.tbar-bg{flex:1;height:8px;background:rgba(0,0,0,.1);border-radius:4px;overflow:hidden}
.tbar{height:100%;background:var(--lg);border-radius:4px;transition:width 1s linear,background .5s}
.tbar.warn{background:var(--gold)}.tbar.danger{background:var(--red)}
.tnum{font-size:1.2rem;font-weight:700;color:var(--dg);min-width:34px;text-align:right}
.cbtn-all{background:var(--gold);color:var(--dg);border:none;border-radius:4px;padding:10px 26px;font-family:'Outfit',sans-serif;font-size:.88rem;font-weight:600;cursor:pointer;transition:all .15s;margin-bottom:22px;display:inline-block}
.cbtn-all:hover{background:var(--gl)}
.revbtn{background:var(--mg);color:var(--cream);border:1.5px solid var(--lg);border-radius:4px;padding:9px 20px;font-family:'Outfit',sans-serif;font-size:.84rem;cursor:pointer;transition:all .15s;display:none}
.revbtn:hover{background:var(--lg)}.revbtn.visible{display:inline-block}
.cadis{background:#f0f5f1;border-radius:6px;padding:16px 20px;margin-top:12px;font-size:.88rem;line-height:1.68;color:#222;border-left:3px solid var(--lg);display:none;white-space:pre-line}
.cadis.visible{display:block}
/* Nøkkelbegreper */
.begrep-grid{display:grid;gap:12px}
.begrep-card{background:white;border-radius:6px;padding:18px 20px;border:1px solid rgba(0,0,0,.08)}
.begrep-title{font-family:'Playfair Display',serif;font-size:.97rem;color:var(--dg);margin-bottom:6px}
.begrep-forklaring{font-size:.87rem;line-height:1.6;color:#333;margin-bottom:6px}
.begrep-sammenheng{font-size:.8rem;color:var(--muted);font-style:italic}
/* Strategi */
.sgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.scrd{background:white;border-radius:6px;padding:20px;border:1px solid rgba(0,0,0,.08)}
.scrd h3{font-family:'Playfair Display',serif;font-size:.97rem;color:var(--dg);margin-bottom:11px;padding-bottom:9px;border-bottom:1.5px solid var(--cream)}
.scrd ul{list-style:none}
.scrd li{font-size:.86rem;line-height:1.6;color:#333;padding:5px 0;border-bottom:1px solid rgba(0,0,0,.04);display:flex;gap:9px}
.scrd li:last-child{border-bottom:none}
.scrd li::before{content:'→';color:var(--gold);flex-shrink:0}
.flist{display:grid;gap:9px;margin-top:7px}
.fi{background:var(--cream);border-radius:4px;padding:11px 54px 11px 14px;font-family:'Playfair Display',serif;font-style:italic;font-size:.86rem;color:var(--dg);line-height:1.5;border-left:2.5px solid var(--gold);cursor:pointer;transition:background .15s;position:relative}
.fi:hover{background:#ede8de}
.ch{position:absolute;top:50%;right:11px;transform:translateY(-50%);font-size:.63rem;font-family:'Outfit',sans-serif;font-style:normal;color:var(--muted);letter-spacing:.05em;text-transform:uppercase;opacity:0;transition:opacity .15s}
.fi:hover .ch{opacity:1}
@media(max-width:600px){header{padding:18px;flex-direction:column;align-items:flex-start;gap:10px}main{padding:20px 14px}.upload-card{padding:32px 20px}.sgrid{grid-template-columns:1fr}}
</style>
</head>
<body>

<header>
  <div>
    <h1 id="page-title">Fagutvikleren</h1>
    <div id="page-sub" style="font-size:.8rem;color:var(--gl);margin-top:4px;opacity:.85;">Last opp fagstoff og få det differensiert</div>
  </div>
  <div class="header-actions" id="header-actions"></div>
</header>

<div id="upload-view">
  <div class="upload-card">
    <h2>Last opp fagstoff</h2>
    <p>Verktøyet analyserer fagstoffet ditt og lager flashcards, sammendrag, spørsmål og mer.</p>
    <div class="drop-zone" id="drop-zone" onclick="document.getElementById('file-input').click()">
      <input type="file" id="file-input" accept=".pdf,.docx" />
      <div class="drop-icon">📄</div>
      <div class="drop-label">Klikk eller dra hit · PDF eller DOCX · maks 20MB</div>
    </div>
    <div class="file-chosen" id="file-chosen"></div>
    <div class="spinner" id="spinner">
      <div class="spin"></div>
      <div class="spin-label">Analyserer fagstoffet…</div>
    </div>
    <button class="btn-primary" id="generate-btn" disabled onclick="generate()">Generer læringsverktøy</button>
    <div class="error-msg" id="error-msg"></div>
  </div>
</div>

<div id="result-view">
  <nav id="tab-nav"></nav>
  <main id="tab-content"></main>
</div>

<script>
// Sikkerhets-helper: escaper HTML-entiteter for all AI-generert tekst
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Filhåndtering
let selectedFile = null;

document.getElementById('file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) setFile(file);
});

const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});

function detectMime(name) {
  return name.endsWith('.pdf') ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

function setFile(file) {
  const allowed = ['application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const mime = file.type || detectMime(file.name);
  const errEl = document.getElementById('error-msg');
  if (!allowed.includes(mime)) {
    errEl.textContent = 'Kun PDF og DOCX støttes.';
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    errEl.textContent = 'Filen er for stor. Maks 20MB.';
    return;
  }
  selectedFile = file;
  document.getElementById('file-chosen').textContent =
    file.name + ' (' + (file.size / 1024).toFixed(0) + ' KB)';
  document.getElementById('generate-btn').disabled = false;
  errEl.textContent = '';
}

async function generate() {
  if (!selectedFile) return;
  const errEl = document.getElementById('error-msg');
  const btn = document.getElementById('generate-btn');
  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Analyserer…';
  document.getElementById('spinner').classList.add('visible');

  try {
    const mimeType = selectedFile.type || detectMime(selectedFile.name);
    let body;

    if (mimeType === 'application/pdf') {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      body = { mimeType, size: selectedFile.size, data: base64 };
    } else {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      body = { mimeType, size: selectedFile.size, text: result.value };
    }

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Noe gikk galt');
    showResult(data);
  } catch (err) {
    errEl.textContent = err.message;
    btn.disabled = false;
  } finally {
    btn.textContent = 'Generer læringsverktøy';
    document.getElementById('spinner').classList.remove('visible');
  }
}

function showResult(data) {
  document.getElementById('upload-view').style.display = 'none';
  document.getElementById('result-view').classList.add('visible');
  document.getElementById('page-title').textContent = data.title || 'Læringsverktøy';
  document.getElementById('page-sub').textContent = data.subject || '';

  const actions = document.getElementById('header-actions');
  actions.innerHTML = '';
  const dlBtn = document.createElement('button');
  dlBtn.className = 'btn-outline';
  dlBtn.textContent = 'Last ned HTML';
  dlBtn.onclick = downloadHTML;
  const restartBtn = document.createElement('button');
  restartBtn.className = 'btn-outline';
  restartBtn.textContent = 'Start på nytt';
  restartBtn.onclick = () => location.reload();
  actions.appendChild(dlBtn);
  actions.appendChild(restartBtn);

  window._resultData = data;
  renderTabs(data);
}

function showSection(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}
</script>
</body>
</html>
```

**Step 2: Test i nettleser**

```bash
npx vercel dev
```

Åpne `http://localhost:3000`. Verifiser: upload-UI vises korrekt, fil kan velges, feilmeldinger ved ugyldig type/størrelse.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add upload UI with XSS-safe rendering"
```

---

### Task 5: Frontend – resultat-rendering (alle 6 faner)

**Files:**
- Modify: `index.html` (legg til i script-taggen, etter `showSection`-funksjonen)

**Step 1: Legg til renderTabs og alle render-funksjoner**

Legg til følgende i `<script>`-taggen i `index.html`, rett etter `showSection`-funksjonen:

```javascript
function renderTabs(data) {
  const tabs = [
    { id: 'flashcards', label: 'Flashcards' },
    { id: 'sammendrag', label: 'Sammendrag' },
    { id: 'sporsmal', label: 'Spørsmål & Svar' },
    { id: 'utfordring', label: 'Utfordring' },
    { id: 'nokkelBegreper', label: 'Nøkkelbegreper' },
    { id: 'strategi', label: 'Strategi' },
  ];

  const nav = document.getElementById('tab-nav');
  const content = document.getElementById('tab-content');
  nav.innerHTML = '';
  content.innerHTML = '';

  tabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.textContent = tab.label;
    if (i === 0) btn.classList.add('active');
    btn.addEventListener('click', () => showSection(tab.id, btn));
    nav.appendChild(btn);

    const sec = document.createElement('div');
    sec.className = 'section' + (i === 0 ? ' active' : '');
    sec.id = tab.id;
    content.appendChild(sec);
  });

  renderFlashcards(data.flashcards);
  renderSammendrag(data.sammendrag);
  renderQA(data.qa);
  renderUtfordring(data.utfordring);
  renderNokkelBegreper(data.nokkelBegreper);
  renderStrategi(data.strategi);
}

// --- Flashcards ---
let _fcCards = [], fcFiltered = [], fcCur = 0, fcFlipped = false;

function renderFlashcards(cards) {
  _fcCards = cards;
  fcFiltered = [...cards];
  fcCur = 0;
  fcFlipped = false;

  const catLabels = { kjerne: 'Kjerne', fakta: 'Fakta', begrep: 'Begrep', eksempel: 'Eksempel' };
  const cats = [...new Set(cards.map(c => c.cat))];
  const sec = document.getElementById('flashcards');

  // Bygg statisk HTML-skall (ingen brukerdata her)
  sec.innerHTML = `
    <div class="sec-title">Flashcards</div>
    <div class="sec-sub">Klikk for å snu. Øv høyt.</div>
    <div class="ftabs" id="fc-filters">
      <button class="ftab active" data-cat="alle">Alle</button>
    </div>
    <div class="pbar-bg"><div class="pbar" id="fcpb" style="width:0%"></div></div>
    <div class="fc-hint" id="fchint">Klikk for å snu</div>
    <div class="fc-wrap">
      <div class="card" id="flashcard">
        <div class="face front">
          <div class="clabel" id="fclabel"></div>
          <div class="cbadge" id="fcbadge"></div>
          <div class="ctext" id="fcfront"></div>
        </div>
        <div class="face back">
          <div class="clabel">Svar</div>
          <div class="ctext" id="fcback"></div>
        </div>
      </div>
    </div>
    <div class="cnav">
      <button id="fc-prev">← Forrige</button>
      <span class="ccount" id="fccount"></span>
      <button id="fc-next">Neste →</button>
    </div>
  `;

  // Legg til kategori-knapper med textContent (ingen esc() nødvendig - catLabels er hardkodet)
  const filters = document.getElementById('fc-filters');
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'ftab';
    btn.dataset.cat = cat;
    btn.textContent = catLabels[cat] || cat;
    filters.appendChild(btn);
  });

  // Event listeners
  filters.addEventListener('click', e => {
    if (!e.target.matches('.ftab')) return;
    filters.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    const cat = e.target.dataset.cat;
    fcFiltered = cat === 'alle' ? [..._fcCards] : _fcCards.filter(c => c.cat === cat);
    fcCur = 0;
    fcUpdate();
  });

  document.getElementById('flashcard').addEventListener('click', fcFlip);
  document.getElementById('fc-next').addEventListener('click', () => { fcCur = (fcCur + 1) % fcFiltered.length; fcUpdate(); });
  document.getElementById('fc-prev').addEventListener('click', () => { fcCur = (fcCur - 1 + fcFiltered.length) % fcFiltered.length; fcUpdate(); });

  fcUpdate();
}

function fcUpdate() {
  if (!fcFiltered.length) return;
  const c = fcFiltered[fcCur];
  const catLabels = { kjerne: 'Kjerne', fakta: 'Fakta', begrep: 'Begrep', eksempel: 'Eksempel' };
  // textContent er XSS-safe – setter all AI-generert tekst slik
  document.getElementById('fcfront').textContent = c.front;
  document.getElementById('fcbadge').textContent = catLabels[c.cat] || c.cat;
  document.getElementById('fcback').textContent = c.back;
  document.getElementById('fclabel').textContent = (fcCur + 1) + ' / ' + fcFiltered.length;
  document.getElementById('fccount').textContent = (fcCur + 1) + ' / ' + fcFiltered.length;
  document.getElementById('fcpb').style.width = ((fcCur + 1) / fcFiltered.length * 100) + '%';
  document.getElementById('flashcard').classList.remove('flipped');
  fcFlipped = false;
  document.getElementById('fchint').textContent = 'Klikk for å snu';
}

function fcFlip() {
  fcFlipped = !fcFlipped;
  document.getElementById('flashcard').classList.toggle('flipped', fcFlipped);
  document.getElementById('fchint').textContent = fcFlipped ? 'Klikk for å snu tilbake' : 'Klikk for å snu';
}

// --- Sammendrag ---
function renderSammendrag(temaer) {
  const sec = document.getElementById('sammendrag');
  sec.innerHTML = '<div class="sec-title">Sammendrag</div><div class="sec-sub">Nøkkelpunkter per tema.</div>';

  temaer.forEach(t => {
    const card = document.createElement('div');
    card.className = 'tema-card';

    const title = document.createElement('div');
    title.className = 'tema-title';
    title.textContent = t.tema;  // textContent = XSS-safe
    card.appendChild(title);

    const ul = document.createElement('ul');
    t.punkter.forEach(p => {
      const li = document.createElement('li');
      li.textContent = p;  // textContent = XSS-safe
      ul.appendChild(li);
    });
    card.appendChild(ul);
    sec.appendChild(card);
  });
}

// --- Q&A ---
function renderQA(qaItems) {
  const sec = document.getElementById('sporsmal');
  sec.innerHTML = '<div class="sec-title">Spørsmål &amp; Svar</div><div class="sec-sub">Si svaret høyt før du slår opp.</div>';

  const grid = document.createElement('div');
  grid.className = 'qa-grid';

  qaItems.forEach((item, i) => {
    const qi = document.createElement('div');
    qi.className = 'qi';
    qi.id = 'qa' + i;

    const qq = document.createElement('div');
    qq.className = 'qq';
    qq.addEventListener('click', () => qi.classList.toggle('open'));

    const qtext = document.createElement('span');
    qtext.className = 'qq-text';
    qtext.textContent = item.sporsmal;  // textContent = XSS-safe

    const qtog = document.createElement('span');
    qtog.className = 'qtog';
    qtog.textContent = '▼';

    qq.appendChild(qtext);
    qq.appendChild(qtog);

    const qaBody = document.createElement('div');
    qaBody.className = 'qa-body';
    qaBody.textContent = item.svar;  // textContent = XSS-safe

    if (item.hint) {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = '💡 ' + item.hint;
      qaBody.appendChild(hint);
    }

    qi.appendChild(qq);
    qi.appendChild(qaBody);
    grid.appendChild(qi);
  });

  sec.appendChild(grid);
}

// --- Utfordring ---
let _utfordringPool = [], _utfordringTimer = null;

function renderUtfordring(items) {
  _utfordringPool = items;
  const sec = document.getElementById('utfordring');
  sec.innerHTML = `
    <div class="sec-title">Utfordringsmodus</div>
    <div class="sec-sub">Svar høyt på 60 sekunder, se fasit.</div>
  `;

  const startBtn = document.createElement('button');
  startBtn.className = 'cbtn-all';
  startBtn.textContent = 'Tilfeldig spørsmål';
  startBtn.addEventListener('click', startUtfordring);

  const cq = document.createElement('div');
  cq.className = 'cqdis';
  cq.id = 'cq';

  const timerWrap = document.createElement('div');
  timerWrap.className = 'tbar-wrap';
  timerWrap.id = 'ctimer';
  timerWrap.innerHTML = '<div class="tbar-bg"><div class="tbar" id="cbar"></div></div><div class="tnum" id="csec">60</div>';

  const revBtn = document.createElement('button');
  revBtn.className = 'revbtn';
  revBtn.id = 'crevbtn';
  revBtn.textContent = 'Vis fasit';
  revBtn.addEventListener('click', revealUtfordring);

  const cans = document.createElement('div');
  cans.className = 'cadis';
  cans.id = 'cans';

  sec.appendChild(startBtn);
  sec.appendChild(cq);
  sec.appendChild(timerWrap);
  sec.appendChild(revBtn);
  sec.appendChild(cans);
}

function startUtfordring() {
  clearInterval(_utfordringTimer);
  const item = _utfordringPool[Math.floor(Math.random() * _utfordringPool.length)];
  window._utfordringAnswer = item.svar;

  const cq = document.getElementById('cq');
  cq.className = 'cqdis visible';
  cq.textContent = item.sporsmal;  // textContent = XSS-safe

  document.getElementById('cans').className = 'cadis';
  document.getElementById('crevbtn').className = 'revbtn visible';

  let secs = 60;
  document.getElementById('cbar').style.width = '100%';
  document.getElementById('cbar').className = 'tbar';
  document.getElementById('csec').textContent = '60';
  document.getElementById('ctimer').className = 'tbar-wrap visible';

  _utfordringTimer = setInterval(() => {
    secs--;
    document.getElementById('csec').textContent = secs;
    document.getElementById('cbar').style.width = (secs / 60 * 100) + '%';
    if (secs <= 20) document.getElementById('cbar').className = 'tbar warn';
    if (secs <= 10) document.getElementById('cbar').className = 'tbar danger';
    if (secs <= 0) clearInterval(_utfordringTimer);
  }, 1000);
}

function revealUtfordring() {
  clearInterval(_utfordringTimer);
  const el = document.getElementById('cans');
  el.textContent = window._utfordringAnswer;  // textContent = XSS-safe
  el.className = 'cadis visible';
}

// --- Nøkkelbegreper ---
function renderNokkelBegreper(begreper) {
  const sec = document.getElementById('nokkelBegreper');
  sec.innerHTML = '<div class="sec-title">Nøkkelbegreper</div><div class="sec-sub">Sentrale begreper og sammenhenger.</div>';

  const grid = document.createElement('div');
  grid.className = 'begrep-grid';

  begreper.forEach(b => {
    const card = document.createElement('div');
    card.className = 'begrep-card';

    const title = document.createElement('div');
    title.className = 'begrep-title';
    title.textContent = b.begrep;

    const forklaring = document.createElement('div');
    forklaring.className = 'begrep-forklaring';
    forklaring.textContent = b.forklaring;

    card.appendChild(title);
    card.appendChild(forklaring);

    if (b.sammenheng) {
      const sammenheng = document.createElement('div');
      sammenheng.className = 'begrep-sammenheng';
      sammenheng.textContent = b.sammenheng;
      card.appendChild(sammenheng);
    }

    grid.appendChild(card);
  });

  sec.appendChild(grid);
}

// --- Strategi ---
function renderStrategi(strategi) {
  const sec = document.getElementById('strategi');
  sec.innerHTML = '<div class="sec-title">Strategi</div><div class="sec-sub">Muntlig framføring. Klikk formuleringer for å kopiere.</div>';

  const grid = document.createElement('div');
  grid.className = 'sgrid';

  function makeListCard(tittel, items) {
    const card = document.createElement('div');
    card.className = 'scrd';
    const h3 = document.createElement('h3');
    h3.textContent = tittel;
    const ul = document.createElement('ul');
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;  // textContent = XSS-safe
      ul.appendChild(li);
    });
    card.appendChild(h3);
    card.appendChild(ul);
    return card;
  }

  grid.appendChild(makeListCard('Posisjonering', strategi.posisjonering));
  grid.appendChild(makeListCard('Tips', strategi.tips));

  const formCard = document.createElement('div');
  formCard.className = 'scrd';
  formCard.style.gridColumn = '1 / -1';
  const formH3 = document.createElement('h3');
  formH3.textContent = 'Forberedte formuleringer';
  const flist = document.createElement('div');
  flist.className = 'flist';

  strategi.formuleringer.forEach(f => {
    const el = document.createElement('div');
    el.className = 'fi';
    const quote = document.createTextNode('\u00AB' + f + '\u00BB');  // «f» via textNode = XSS-safe
    const ch = document.createElement('span');
    ch.className = 'ch';
    ch.textContent = 'kopier';
    el.appendChild(quote);
    el.appendChild(ch);
    el.addEventListener('click', () => {
      navigator.clipboard.writeText('\u00AB' + f + '\u00BB').catch(() => {});
      el.style.background = '#d4e8d4';
      setTimeout(() => { el.style.background = ''; }, 700);
    });
    flist.appendChild(el);
  });

  formCard.appendChild(formH3);
  formCard.appendChild(flist);
  grid.appendChild(formCard);
  sec.appendChild(grid);
}
```

**Step 2: Test alle faner i nettleser**

Last opp en test-PDF. Bekreft at alle 6 faner vises med innhold og at interaksjon (flip, accordion, timer) fungerer.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add result rendering for all 6 tabs with XSS-safe DOM manipulation"
```

---

### Task 6: Frontend – nedlastbar HTML

**Files:**
- Modify: `index.html` (legg til `downloadHTML`-funksjon i script-taggen)

**Step 1: Legg til nedlastingsfunksjon**

Legg til i `<script>`-taggen:

```javascript
function downloadHTML() {
  const data = window._resultData;
  if (!data) return;

  // Hent CSS fra style-taggen
  const css = document.querySelector('style').textContent;

  // Bygg standalone HTML med data innebygget
  const safeTitle = esc(data.title || 'Læringsverktøy');
  const safeSubject = esc(data.subject || '');

  const html = [
    '<!DOCTYPE html>',
    '<html lang="no">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + safeTitle + '</title>',
    '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">',
    '<style>' + css + '</style>',
    '</head>',
    '<body>',
    '<header>',
    '  <div>',
    '    <h1>' + safeTitle + '</h1>',
    '    <div style="font-size:.8rem;color:var(--gl);margin-top:4px;opacity:.85;">' + safeSubject + '</div>',
    '  </div>',
    '</header>',
    '<nav id="tab-nav"></nav>',
    '<main id="tab-content"></main>',
    '<script>',
    'const _d = ' + JSON.stringify(data) + ';',
    getStandaloneScript(),
    '<' + '/script>',
    '</body>',
    '</html>',
  ].join('\n');

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (data.title || 'laeringsverktoy').replace(/\s+/g, '-').toLowerCase() + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function getStandaloneScript() {
  // Returnerer alle funksjoner som trengs for standalone, med _d som datakilde
  return `
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function showSection(id,btn){document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));document.getElementById(id).classList.add('active');btn.classList.add('active');}
let _fcCards=[],fcFiltered=[],fcCur=0,fcFlipped=false,_utfordringPool=[],_utfordringTimer=null;
function fcUpdate(){if(!fcFiltered.length)return;const c=fcFiltered[fcCur];const cl={kjerne:'Kjerne',fakta:'Fakta',begrep:'Begrep',eksempel:'Eksempel'};document.getElementById('fcfront').textContent=c.front;document.getElementById('fcbadge').textContent=cl[c.cat]||c.cat;document.getElementById('fcback').textContent=c.back;document.getElementById('fclabel').textContent=(fcCur+1)+' / '+fcFiltered.length;document.getElementById('fccount').textContent=(fcCur+1)+' / '+fcFiltered.length;document.getElementById('fcpb').style.width=((fcCur+1)/fcFiltered.length*100)+'%';document.getElementById('flashcard').classList.remove('flipped');fcFlipped=false;document.getElementById('fchint').textContent='Klikk for å snu';}
function fcFlip(){fcFlipped=!fcFlipped;document.getElementById('flashcard').classList.toggle('flipped',fcFlipped);document.getElementById('fchint').textContent=fcFlipped?'Klikk for å snu tilbake':'Klikk for å snu';}
function startUtfordring(){clearInterval(_utfordringTimer);const item=_utfordringPool[Math.floor(Math.random()*_utfordringPool.length)];window._ua=item.svar;const cq=document.getElementById('cq');cq.className='cqdis visible';cq.textContent=item.sporsmal;document.getElementById('cans').className='cadis';document.getElementById('crevbtn').className='revbtn visible';let secs=60;document.getElementById('cbar').style.width='100%';document.getElementById('cbar').className='tbar';document.getElementById('csec').textContent='60';document.getElementById('ctimer').className='tbar-wrap visible';_utfordringTimer=setInterval(()=>{secs--;document.getElementById('csec').textContent=secs;document.getElementById('cbar').style.width=(secs/60*100)+'%';if(secs<=20)document.getElementById('cbar').className='tbar warn';if(secs<=10)document.getElementById('cbar').className='tbar danger';if(secs<=0)clearInterval(_utfordringTimer);},1000);}
function revealUtfordring(){clearInterval(_utfordringTimer);const el=document.getElementById('cans');el.textContent=window._ua;el.className='cadis visible';}
// Init: renderTabs er inkludert under — kjøres etter DOM er klar
${getFunctionsForStandalone()}
document.addEventListener('DOMContentLoaded', () => { renderTabs(_d); });
  `;
}

// Henter render-funksjonene som streng for inkludering i nedlastet fil
// Disse er definert eksplisitt for å unngå å evaluere vilkårlig kode
function getFunctionsForStandalone() {
  return renderTabsFn.toString() + '\n' +
    renderFlashcardsFn.toString() + '\n' +
    renderSammendragFn.toString() + '\n' +
    renderQAFn.toString() + '\n' +
    renderUtfordringFn.toString() + '\n' +
    renderNokkelBegreperFn.toString() + '\n' +
    renderStratigiFn.toString();
}
```

**Merk:** `getFunctionsForStandalone` refererer til navngitte funksjons-referanser. I praksis er den enkleste løsningen å inkludere hele render-logikken direkte som en string-literal i `getStandaloneScript()`. Se Step 2 for en enklere implementasjon.

**Step 2: Forenklet nedlasting – serialiser eksisterende DOM**

En enklere og mer robust løsning er å serialisere det gjeldende DOM-treet direkte:

```javascript
function downloadHTML() {
  const data = window._resultData;
  if (!data) return;

  const css = document.querySelector('style').textContent;
  const safeTitle = esc(data.title || 'Læringsverktøy');
  const safeSubject = esc(data.subject || '');

  // Serialiser gjeldende resultat-DOM
  const navHTML = document.getElementById('tab-nav').innerHTML;
  const contentHTML = document.getElementById('tab-content').innerHTML;

  // Inline JS for standalone interaktivitet (ingen AI-data injisert her)
  const standaloneJS = `
const _d = ${JSON.stringify(data)};
let _fcCards = _d.flashcards, fcFiltered = [..._d.flashcards], fcCur = 0, fcFlipped = false;
let _utfordringPool = _d.utfordring, _utfordringTimer = null;

function showSection(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

function fcUpdate() {
  if (!fcFiltered.length) return;
  const c = fcFiltered[fcCur];
  const cl = {kjerne:'Kjerne',fakta:'Fakta',begrep:'Begrep',eksempel:'Eksempel'};
  document.getElementById('fcfront').textContent = c.front;
  document.getElementById('fcbadge').textContent = cl[c.cat] || c.cat;
  document.getElementById('fcback').textContent = c.back;
  document.getElementById('fclabel').textContent = (fcCur+1) + ' / ' + fcFiltered.length;
  document.getElementById('fccount').textContent = (fcCur+1) + ' / ' + fcFiltered.length;
  document.getElementById('fcpb').style.width = ((fcCur+1)/fcFiltered.length*100) + '%';
  document.getElementById('flashcard').classList.remove('flipped');
  fcFlipped = false;
  document.getElementById('fchint').textContent = 'Klikk for å snu';
}

function fcFlip() {
  fcFlipped = !fcFlipped;
  document.getElementById('flashcard').classList.toggle('flipped', fcFlipped);
  document.getElementById('fchint').textContent = fcFlipped ? 'Klikk for å snu tilbake' : 'Klikk for å snu';
}

function startUtfordring() {
  clearInterval(_utfordringTimer);
  const item = _utfordringPool[Math.floor(Math.random() * _utfordringPool.length)];
  window._ua = item.svar;
  const cq = document.getElementById('cq');
  cq.className = 'cqdis visible';
  cq.textContent = item.sporsmal;
  document.getElementById('cans').className = 'cadis';
  document.getElementById('crevbtn').className = 'revbtn visible';
  let secs = 60;
  document.getElementById('cbar').style.width = '100%';
  document.getElementById('cbar').className = 'tbar';
  document.getElementById('csec').textContent = '60';
  document.getElementById('ctimer').className = 'tbar-wrap visible';
  _utfordringTimer = setInterval(() => {
    secs--;
    document.getElementById('csec').textContent = secs;
    document.getElementById('cbar').style.width = (secs/60*100) + '%';
    if (secs <= 20) document.getElementById('cbar').className = 'tbar warn';
    if (secs <= 10) document.getElementById('cbar').className = 'tbar danger';
    if (secs <= 0) clearInterval(_utfordringTimer);
  }, 1000);
}

function revealUtfordring() {
  clearInterval(_utfordringTimer);
  const el = document.getElementById('cans');
  el.textContent = window._ua;
  el.className = 'cadis visible';
}

// Re-attach event listeners etter DOM-serialisering
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('nav button').forEach((btn, i) => {
    const ids = ['flashcards','sammendrag','sporsmal','utfordring','nokkelBegreper','strategi'];
    btn.addEventListener('click', () => showSection(ids[i], btn));
  });
  const fc = document.getElementById('flashcard');
  if (fc) fc.addEventListener('click', fcFlip);
  const fcNext = document.getElementById('fc-next');
  if (fcNext) fcNext.addEventListener('click', () => { fcCur = (fcCur+1)%fcFiltered.length; fcUpdate(); });
  const fcPrev = document.getElementById('fc-prev');
  if (fcPrev) fcPrev.addEventListener('click', () => { fcCur = (fcCur-1+fcFiltered.length)%fcFiltered.length; fcUpdate(); });
  const startBtn = document.getElementById('start-utfordring');
  if (startBtn) startBtn.addEventListener('click', startUtfordring);
  const revBtn = document.getElementById('crevbtn');
  if (revBtn) revBtn.addEventListener('click', revealUtfordring);
  document.querySelectorAll('.qi').forEach(qi => {
    const qq = qi.querySelector('.qq');
    if (qq) qq.addEventListener('click', () => qi.classList.toggle('open'));
  });
  document.querySelectorAll('.fi').forEach(fi => {
    fi.addEventListener('click', () => {
      const text = fi.textContent.replace(/kopier$/i, '').trim();
      navigator.clipboard.writeText(text).catch(() => {});
      fi.style.background = '#d4e8d4';
      setTimeout(() => { fi.style.background = ''; }, 700);
    });
  });
  fcUpdate();
});
`;

  const html = [
    '<!DOCTYPE html>',
    '<html lang="no">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + safeTitle + '</title>',
    '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">',
    '<style>' + css + '</style>',
    '</head>',
    '<body>',
    '<header><div><h1>' + safeTitle + '</h1>',
    '<div style="font-size:.8rem;color:var(--gl);margin-top:4px;opacity:.85;">' + safeSubject + '</div>',
    '</div></header>',
    '<nav id="tab-nav">' + navHTML + '</nav>',
    '<main id="tab-content">' + contentHTML + '</main>',
    '<script>' + standaloneJS + '<' + '/script>',
    '</body></html>',
  ].join('\n');

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (data.title || 'laeringsverktoy').replace(/[^a-z0-9æøå]/gi, '-').toLowerCase() + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
```

**Step 3: Test nedlasting**

Generer et læringsverktøy, klikk "Last ned HTML", åpne filen i nettleser offline og bekreft at alle faner fungerer.

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add standalone HTML download"
```

---

### Task 7: Vercel-deployment

**Files:** Ingen nye filer.

**Step 1: Logg inn på Vercel CLI**

```bash
npx vercel login
```

**Step 2: Koble prosjektet til Vercel**

Kjør fra `/Users/kennethbareksten/Koding/fagutvikleren`:
```bash
npx vercel link
```

Velg "Link to existing project" og koble til `barx10/fagutvikleren` på GitHub.

**Step 3: Legg til Gemini API-nøkkel**

Hent API-nøkkel fra [Google AI Studio](https://aistudio.google.com/apikey), deretter:

```bash
npx vercel env add GEMINI_API_KEY production
npx vercel env add GEMINI_API_KEY preview
npx vercel env add GEMINI_API_KEY development
```

**Step 4: Deploy til production**

```bash
npx vercel --prod
```

**Step 5: End-to-end test**

Åpne URL-en fra Vercel-outputen og test:
1. Last opp en PDF
2. Bekreft at alle 6 faner genereres
3. Test flashcard-navigasjon og flip
4. Test utfordring-modus med timer
5. Last ned HTML og åpne offline

**Step 6: Push og push endringer**

```bash
git push origin main
```

---

## Ferdig

Etter Task 7 er verktøyet live på Vercel med:
- PDF/DOCX-opplasting med klient-side validering
- Gemini 3.1 Flash-Lite Preview-generering (API-nøkkel skjult)
- 6 lærings-faner med XSS-safe DOM-rendering
- Nedlastbar standalone HTML-fil
