# Kildekritikk-utvidelse Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Utvide kildekritikk-fanen med påstandsanalyse, perspektiv/bias og samlet innholdsvurdering, organisert i to visuelt adskilte grupper ("Kilden" og "Innholdet").

**Architecture:** Oppdatere AI-prompten med ny JSON-struktur (erstatte `argumentasjonskritikk` og `samlet` med `pastandsanalyse`, `perspektiv`, `samlet_kilde` og `samlet_innhold`), deretter oppdatere `renderKildekritikk()` i app.js til å rendre to grupper med gruppeoverskrifter, og til slutt oppdatere CSS og downloadHTML.

**Tech Stack:** Vanilla JS, Vercel Serverless Functions, Jest

---

### Task 1: Oppdater AI-prompten med ny JSON-struktur

**Files:**
- Modify: `api/generate.js:55-70` (JSON-skjema i prompten)
- Modify: `api/generate.js:77` (kildekritikk-instruksjoner)
- Modify: `api/generate.js:84` (minimumskrav)

**Step 1: Write the failing test**

Oppdater testen i `api/__tests__/generate.test.js` til å reflektere ny struktur:

```js
test('kildekritikk inkluderer kildevurdering, metodekritikk, samlet_kilde, pastandsanalyse, perspektiv og samlet_innhold', () => {
  const prompt = buildPrompt();
  expect(prompt).toMatch(/kildevurdering/);
  expect(prompt).toMatch(/metodekritikk/i);
  expect(prompt).toMatch(/samlet_kilde/);
  expect(prompt).toMatch(/pastandsanalyse/);
  expect(prompt).toMatch(/perspektiv/);
  expect(prompt).toMatch(/samlet_innhold/);
  // Fjernet argumentasjonskritikk — erstattet av nye felter
  expect(prompt).not.toMatch(/"argumentasjonskritikk"/);
});

test('samlet vurdering inkluderer styrke-indikator for både kilde og innhold', () => {
  const prompt = buildPrompt();
  // Skal ha to forekomster av sterk|middels|svak (samlet_kilde og samlet_innhold)
  const matches = prompt.match(/sterk\|middels\|svak/g);
  expect(matches).not.toBeNull();
  expect(matches.length).toBe(2);
});

test('prompt inneholder instruksjoner for påstandsanalyse og perspektiv', () => {
  const prompt = buildPrompt();
  expect(prompt).toMatch(/påstandsanalyse/i);
  expect(prompt).toMatch(/perspektiv/i);
  expect(prompt).toMatch(/konsensus/i);
  expect(prompt).toMatch(/bias/i);
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest api/__tests__/generate.test.js --verbose`
Expected: FAIL — prompt inneholder fortsatt `argumentasjonskritikk` og mangler nye felter.

**Step 3: Oppdater prompten**

I `api/generate.js`, erstatt `kildekritikk`-blokken i JSON-skjemaet (linje 55-70) med:

```json
"kildekritikk": {
  "kildevurdering": {
    "forfatter": "Vurdering av forfatterens autoritet, tilknytning og mulige interessekonflikter",
    "publiseringskanal": "Type publikasjon — fagfellevurdert tidsskrift, forlag, rapport, blogg osv.",
    "finansiering": "Hvem finansierte forskningen og mulige implikasjoner for objektivitet",
    "aktualitet": "Når publisert og om funnene fortsatt er relevante"
  },
  "metodekritikk": ["Konkret svakhet 1", "Konkret svakhet 2"],
  "samlet_kilde": {
    "styrke": "sterk|middels|svak",
    "vurdering": "Helhetlig kvalitativ vurdering av kildens troverdighet og akademiske kvalitet",
    "bruksomrade": "Hva denne kilden kan brukes til",
    "begrensninger": "Hva denne kilden IKKE kan brukes til"
  },
  "pastandsanalyse": [
    {
      "pastand": "Nøkkelpåstand fra teksten",
      "underbygging": "Vurdering av om evidensen i teksten faktisk underbygger påstanden",
      "konsensus": "Hvordan påstanden står seg mot etablert forskning og konsensus i feltet"
    }
  ],
  "perspektiv": {
    "ramme": "Overordnet teoretisk eller ideologisk posisjon teksten opererer innenfor",
    "eksempler": ["Konkret eksempel på bias — ordvalg, framing eller kildeseleksjon"],
    "utelatt": ["Perspektiv eller vinkling som mangler i teksten"]
  },
  "samlet_innhold": {
    "styrke": "sterk|middels|svak",
    "vurdering": "Kvalitativ helhetsvurdering av innholdets troverdighet og balanse"
  }
}
```

Erstatt kildekritikk-instruksjonene (linje 77) med:

