# Stepback

> Nothing happening is the biggest win.

Stepback is a community app for everyday hazards. People record a close call, a crash they saw on video, or a fall in a parent's bathroom as **hazard → exposure → avoiding action**, and hand the lesson to the next person as a **ticket**, the way meal vouchers are pinned to a café wall for whoever needs one.

Stepback is a public good: free for everyone, no ads, no tracking, no money inside the product. The code is AGPL-3.0, every case is CC BY-SA 4.0, and the whole dataset is downloadable. The commitments and the examples they come from (Wikipedia, OpenStreetMap, iNaturalist, NASA's aviation safety reporting system) are in [docs/CHARTER.md](docs/CHARTER.md) ([한국어](docs/ko/CHARTER.md)).

The reasoning behind the design (economics, sociology, marketing) is in [docs/CONCEPT.md](docs/CONCEPT.md) ([한국어](docs/ko/CONCEPT.md)); the HTTP API is in [docs/API.md](docs/API.md).

## Run it

```bash
npm install
npm start          # http://localhost:3000  (seeds 12 starter cases on first run)
npm run dev        # restart on file changes
npm test           # API integration tests against an in-memory database
```

Requires Node 22.13 or newer. The database is Node's built-in `node:sqlite`, so there is nothing native to build.

| Env var | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `data/stepback.db` | SQLite file (`:memory:` for tests) |
| `SOURCE_URL` | this repository | Link to the source shown in the footer, as the AGPL asks of a network service. Point it at your fork. |

## Languages

The UI ships in 15 languages: English, Arabic, German, Spanish, French, Hindi, Indonesian, Italian, Japanese, Korean, Portuguese, Russian, Turkish, Vietnamese and Chinese (Simplified). The language follows the browser and a selector in the header overrides it. Arabic renders right-to-left.

Each language is one file in `locales/<code>.json` holding the UI strings, the category / outcome / risk labels and the About page. The server reads these files for `/api/meta`, and the browser fetches the same files, so there is a single source of truth per language. To add a language, copy `locales/en.json`, translate it, and restart; `npm test` checks that every file carries the same keys.

The non-English translations were drafted by an AI model and have not yet been reviewed by native speakers. Corrections are welcome as plain edits to the JSON files.

## Licences

- Code: [GNU AGPL-3.0](LICENSE).
- Content (cases and tickets): [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Contributors agree to this when they save a case; the form says so.
- Open data: `GET /api/export` returns every public case and ticket with the licence attached and no visitor ids.

## Design

The page is deliberately conventional: white background, system font, blue links, one-pixel borders, a list for the feed. No gradients, shadows or dark mode. The whole stylesheet is `web/css/app.css`.

## Layout

```
server/
  index.js          entry point (open DB → seed → listen)
  app.js            Express wiring, visitor-identity middleware, error handling
  db.js             schema + Repo (every SQL statement lives here)
  seed.js           starter cases
  domain/
    risk.js         risk = severity × likelihood (5×5 matrix), vocabulary
    catalog.js      category and outcome keys
    locales.js      loads locales/*.json, picks a locale, resolves labels
    validate.js     input validation with machine-readable error codes
  routes/
    cases.js        list / detail / create, take a lesson, pin a ticket
    tickets.js      the wall, take a ticket
    stats.js        aggregates
locales/
  en.json …         one file per language: UI strings, labels, About page
web/
  index.html        single page (hash router)
  css/app.css       plain stylesheet
  js/
    main.js         router, header, language and name controls
    i18n.js         loads locale files, t() lookup with English fallback
    api.js          fetch wrapper (attaches visitor headers)
    identity.js     browser-local visitor id
    ui.js           DOM helpers, formatting
    views/          feed · caseDetail · newCase · wall · about
test/
  api.test.js       end-to-end API tests with node:test
```

## Rules the server enforces

- A lesson is taken once per visitor per case.
- Pinning a ticket records the giver as having taken the lesson. A ticket can be taken by **exactly one** person, never by its giver, and a visitor can take only one ticket per case. Taking a ticket also records the lesson.
- There is no money anywhere: no payments, pledges or funds. See the charter for why.

## Known limits and roadmap

- Visitors are identified by a browser-local id, not an account. → accounts / social login.
- No reporting or moderation yet. → report, hide, merge duplicates.
- No moderation log yet. → public log of hidden items and reasons (see the governance table in the charter).
- No map. → browse by place type or region, "lessons near me".
- Weekly digest, image and video attachments, native review of translations, more locales.
