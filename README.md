# Stepback

> Nothing happening is the biggest win.

Stepback is a community app for everyday hazards. People record a close call, a crash they saw on video, or a fall in a parent's bathroom as **hazard → exposure → avoiding action**, and hand the lesson to the next person as a **ticket**, the way meal vouchers are pinned to a café wall for whoever needs one.

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
| `CURRENCY` | `USD` | ISO 4217 code used for safety-fund pledges |

The UI ships in English and Korean. The language follows the browser, and a selector in the header overrides it. Adding a locale means adding one dictionary in `web/js/i18n.js`, one page in `web/js/views/about.js`, and labels in `server/domain/catalog.js` and `server/domain/risk.js`.

## Layout

```
server/
  index.js          entry point (open DB → seed → listen)
  app.js            Express wiring, visitor-identity middleware, error handling
  db.js             schema + Repo (every SQL statement lives here)
  seed.js           starter cases
  domain/
    risk.js         risk = severity × likelihood (5×5 matrix), vocabulary
    catalog.js      categories, outcomes, locales
    validate.js     input validation with machine-readable error codes
  routes/
    cases.js        list / detail / create, take a lesson, pin a ticket
    tickets.js      the wall, take a ticket
    stats.js        aggregates
web/
  index.html        single page (hash router)
  css/app.css       design tokens, light/dark
  js/
    main.js         router, header, language and name controls
    i18n.js         UI strings (en, ko)
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
- A safety-fund pledge is a **pledge**, not a payment (v1).

## Known limits and roadmap

- Visitors are identified by a browser-local id, not an account. → accounts / social login.
- No reporting or moderation yet. → report, hide, merge duplicates.
- Pledges are only recorded. → payments and a public ledger of what the fund bought.
- No map. → browse by place type or region, "lessons near me".
- Weekly digest, image and video attachments, more locales.