```
For kildekritikk: vær spesifikk og konkret i alle vurderinger. Metodekritikk skal adressere forskningsdesign, utvalg, operasjonalisering, konfounders og generaliserbarhet. Samlet kilde-styrke skal være «sterk» kun for fagfellevurderte studier med solid design, «middels» for studier med noen svakheter, «svak» for studier med vesentlige metodologiske problemer. Generer minst 3 punkter for metodekritikk.
For påstandsanalyse: identifiser 2-4 nøkkelpåstander, vurder om evidensen i teksten faktisk underbygger dem (intern konsistens), og plasser dem mot etablert konsensus i feltet (ekstern validering).
For perspektiv og bias: beskriv først den overordnede teoretiske eller ideologiske rammen teksten opererer innenfor, gi deretter 2-3 konkrete eksempler på hvordan dette viser seg (ordvalg, kildeseleksjon, framing av resultater), og list 2-3 perspektiver som er utelatt.
Samlet innholdsvurdering: «sterk» kun dersom påstandene er godt underbygget internt OG i tråd med feltets konsensus, «middels» dersom noe er ubalansert eller mangelfullt underbygget, «svak» dersom vesentlige påstander mangler evidens eller strider mot konsensus.
```

Erstatt minimumskravet (linje 84) med:

```
- Komplett kildekritikk med alle seks deler utfylt (kildevurdering, metodekritikk, samlet_kilde, pastandsanalyse, perspektiv, samlet_innhold)
```

**Step 4: Run test to verify it passes**

Run: `npx jest api/__tests__/generate.test.js --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add api/generate.js api/__tests__/generate.test.js
git commit -m "feat: utvid kildekritikk-prompt med påstandsanalyse, perspektiv og samlet innholdsvurdering"
```

---

### Task 2: Oppdater renderKildekritikk() med to grupper

**Files:**
- Modify: `app.js:597-741` (renderKildekritikk-funksjonen)

**Step 1: Erstatt hele `renderKildekritikk`-funksjonen**

