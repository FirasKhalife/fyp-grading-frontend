# Assay frontend

The web app of **Assay**, a final-year-project grading platform: several reviewers grade a team
against one shared rubric, Assay does the arithmetic, and students see how and why they were graded.
It is also a public portfolio demo: pick a role on the landing page and click around.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173, with the API mocked in the browser (MSW)
```

No backend is needed: [MSW](https://mswjs.io) serves every endpoint of the API contract from a
private copy of the demo data kept in your browser. To use the real gateway and Keycloak instead,
copy `.env.example` to `.env.local` and set the variables.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with mocks |
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | Unit and component tests (Vitest, Testing Library, MSW, axe) |
| `npm run e2e` | Playwright: a smoke test per persona, keyboard-only walkthrough, axe WCAG 2.2 AA in light and dark, 375 px layouts (uses installed Chrome; `PW_CHANNEL=chromium` for Playwright's own) |
| `npm run lint` | ESLint |
| `npm run gen:api` | Regenerate `src/api/schema.d.ts` from `../contract/openapi.yaml` |

## How it's built

- React 19, TypeScript (strict), Vite, React Router.
- Tailwind CSS v4. Design tokens (light and a separately designed dark theme) are CSS variables in
  `src/styles/globals.css`, mapped with `@theme`.
- Radix primitives restyled in the shadcn/ui way (`src/components/ui`), Sonner for toasts.
- TanStack Query over a repository built on the OpenAPI contract (`src/api`); live updates over
  Server-Sent Events.
- Sign-in with Keycloak through `oidc-client-ts`: persona cards use the public demo accounts,
  "Sign in with email" uses the authorization code flow with PKCE.

```
src/
  api/          contract types (generated), fetch client, repository, query hooks
  auth/         personas, demo session id, OIDC
  domain/       types, levels, assessments
  lib/          score maths, demo clock (dates relative to "today"), time zone
  components/   ui primitives, Assay marks and states, app shell
  features/     one folder per screen
  mocks/        MSW handlers for the contract, demo seed, in-browser demo copy
e2e/            Playwright specs
```

### Rules worth knowing

- **Level mark.** A level is always shown with three cues together: filled bars, the numeral, and the
  name where there is room. Colour is only a fourth cue. Any 0–100 score uses the mark of its band.
- **Score maths** (`src/lib/scoring.ts`, unit-tested): reviewer score = Σ(level × weight) ÷ 4;
  team grade = plain average of the reviewers; final grade = Σ(grade × assessment weight), once all
  five are final.
- **Dates are relative.** "Today" is always defense day 2; every demo date is an offset from it.
  Times are shown in Europe/Paris.

## Demo accounts

The demo personas (Rania, coordinator; Jane, jury; Karim, advisor; Nour, student) share a public
password, `assay-demo`. They exist only in the demo realm and hold no real data.
