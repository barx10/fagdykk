# Fagdykk

Dykk ned i fagstoffet. KI-drevet verktøy for å forstå det som ikke står skrevet.

Last opp en PDF eller DOCX, lim inn tekst, eller legg inn en lenke — og få et sammendrag, argumentasjonsanalyse, kildekritikk og spørsmål med svar.

**Prøv det:** [fagdykk.vercel.app](https://fagdykk.vercel.app)

## Funksjoner

- **Sammendrag** — nøkkelpunkter per tema
- **Spørsmål & Svar** — øvelsesspørsmål med fasit
- **Argumentasjon** — hovedpåstander med argumenter og motargumenter
- **Kildekritikk** — systematisk vurdering av kildens troverdighet
- **Last ned** — ta med fagdykket offline som HTML

## Kom i gang

Appen bruker BYOK (Bring Your Own Key). Du trenger en API-nøkkel fra Google Gemini eller OpenAI. Nøkkelen lagres kun lokalt i nettleseren din.

1. Gå til [fagdykk.vercel.app](https://fagdykk.vercel.app)
2. Klikk **API** og legg inn nøkkelen din
3. Last opp fagstoff og klikk **Ta et fagdykk**

## Lokal utvikling

```bash
npm install
npm run dev
```

Krever Node.js >= 18.

## Teknologi

- Vanilla HTML/CSS/JS — ingen rammeverk
- [Vercel](https://vercel.com) serverless functions
- [Google Gemini](https://ai.google.dev/) og [OpenAI](https://platform.openai.com/) API
- [Mammoth](https://github.com/mwilliamson/mammoth.js) for DOCX-parsing

## Laget av

**Kenneth Bareksten** — lærer og hobbyprogrammerer.
[laererliv.no](https://www.laererliv.no)
