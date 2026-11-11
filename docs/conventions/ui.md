# UI

- UI code lives in `src/ui`: `app/` composes the screen, `features/` holds one folder per screen feature (`features/api-key/`).
- Shared UI code goes to `src/ui/components/` or `src/ui/hooks/`, created only when something is shared.
- A feature never imports another feature; `app/` composes them.
- Imports flow one way: shared → features → app.
- A feature folder keeps together its components, hooks, plain logic, styles and tests.
- One exported component per file; a small private subcomponent may stay in the same file until it grows.
- A component gets its own file when it is a distinct block on screen, has its own state, or has more than one parent.
- `app/` only lays out and composes features: no loose text or logic of its own.
- Import files directly; no barrel `index.ts` files.
