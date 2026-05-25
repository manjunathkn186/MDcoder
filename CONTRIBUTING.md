# Contributing to Inkstone

Thanks for considering a contribution! This document describes the small set
of rules we follow so the project stays maintainable.

## Getting started

```bash
git clone https://github.com/your-org/inkstone
cd inkstone
npm ci
npm run tauri:dev
```

See [BUILD.md](./BUILD.md) for prerequisites and the full build matrix.

## Where to make changes

| Area | Path |
|---|---|
| Editor (CodeMirror 6) | `src/features/editor/` |
| Preview pipeline | `src/features/preview/`, `src/markdown/` |
| Workspace / explorer | `src/features/explorer/`, `src/services/` |
| UI primitives + themes | `src/ui/`, `src/themes/`, `src/styles/` |
| Plugin SDK | `src/plugins/` |
| Export / packaging | `src/services/export/`, `src-tauri/tauri.conf.json` |
| Rust shell | `src-tauri/src/` |
| Docs | `docs/` and the top-level `*.md` |

## Branching + commits

- Branch off `main`. Use the prefixes `feat/`, `fix/`, `docs/`, `chore/`.
- Use [Conventional Commits](https://www.conventionalcommits.org):

  ```
  feat(editor): add foldable callout blocks
  fix(workspace): debounce watcher events
  docs(install): clarify Linux deps
  ```

- Squash trivial fix-up commits before requesting review.

## Code style

- TypeScript strict mode. Avoid `any`; prefer narrow types or generics.
- ESLint runs with zero warnings (`npm run lint`).
- Prettier formats everything (`npm run format`).
- React: function components only. Hooks at top of body. Keep effects
  small and add explicit dependency arrays.
- Avoid duplicating logic — refactor first if you find yourself copy-pasting.
- Comment only when the **why** isn't obvious. Code should explain the **what**.

## Tests

- Unit tests live under `tests/` and run with Vitest:

  ```bash
  npm run test
  npm run test:watch
  ```

- Add a test alongside any non-trivial new logic (parser plugins, store
  reducers, search ranking, plugin runtime).
- Keep tests deterministic — do not rely on wall-clock time or real fs unless explicitly necessary.

## Submitting changes

1. Run the validation suite locally:

   ```bash
   npm run typecheck && npm run lint && npm run test
   make build
   ```

2. Open a Pull Request against `main`. Use the PR template.
3. CI (`.github/workflows/ci.yml`) runs the same checks plus a Rust build.
4. At least one approving review is required.

## Documentation

Every user-visible change must include a docs/README update. The
documentation lives in two places:

- Top-level: `README.md`, `README.txt`, `INSTALL.md`, `BUILD.md`,
  `CHANGELOG.md`.
- Design notes per subsystem: `docs/*`. If your change introduces a new
  module or significantly reshapes one, update the matching doc.

## Plugin contributions

If you contribute a built-in plugin, place it under `src/plugins/builtin/`
and register it in `src/plugins/builtin/index.ts`. Untrusted samples go
under `plugins/`. See [docs/PLUGIN_SDK.md](docs/PLUGIN_SDK.md) for the
authoring guide.

## Security

If you discover a security issue, **do not** open a public issue. Email
the maintainers at `security@inkstone.app` (placeholder). We will
respond within 72 hours and coordinate disclosure.

## Code of conduct

Be kind, be clear, and assume good intent. We follow the
[Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
Inappropriate behaviour will result in a temporary or permanent ban from
the project.

## License

By contributing you agree to release your work under the project's
[MIT License](./LICENSE).
