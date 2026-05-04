# AGENTS.md

## Repository overview
- This repo has three active apps: `frontend/`, `backend_legacy/`, and `mobile/`.
- There is no root `package.json` or workspace runner; run commands per package.
- Several docs still say `backend/`, but the real backend path in this repo is `backend_legacy/`.
- `n8n-workflows/` contains automation JSON and docs, not runtime app code.
- No Cursor rules or Copilot instructions were found in `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md`.

## Working assumptions for agents
- Prefer package-local commands instead of inventing root workflows.
- Match the style of the file you edit; this repo does not have one formatter enforced everywhere.
- Keep diffs focused and avoid broad reformatting.
- Preserve Spanish domain terms already used by the product and API (`inspeccion`, `arquitecto`, `pendiente`, etc.).

## Build, lint, and dev commands

### Frontend (`frontend/`)
```bash
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend run lint
npm --prefix frontend run preview
```

### Backend (`backend_legacy/`)
```bash
npm --prefix backend_legacy run dev
npm --prefix backend_legacy run start
npm --prefix backend_legacy run migrate
npm --prefix backend_legacy run seed
npm --prefix backend_legacy run verify
npm --prefix backend_legacy run lint
npm --prefix backend_legacy run test
```

### Mobile (`mobile/`)
```bash
npm --prefix mobile run start
npm --prefix mobile run android
npm --prefix mobile run ios
npm --prefix mobile run web
npm --prefix mobile run build:android
npm --prefix mobile run build:ios
npm --prefix mobile run submit
```

## Test commands
- Backend is the only package with an automated test script right now.
- There are currently no committed test files under `backend_legacy/`, `frontend/`, or `mobile/`.
- `frontend/` has no `test` script or test dependencies configured.
- `mobile/` has no `test` or `lint` script configured.

### Run all backend tests
```bash
npm --prefix backend_legacy run test
```

### Run a single backend test file
```bash
npm --prefix backend_legacy run test -- path/to/file.test.js
```

### Run a single backend test by test name
```bash
npm --prefix backend_legacy run test -- -t "name of test"
```

### Run Jest directly for tighter targeting
```bash
npx --prefix backend_legacy jest path/to/file.test.js --runInBand
npx --prefix backend_legacy jest path/to/file.test.js -t "name of test" --runInBand
```

### Suggested backend test placement
- Use default Jest names: `*.test.js` or `*.spec.js`.
- Keep tests inside `backend_legacy/`, ideally next to the module under test or in `__tests__/`.
- Prefer `supertest` for route or integration coverage; it is already installed.

## Lint and build notes
- Frontend build is `tsc -b && vite build`; type errors fail the build.
- Frontend lint uses ESLint 9 flat config from `frontend/eslint.config.js`.
- Frontend TS is strict in `frontend/tsconfig.app.json` with `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` enabled.
- Backend has a lint script but no local ESLint config file was found; do not assume custom rules beyond standard ESLint behavior.

## Architecture conventions

### Frontend
- Stack: React 19, TypeScript, Vite, Tailwind CSS, Zustand, Axios, React Router.
- `frontend/src/api/axios.ts` owns Axios setup and auth token injection.
- Frontend talks to n8n webhooks directly; there is no local Vite proxy.
- `frontend/src/services/*.service.ts` contains API-facing logic.
- `frontend/src/store/*Store.ts` contains Zustand state.
- Shared frontend domain types live in `frontend/src/types/index.ts`.

### Backend
- Stack: Node.js, Express 4, Sequelize, PostgreSQL, Joi, JWT.
- `src/routes/` wires auth/authorization and delegates to controllers.
- `src/controllers/` parses request input, calls services, shapes HTTP responses, and triggers audit logging.
- `src/services/` contains business rules and database access.
- `src/models/` contains Sequelize models and associations.
- Reuse `AppError` and `asyncHandler` from `src/middlewares/errorHandler.js`.

### Mobile
- Stack: React Native + Expo with plain JavaScript.
- `mobile/src/services/api.js` owns Axios setup and API wrappers.
- `mobile/src/context/AuthContext.js` manages session state and persistence.
- `mobile/src/config/index.js` stores constants and backend URL.
- Most UI lives in `mobile/src/screens/` and uses `StyleSheet.create`.

## Imports and modules
- Frontend uses ESM `import`/`export`; backend and mobile use CommonJS.
- Keep third-party imports first, then local imports.
- Use relative imports; no path alias config exists.
- In TypeScript, prefer `import type` for type-only imports when practical.
- Do not convert backend or mobile files to ESM unless a wider migration is intended.

## Formatting
- There is no repo-wide Prettier config.
- Preserve the surrounding file's indentation and semicolon style.
- `backend_legacy/` and `mobile/` mostly use 4-space indentation and semicolons.
- `frontend/` is mixed: infra files often use 2 spaces and no semicolons, while many app files use 4 spaces and semicolons.
- Avoid reflowing comments or reordering imports unless the change requires it.

## Types and data contracts
- Respect strict TypeScript constraints in the frontend.
- Update `frontend/src/types/index.ts` when frontend API contracts change.
- Prefer explicit interfaces and union types for payloads, statuses, and roles.
- Avoid introducing new `any`; prefer `unknown` plus narrowing unless a library boundary makes `any` unavoidable.
- In JavaScript packages, compensate with Joi validation, Sequelize validation, and clear response shapes.

## Naming conventions
- React components, pages, and providers use PascalCase filenames and exports (`Navbar.tsx`, `Login.tsx`, `PrivateRoute.tsx`).
- Zustand hooks and stores use camelCase with a `use` prefix (`useAuthStore`) and store filenames ending in `Store.ts`.
- Frontend service files use dotted lowercase names like `auth.service.ts`.
- Backend controllers use singular names with `Controller` suffix (`userController.js`).
- Backend services use singular names with `Service` suffix (`inspectionService.js`), validators use `Validator`, and route files are pluralized with `Routes` suffix.
- Sequelize models are singular PascalCase (`User`, `Inspection`, `ChecklistTemplate`).
- Use camelCase for variables, functions, and object keys unless the API or database contract requires another shape.

## Error handling
- Backend controllers should be wrapped in `asyncHandler`.
- Throw `AppError(message, statusCode, code, details)` for operational errors that clients should handle.
- Keep backend success responses consistent with the current shape: `success`, optional `message`, `data`, and sometimes `pagination`.
- Keep backend error responses consistent with `success: false` plus an `error` object containing `code` and `message`.
- Permission checks already live largely in the service layer; extend them there instead of scattering role logic across routes.
- Frontend surfaces failures through `react-hot-toast`; mobile uses `Alert` and context return objects.
- On auth failures, preserve the current behavior of clearing stored auth and redirecting or logging out.

## API and auth expectations
- Frontend auth state is persisted in `localStorage` keys `token` and `user`.
- Mobile auth state is persisted via `AsyncStorage` keys defined in `mobile/src/config/index.js`.
- Backend roles and statuses are Spanish strings; reuse existing literals instead of translating them.
- Do not rename response fields casually; frontend and mobile depend on the current contract.

## When adding new code
- Read a sibling file first and mirror its structure.
- For frontend work, update types, service calls, and store or UI code together.
- For backend work, expect to touch route, controller, service, validator, and sometimes model layers.
- If you add tests, add them where a runner already exists unless you are also wiring the missing tooling.
- If you change commands or folder names, update stale docs that still mention `backend/` so they reflect `backend_legacy/`.
