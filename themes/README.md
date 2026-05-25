# Themes

Distributable user themes live here as standalone `*.css` files that **only**
override CSS variables from `src/themes/tokens.css`. Never style component
internals — the token contract is the entire surface area.

## Authoring a theme

Create `themes/my-theme.css`:

```css
[data-theme="my-theme"] {
  --ink-bg: #0a0a0a;
  --ink-fg: #f5f5f5;
  --ink-accent: #f97316;
  /* …override any tokens you need */
}
```

Register it via the theme registry (Phase 3) or load it as a plugin contribution.
