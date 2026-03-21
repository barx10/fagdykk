# Kildekritikk-utvidelse: Troverdighet og innholdsanalyse

## Bakgrunn

Nåværende kildekritikk-fane vurderer primært kilden som avsender (forfatter, metode, logikk) og gir en samlet vurdering. Det som mangler er vurdering av troverdigheten til *innholdet selv* — kan påstandene verifiseres, og hvilke perspektiver/bias preger fremstillingen?

## Ny struktur: To grupper

Fanen deles visuelt i to grupper med egne overskrifter.

### Gruppe 1: Kilden
*"Hvem står bak, og hvordan ble kunnskapen produsert?"*

| Kort | Innhold | Status |
|------|---------|--------|
| Kildevurdering | Forfatter, publiseringskanal, finansiering, aktualitet | Uendret |
| Metodekritikk | Forskningsdesign-svakheter | Uendret |
| Samlet kildevurdering | Trafikklys + helhetsvurdering + bruksområde/begrensninger | Omdøpt felt: `samlet` → `samlet_kilde` |

### Gruppe 2: Innholdet
*"Hva påstås, og hva er utelatt?"*

| Kort | Innhold | Status |
|------|---------|--------|
| Påstandsanalyse | Nøkkelpåstander med intern underbygging og plassering mot feltets konsensus | Nytt |
| Perspektiv & bias | Overordnet ramme → konkrete eksempler (ordvalg, framing, kildeseleksjon) → utelatte perspektiver | Nytt |
| Samlet innholdsvurdering | Eget trafikklys (sterk/middels/svak) + kvalitativ troverdighets-vurdering | Nytt |

### Fjernet
- **Argumentasjonskritikk** — dekkes nå av påstandsanalyse og perspektiv & bias

## JSON-struktur

```json
"kildekritikk": {
  "kildevurdering": {
    "forfatter": "...",
    "publiseringskanal": "...",
    "finansiering": "...",
    "aktualitet": "..."
  },
  "metodekritikk": ["Punkt 1", "Punkt 2"],
  "samlet_kilde": {
    "styrke": "sterk|middels|svak",
    "vurdering": "...",
    "bruksomrade": "...",
    "begrensninger": "..."
  },
  "pastandsanalyse": [
    {
      "pastand": "Nøkkelpåstand fra teksten",
      "underbygging": "Vurdering av intern evidens",
      "konsensus": "Hvordan påstanden står seg mot etablert forskning"
    }
  ],
  "perspektiv": {
    "ramme": "Overordnet teoretisk/ideologisk posisjon",
    "eksempler": ["Konkret eksempel på bias i teksten"],
    "utelatt": ["Perspektiv som mangler"]
  },
  "samlet_innhold": {
    "styrke": "sterk|middels|svak",
    "vurdering": "Kvalitativ helhetsvurdering av innholdets troverdighet"
  }
}
```

## Prompt-endringer

1. JSON-skjemaet i prompten oppdateres til ny struktur
2. Nye instruksjoner:
   - Påstandsanalyse: identifiser 2-4 nøkkelpåstander, vurder intern underbygging, plasser mot feltets konsensus
   - Perspektiv & bias: beskriv overordnet ramme, gi 2-3 konkrete eksempler, list utelatte perspektiver
3. Minimumskrav oppdateres til "alle seks deler utfylt"

## UI-rendering

- Gruppeoverskrifter rendres som `h3` med subtekst før hver kortgruppe
- Påstandsanalyse: liste med påstander, hver med underbygging og konsensus som undertekst
- Perspektiv & bias: innledende ramme-tekst, deretter to lister (eksempler, utelatt)
- Samlet innholdsvurdering: identisk layout som samlet kildevurdering (trafikklys + vurdering)
- Argumentasjonskritikk fjernes fra rendering
