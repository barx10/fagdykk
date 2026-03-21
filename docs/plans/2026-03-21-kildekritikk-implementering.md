> **Erstattet av:** `2026-03-21-kildekritikk-utvidelse-design.md` og `2026-03-21-kildekritikk-utvidelse-implementering.md`

# Kildekritikk Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Tverrfaglig and Ordforklaring tabs with a dedicated Kildekritikk tab, and integrate term definitions into flashcards.

**Architecture:** Update the AI prompt to produce a `kildekritikk` object instead of `ordforklaring` and `tverrfaglig`. Add a `renderKildekritikk()` function in app.js using the same card-based layout as argumentasjon. Update tab order to: Sammendrag, Sporsmal og Svar, Argumentasjon, Kildekritikk, Flashcards.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Vercel Serverless Functions, Jest

---

### Task 1: Update tests for new prompt structure

**Files:**
- Modify: `api/__tests__/generate.test.js:25-40`

**Step 1: Write the failing tests**

Update the `buildPrompt` test suite to expect the new sections:

```javascript
describe('buildPrompt', () => {
  test('inkluderer JSON-instruksjon', () => {
    expect(buildPrompt()).toMatch(/JSON/);
  });

  test('spesifiserer alle fem seksjoner', () => {
    const prompt = buildPrompt();
    ['flashcards', 'sammendrag', 'qa', 'argumentasjon', 'kildekritikk']
      .forEach(key => expect(prompt).toMatch(key));
  });

  test('inneholder ikke ordforklaring eller tverrfaglig', () => {
    const prompt = buildPrompt();
    expect(prompt).not.toMatch(/"ordforklaring"/);
    expect(prompt).not.toMatch(/"tverrfaglig"/);
  });

  test('inneholder ingen elevtilpasning', () => {
    const prompt = buildPrompt();
    expect(prompt).not.toMatch(/elev på 13 år/);
  });

  test('kildekritikk inkluderer kildevurdering, metodekritikk, argumentasjonskritikk og samlet', () => {
    const prompt = buildPrompt();
    expect(prompt).toMatch(/kildevurdering/);
    expect(prompt).toMatch(/metodekritikk/i);
    expect(prompt).toMatch(/argumentasjonskritikk/);
    expect(prompt).toMatch(/samlet/);
  });

  test('samlet vurdering inkluderer styrke-indikator', () => {
    const prompt = buildPrompt();
    expect(prompt).toMatch(/sterk\|middels\|svak/);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest api/__tests__/generate.test.js --verbose`
Expected: FAIL - prompt still contains `ordforklaring` and `tverrfaglig`, missing `kildekritikk`

**Step 3: Commit**

```bash
git add api/__tests__/generate.test.js
git commit -m "test: oppdater prompt-tester for kildekritikk-struktur"
```

---

### Task 2: Update buildPrompt() - replace ordforklaring/tverrfaglig with kildekritikk

**Files:**
- Modify: `api/generate.js:29-74`

**Step 1: Replace the buildPrompt function**

The new prompt should:
- Remove `ordforklaring` and `tverrfaglig` from JSON schema
- Add `kildekritikk` object with kildevurdering, metodekritikk, argumentasjonskritikk, samlet
- Move methodology critique OUT of sammendrag instructions
- Add instruction for flashcards to include fagtermer as cat "begrep"
- Update minimumskrav to remove ordforklaring/tverrfaglig counts, add kildekritikk requirement

Key changes to prompt instructions:
- Sammendrag: "presenter 3-5 temaer med nokkelpunkter. IKKE inkluder metodekritikk her - det dekkes av kildekritikk-seksjonen."
- Flashcards: "inkluder ogsa fagtermer og fremmedord fra teksten som cat begrep"
- Kildekritikk: detailed instructions for each of the 4 sub-sections
- Samlet.styrke: "sterk|middels|svak" enum
- Minimum 3 metodekritikk-punkter, minimum 2 argumentasjonskritikk-punkter

**Step 2: Run tests to verify they pass**

