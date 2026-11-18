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
copy `.env.example` to `.env.local` and set the variables. The dev server must stay on port 5173: it's the
only origin the local Keycloak client accepts. Unit tests always use the mocks, whatever `.env.local` says.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with mocks |
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | Unit and component tests (Vitest, Testing Library, MSW, axe) |
| `npm run e2e` | Playwright: a smoke test per persona, keyboard-only walkthrough, axe WCAG 2.2 AA in light and dark, 375 px layouts (uses installed Chrome; `PW_CHANNEL=chromium` for Playwright's own) |
| `npx playwright test -c playwright.real.config.ts` | The same checks plus `e2e/real/` (every persona flow, every screen in light, dark and 375 px) against a running stack: the gateway on 9191 and Keycloak on 7080, from `fyp-grading-docker-compose`. Each test makes its own copy, so lift the gateway's copy limit for the run (see the config) |
| `ASSAY_BASE_URL=http://localhost:8080 npx playwright test -c playwright.real.config.ts` | The same, against a deployed stack: the built image behind the production compose's edge, which serves the app and proxies `/api` and `/realms/assay` on one origin. No dev server is started |
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

The demo personas (Rania, coordinator; Jane, jury; Karim, advisor; two students on one card: Nour, Team Alpha,
with every result out, and Ahmad, Team Beta, still waiting on results) share a public
password, `assay-demo`. They exist only in the demo realm and hold no real data.

## Docker image

CI builds the image on every pull request and, from `master`, publishes it to
`ghcr.io/firaskhalife/fyp-grading-frontend` (tags `latest` and the short commit SHA, amd64 and arm64). That build
talks to the real stack on its own origin: `VITE_API_MOCKING=off`, `VITE_OIDC_AUTHORITY=/realms/assay` (a path is
resolved against the page's origin) and no `VITE_API_BASE_URL`. So the same image works on any domain, as long as
`/api` and `/realms/assay` are proxied there, as the production compose's edge does
(`fyp-grading-docker-compose/docker-compose/prod`). A build without those arguments serves the offline demo (MSW).

The image serves the app with unprivileged nginx (`nginxinc/nginx-unprivileged`, uid 101) on port **8080**, with
pre-compressed assets (`gzip_static`), year-long caching for the hashed `/assets/` and security headers. Its package
manager is removed. CI scans it with Trivy before pushing (a HIGH or CRITICAL finding with a fix fails the build; the
report goes to GitHub code scanning), attaches an SBOM and build provenance, and signs it with cosign. Dependabot
proposes weekly updates for npm, the base images (pinned by digest) and the GitHub Actions (pinned by commit SHA).