```js
// --- Kildekritikk ---
function renderKildekritikk(data) {
  if (!data) return;
  const sec = document.getElementById('kildekritikk');

  const secTitle = document.createElement('div');
  secTitle.className = 'sec-title';
  secTitle.textContent = 'Kildekritikk';
  const secSub = document.createElement('div');
  secSub.className = 'sec-sub';
  secSub.textContent = 'Systematisk vurdering av kildens troverdighet og innholdets kvalitet.';
  sec.appendChild(secTitle);
  sec.appendChild(secSub);

  // --- Gruppe 1: Kilden ---
  const grp1Title = document.createElement('h3');
  grp1Title.className = 'kk-group-title';
  grp1Title.textContent = 'Kilden';
  const grp1Sub = document.createElement('div');
  grp1Sub.className = 'kk-group-sub';
  grp1Sub.textContent = 'Hvem står bak, og hvordan ble kunnskapen produsert?';
  sec.appendChild(grp1Title);
  sec.appendChild(grp1Sub);

  const grid1 = document.createElement('div');
  grid1.className = 'begrep-grid';

  // Kort 1: Kildevurdering
  if (data.kildevurdering) {
    const kv = data.kildevurdering;
    const card = document.createElement('div');
    card.className = 'begrep-card';
    const t = document.createElement('h3');
    t.className = 'begrep-title';
    t.textContent = 'Kildevurdering';
    card.appendChild(t);

    const fields = [
      { label: 'Forfatter', value: kv.forfatter },
      { label: 'Publiseringskanal', value: kv.publiseringskanal },
      { label: 'Finansiering', value: kv.finansiering },
      { label: 'Aktualitet', value: kv.aktualitet },
    ];
    fields.forEach(function(f) {
      if (!f.value) return;
      const row = document.createElement('div');
      row.className = 'kk-field';
      const label = document.createElement('span');
      label.className = 'kk-label';
      label.textContent = f.label + ': ';
      const val = document.createElement('span');
      val.textContent = f.value;
      row.appendChild(label);
      row.appendChild(val);
      card.appendChild(row);
    });
    grid1.appendChild(card);
  }

  // Kort 2: Metodekritikk
  if (data.metodekritikk && data.metodekritikk.length) {
    const card = document.createElement('div');
    card.className = 'begrep-card';
    const t = document.createElement('h3');
    t.className = 'begrep-title';
    t.textContent = 'Metodekritikk';
    card.appendChild(t);
    const ul = document.createElement('ul');
    ul.className = 'arg-list';
    data.metodekritikk.forEach(function(p) {
      const li = document.createElement('li');
      li.textContent = p;
      ul.appendChild(li);
    });
    card.appendChild(ul);
    grid1.appendChild(card);
  }

  // Kort 3: Samlet kildevurdering
  var samletKilde = data.samlet_kilde || data.samlet;
  if (samletKilde) {
    grid1.appendChild(renderSamletCard('Samlet kildevurdering', 'kilde', samletKilde));
  }

  sec.appendChild(grid1);

  // --- Gruppe 2: Innholdet ---
  const grp2Title = document.createElement('h3');
  grp2Title.className = 'kk-group-title';
  grp2Title.textContent = 'Innholdet';
  const grp2Sub = document.createElement('div');
  grp2Sub.className = 'kk-group-sub';
  grp2Sub.textContent = 'Hva påstås, og hva er utelatt?';
  sec.appendChild(grp2Title);
  sec.appendChild(grp2Sub);

  const grid2 = document.createElement('div');
  grid2.className = 'begrep-grid';

  // Kort 4: Påstandsanalyse
  if (data.pastandsanalyse && data.pastandsanalyse.length) {
    const card = document.createElement('div');
    card.className = 'begrep-card';
    const t = document.createElement('h3');
    t.className = 'begrep-title';
    t.textContent = 'Påstandsanalyse';
    card.appendChild(t);

    data.pastandsanalyse.forEach(function(pa) {
      const paDiv = document.createElement('div');
      paDiv.className = 'kk-pastand';
      const paTitle = document.createElement('div');
      paTitle.className = 'kk-pastand-title';
      paTitle.textContent = pa.pastand;
      paDiv.appendChild(paTitle);

      if (pa.underbygging) {
        const ub = document.createElement('div');
        ub.className = 'kk-field';
        const ubLabel = document.createElement('span');
        ubLabel.className = 'kk-label';
        ubLabel.textContent = 'Underbygging: ';
        const ubVal = document.createElement('span');
        ubVal.textContent = pa.underbygging;
        ub.appendChild(ubLabel);
        ub.appendChild(ubVal);
        paDiv.appendChild(ub);
      }

      if (pa.konsensus) {
        const ks = document.createElement('div');
        ks.className = 'kk-field';
        const ksLabel = document.createElement('span');
        ksLabel.className = 'kk-label';
        ksLabel.textContent = 'Konsensus: ';
        const ksVal = document.createElement('span');
        ksVal.textContent = pa.konsensus;
        ks.appendChild(ksLabel);
        ks.appendChild(ksVal);
        paDiv.appendChild(ks);
      }

      card.appendChild(paDiv);
    });
    grid2.appendChild(card);
  }

  // Kort 5: Perspektiv & bias
  if (data.perspektiv) {
    const card = document.createElement('div');
    card.className = 'begrep-card';
    const t = document.createElement('h3');
    t.className = 'begrep-title';
    t.textContent = 'Perspektiv & bias';
    card.appendChild(t);

    if (data.perspektiv.ramme) {
      const ramme = document.createElement('div');
      ramme.className = 'begrep-forklaring';
      ramme.textContent = data.perspektiv.ramme;
      card.appendChild(ramme);
    }

    if (data.perspektiv.eksempler && data.perspektiv.eksempler.length) {
      const eksLabel = document.createElement('div');
      eksLabel.className = 'kk-list-label';
      eksLabel.textContent = 'Eksempler på bias';
      card.appendChild(eksLabel);
      const ul = document.createElement('ul');
      ul.className = 'arg-list';
      data.perspektiv.eksempler.forEach(function(e) {
        const li = document.createElement('li');
        li.textContent = e;
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }

    if (data.perspektiv.utelatt && data.perspektiv.utelatt.length) {
      const utLabel = document.createElement('div');
      utLabel.className = 'kk-list-label';
      utLabel.textContent = 'Utelatte perspektiver';
      card.appendChild(utLabel);
      const ul = document.createElement('ul');
      ul.className = 'arg-list';
      data.perspektiv.utelatt.forEach(function(u) {
        const li = document.createElement('li');
        li.textContent = u;
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }

    grid2.appendChild(card);
  }

  // Kort 6: Samlet innholdsvurdering
  if (data.samlet_innhold) {
    grid2.appendChild(renderSamletCard('Samlet innholdsvurdering', 'innhold', data.samlet_innhold));
  }

  sec.appendChild(grid2);
}

// Helper: render samlet vurdering-kort med trafikklys
function renderSamletCard(title, type, samlet) {
  const card = document.createElement('div');
  card.className = 'begrep-card';
  const t = document.createElement('h3');
  t.className = 'begrep-title';
  t.textContent = title;
  card.appendChild(t);

  const validStyrke = ['sterk', 'middels', 'svak'];
  const styrke = validStyrke.indexOf(samlet.styrke) !== -1 ? samlet.styrke : 'middels';
  const indicator = document.createElement('div');
  indicator.className = 'kk-styrke kk-styrke--' + styrke;
  const dot = document.createElement('span');
  dot.className = 'kk-dot';
  const styrkeLabels = {
    kilde: { sterk: 'Sterk kilde', middels: 'Middels kilde', svak: 'Svak kilde' },
    innhold: { sterk: 'Sterkt innhold', middels: 'Middels innhold', svak: 'Svakt innhold' },
  };
  const styrkeTxt = document.createElement('span');
  styrkeTxt.textContent = (styrkeLabels[type] || styrkeLabels.kilde)[samlet.styrke] || 'Vurdering ikke tilgjengelig';
  indicator.appendChild(dot);
  indicator.appendChild(styrkeTxt);
  card.appendChild(indicator);

  if (samlet.vurdering) {
    const vurd = document.createElement('div');
    vurd.className = 'begrep-forklaring';
    vurd.textContent = samlet.vurdering;
    card.appendChild(vurd);
  }
  if (samlet.bruksomrade) {
    const bruk = document.createElement('div');
    bruk.className = 'kk-field';
    const brukLabel = document.createElement('span');
    brukLabel.className = 'kk-label';
    brukLabel.textContent = 'Kan brukes til: ';
    const brukVal = document.createElement('span');
    brukVal.textContent = samlet.bruksomrade;
    bruk.appendChild(brukLabel);
    bruk.appendChild(brukVal);
    card.appendChild(bruk);
  }
  if (samlet.begrensninger) {
    const begr = document.createElement('div');
    begr.className = 'kk-field';
    const begrLabel = document.createElement('span');
    begrLabel.className = 'kk-label';
    begrLabel.textContent = 'Kan IKKE brukes til: ';
    const begrVal = document.createElement('span');
    begrVal.textContent = samlet.begrensninger;
    begr.appendChild(begrLabel);
    begr.appendChild(begrVal);
    card.appendChild(begr);
  }

  return card;
}
```