Run: `npx jest api/__tests__/generate.test.js --verbose`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add api/generate.js
git commit -m "feat: erstatt ordforklaring/tverrfaglig med kildekritikk i prompt"
```

---

### Task 3: Update tab rendering - new tab order, remove old tabs, add kildekritikk

**Files:**
- Modify: `app.js:326-360` (renderTabs)
- Modify: `app.js:599-687` (remove renderOrdforklaring and renderTverrfaglig)

**Step 1: Update renderTabs() to new tab order**

Replace the `tabs` array (line 327-334):

```javascript
const tabs = [
  { id: 'sammendrag', label: 'Sammendrag' },
  { id: 'sporsmal', label: 'Sporsmal og Svar' },
  { id: 'argumentasjon', label: 'Argumentasjon' },
  { id: 'kildekritikk', label: 'Kildekritikk' },
  { id: 'flashcards', label: 'Flashcards' },
];
```

Update render calls (lines 354-359):

```javascript
renderSammendrag(data.sammendrag);
renderQA(data.qa);
renderArgumentasjon(data.argumentasjon);
renderKildekritikk(data.kildekritikk);
renderFlashcards(data.flashcards);
```

**Step 2: Delete renderOrdforklaring (lines 599-642) and renderTverrfaglig (lines 644-687)**

Remove both functions entirely.

**Step 3: Add renderKildekritikk function after renderArgumentasjon**

The function creates 4 cards using `begrep-card` class (same as argumentasjon):
- Card 1 (Kildevurdering): labeled fields for forfatter, publiseringskanal, finansiering, aktualitet
- Card 2 (Metodekritikk): bullet list using `arg-list` class
- Card 3 (Argumentasjonskritikk): bullet list using `arg-list` class
- Card 4 (Samlet kildevurdering): trafikklys indicator + vurdering text + bruksomrade/begrensninger

All text content set via `textContent` (not innerHTML) for XSS safety.

Trafikklys uses a CSS class `kk-styrke--sterk|middels|svak` with a colored dot and label.

**Step 4: Verify in browser**

Expected: 5 tabs in correct order, Kildekritikk tab renders 4 cards

**Step 5: Commit**

```bash
git add app.js
git commit -m "feat: legg til Kildekritikk-fane, fjern Ordforklaring og Tverrfaglig"
```

---

### Task 4: Add CSS for kildekritikk components

**Files:**
- Modify: `style.css` (insert before @media query on line 100)

**Step 1: Add kildekritikk styles**

```css
.kk-field{font-size:.87rem;line-height:1.6;color:#333;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.kk-field:last-child{border-bottom:none}
.kk-label{font-weight:600;color:var(--dg)}
.kk-styrke{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:4px;font-size:.88rem;font-weight:600;margin-bottom:10px}
.kk-styrke--sterk{background:#d1fae5;color:#065f46}
.kk-styrke--middels{background:#fef3c7;color:#92400e}
.kk-styrke--svak{background:#fee2e2;color:#991b1b}
.kk-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
.kk-styrke--sterk .kk-dot{background:#059669}
.kk-styrke--middels .kk-dot{background:#d97706}
.kk-styrke--svak .kk-dot{background:#dc2626}
```

**Step 2: Verify visually**

Expected: Trafikklys viser gronn (sterk), gul (middels), eller rod (svak)

**Step 3: Commit**

```bash
git add style.css
git commit -m "style: legg til CSS for kildekritikk-kort og trafikklys"
```

---

### Task 5: Update standalone HTML download

**Files:**
- Modify: `app.js:689-796` (downloadHTML function)

**Step 1: Update tab IDs in standalone JS**

In the `standaloneJS` string (around line 734), update the `tabIds` array:

```javascript
const tabIds = ['sammendrag','sporsmal','argumentasjon','kildekritikk','flashcards'];
```

**Step 2: Verify download works**

Generate content, click "Last ned HTML", open the downloaded file.
Expected: All 5 tabs work, kildekritikk renders correctly, no JS errors.

**Step 3: Commit**

```bash
git add app.js
git commit -m "fix: oppdater nedlastbar HTML med nye tab-IDer"
```

---

### Task 6: Update help modal text

**Files:**
- Modify: `index.html:76-81`

**Step 1: Update feature list in help modal**

Replace the bullet list with updated tab descriptions:
- Sammendrag - nokkelpunkter per tema
- Sporsmal og Svar - ovelsessporsmal med fasit
- Argumentasjon - hovedpastander med argumenter og motargumenter
- Kildekritikk - systematisk vurdering av kildens troverdighet
- Flashcards - ov begreper og sammenhenger

**Step 2: Update about modal description (line 92)**

Update to mention kildekritikk instead of old tabs.

**Step 3: Commit**

```bash
git add index.html
git commit -m "docs: oppdater hjelpetekst med nye faner"
```

---

### Task 7: Run full test suite and manual verification

**Step 1: Run all tests**

Run: `npx jest --verbose`
Expected: ALL PASS

**Step 2: Manual end-to-end test**

1. Upload a PDF or paste text
2. Verify 5 tabs appear in correct order
3. Verify Kildekritikk tab shows 4 cards with correct content
4. Verify trafikklys indicator works (sterk/middels/svak)
5. Verify flashcards include "begrep" category terms
6. Verify "Last ned HTML" works with all tabs
7. Verify no console errors

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "feat: kildekritikk som sentral fane - erstatter ordforklaring og tverrfaglig"
```
