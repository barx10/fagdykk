> **Erstattet av:** `2026-03-21-kildekritikk-utvidelse-design.md` og `2026-03-21-kildekritikk-utvidelse-implementering.md`

# Kildekritikk som sentral fane

## Endringsoversikt

| Før (6 faner) | Etter (5 faner) |
|---|---|
| Sammendrag | Sammendrag (uten metodekritikk) |
| Spørsmål & Svar | Spørsmål & Svar (uendret) |
| Argumentasjon | Argumentasjon (uten gap/utelatte perspektiver) |
| Ordforklaring | **Kildekritikk** (ny) |
| Tverrfaglig | Flashcards (inkl. fagtermer som `cat: "begrep"`) |
| Flashcards | |

## Tab-rekkefølge

1. Sammendrag
2. Spørsmål & Svar
3. Argumentasjon
4. Kildekritikk (ny)
5. Flashcards

## Kildekritikk-fanen — 4 klikkbare kort

### Kort 1: Kildevurdering

- Forfatter/utgiver — autoritet, tilknytning, interessekonflikter
- Publiseringskanal — fagfellevurdert, forlag, type
- Finansiering/oppdragsgiver
- Aktualitet — publiseringstidspunkt, fortsatt relevant?

### Kort 2: Metodekritikk (flyttes fra sammendrag)

- Forskningsdesign — styrker og svakheter
- Utvalg — størrelse, representativitet, seleksjonsbias
- Operasjonalisering — måler de det de påstår?
- Konfounders — hva er ikke kontrollert for?
- Generaliserbarhet

### Kort 3: Argumentasjonskritikk (flyttes fra argumentasjon)

- Logiske feilslutninger — konkrete eksempler
- Gap mellom evidens og konklusjon
- Utelatte perspektiver

### Kort 4: Samlet kildevurdering

- Trafikklys-indikator (sterk/middels/svak)
- Kvalitativ helhetsvurdering
- Hva kilden kan brukes til / ikke brukes til

## Øvrige endringer

- **Sammendrag**: Fjern "Metodekritikk" som siste tema (dekkes nå av kildekritikk)
- **Argumentasjon**: Beholder påstander, argumenter, evidens, motargumenter, vurdering — men fjerner "gap mellom evidens og konklusjon" og "utelatte perspektiver"
- **Ordforklaring**: Fjernes helt — fagtermer blir flashcards med `cat: "begrep"`
- **Tverrfaglig**: Fjernes helt
- **Visuell stil**: Kortbasert som argumentasjon-fanen, konsistent med resten av appen

## JSON-struktur (ny)

```json
"kildekritikk": {
  "kildevurdering": {
    "forfatter": "...",
    "publiseringskanal": "...",
    "finansiering": "...",
    "aktualitet": "..."
  },
  "metodekritikk": ["Punkt 1", "Punkt 2"],
  "argumentasjonskritikk": ["Punkt 1", "Punkt 2"],
  "samlet": {
    "styrke": "sterk|middels|svak",
    "vurdering": "...",
    "bruksomrade": "...",
    "begrensninger": "..."
  }
}
```

## Faner som fjernes

- `tverrfaglig` — fjernes helt fra prompt og UI
- `ordforklaring` — fjernes som egen fane, fagtermer blir flashcards med `cat: "begrep"`