**Step 2: Verifiser manuelt**

Start dev server og last opp en test-PDF for å sjekke at gruppeoverskriftene og kortene rendres korrekt.

**Step 3: Commit**

```bash
git add app.js
git commit -m "feat: rendre kildekritikk i to grupper — Kilden og Innholdet"
```

---

### Task 3: Legg til CSS for gruppeoverskrifter og nye kort

**Files:**
- Modify: `style.css` (legg til etter `.kk-dot`-reglene, rundt linje 110)

**Step 1: Legg til nye CSS-klasser**

```css
.kk-group-title{font-family:'Playfair Display',serif;font-size:1.05rem;font-weight:700;color:var(--dg);margin:24px 0 2px;padding-top:8px;border-top:1px solid rgba(0,0,0,.08)}
.kk-group-title:first-of-type{margin-top:16px;border-top:none}
.kk-group-sub{font-size:.82rem;color:var(--gl);margin-bottom:12px}
.kk-pastand{padding:8px 0;border-bottom:1px solid rgba(0,0,0,.04)}
.kk-pastand:last-child{border-bottom:none}
.kk-pastand-title{font-weight:600;color:var(--dg);margin-bottom:4px}
.kk-list-label{font-size:.82rem;font-weight:600;color:var(--gl);margin-top:12px;margin-bottom:4px;text-transform:uppercase;letter-spacing:.03em}
```

**Step 2: Verifiser visuelt**

Start dev server, generer innhold, og sjekk at gruppeoverskriftene har riktig typografi og spacing.

**Step 3: Commit**

```bash
git add style.css
git commit -m "style: legg til CSS for kildekritikk-gruppeoverskrifter og nye kort"
```

---

### Task 4: Oppdater downloadHTML med ny tab-struktur

**Files:**
- Modify: `app.js:787-788` (standaloneJS tab-IDs er uendret, men verifiser)

**Step 1: Sjekk at tabIds i standaloneJS er korrekt**

Tab-IDene (`sammendrag`, `sporsmal`, `argumentasjon`, `kildekritikk`, `flashcards`) er uendret — kildekritikk er fortsatt én fane. Ingen kodeendring nødvendig her.

Verifiser at nedlastet HTML-fil rendrer kildekritikk-fanen korrekt med begge grupper.

**Step 2: Commit (kun hvis endringer)**

Ingen commit hvis ingen kodeendring er nødvendig.

---

### Task 5: Oppdater eksisterende designdokumenter

**Files:**
- Delete or mark as superseded: `docs/plans/2026-03-21-kildekritikk-design.md`
- Delete or mark as superseded: `docs/plans/2026-03-21-kildekritikk-implementering.md`

**Step 1: Legg til notis i gamle planer**

Legg til øverst i begge filer:

```
> **Erstattet av:** `2026-03-21-kildekritikk-utvidelse-design.md` og `2026-03-21-kildekritikk-utvidelse-implementering.md`
```

**Step 2: Commit**

```bash
git add docs/plans/
git commit -m "docs: merk gamle kildekritikk-planer som erstattet"
```
