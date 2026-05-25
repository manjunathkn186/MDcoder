import type { Config } from "tailwindcss";
/**
 * Tailwind is bound to the runtime CSS-variable contract in
 * `src/themes/tokens.css`. Theme switching never touches Tailwind — it
 * just rewrites the variables, so every utility adapts immediately.
 *
 * Dark mode is toggled via `[data-theme="dark"]` on <html>, but most
 * components rely on semantic tokens rather than the `dark:` variant.
 */
declare const config: Config;
export default config;
