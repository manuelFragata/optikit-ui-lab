# optikit-ui-lab

A sandbox for trying out ideas for the Optikit UI revamp. It uses the same stack as the production app (Vite, React 19, strict TypeScript, MUI 7 with Emotion, `@mui/icons-material`), so components built here can be ported over. Storybook (React + Vite) is the main way to view them.

**Live Storybook:** https://manuelfragata.github.io/optikit-ui-lab/

## Run it

```bash
npm install
npm run storybook        # http://localhost:6006
npm run dev              # the app: Home (#/) and Editor (#/editor)
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run typecheck` | `tsc` in strict mode |
| `npm run build` | typecheck, then build the Vite app into `dist/` |
| `npm run build-storybook` | build static Storybook into `storybook-static/` |

## Where the tokens live

All raw values are in **`src/theme/tokens.ts`**. They follow the **Bench** direction (hairlines instead of fills, labels and values in mono, one accent used sparingly):

- `brand`: anchor navy (wordmark and page titles, light mode only) and lime (logo only)
- `colors.light` / `colors.dark`: accent, accent hover and soft, status, surface, sunken, line, ink 1–3
- `canvasColors` and `rayColors`: the drawing surface, which never uses brand colour
- radius (3px), spacing and density, layout dimensions, font families and the Bench type scale

Values marked `(derived)` are not on the Bench sheet: some dark-mode greys and rays, and the warning/error colours. To try a new colour or size, edit that file.

`src/theme/theme.ts` turns the tokens into an MUI theme with `createTheme({ cssVariables, colorSchemes: { light, dark } })`. It also:

- sets `colorSchemeSelector: 'data'`, so the scheme can be switched at runtime (Storybook's toolbar toggle depends on this)
- adds typed theme keys: `palette.accent`, `palette.header`, `palette.canvas`, `theme.layout`, `theme.density` and a `mono` typography variant
- exports `createAppTheme(density)`, where `density` is `'comfortable'` (spacing base 7) or `'compact'` (spacing base 5, small controls)

Components never import `tokens.ts`. They read from the theme (`sx={{ bgcolor: 'background.paper' }}`, `theme.spacing(theme.layout.railWidth)`), so changing a token updates every story. The token stories are the only exception, because they exist to show the raw values.

## Storybook

The toolbar has two switches:

- **Scheme**: light or dark. Sets the MUI colour scheme through `useColorScheme().setMode`.
- **Density**: comfortable or compact. Rebuilds the theme with the other density.

Stories are grouped as follows:

1. **Tokens**: colour swatches with WCAG contrast ratios, the type scale and families, the spacing scale, layout dimensions and radius.
2. **Primitives**: Button, Tag Chip, Tooltip, Text Field, Slider Field (a slider with a linked numeric input), Select.
3. **Panels**: Side Panel (collapsed rail, expanded, pinned), Disclosure Section, Overflow Menu, Inspector Panel (XYZ position and notes).
4. **Cards**: Dashboard Card, Design Card (part, assembly, instrument, collection) and Stacked Cards (tabbed, auto-advancing, pauses on hover or focus).
5. **Compositions**: Editor Shell, with Default, Everything collapsed and Working (palette pinned, inspector open) stories. Its controls cover rail state, header style (navy or light), density and whether the inspector is open.
6. **Pages**: whole screens. **Home** (signed in, signed out, no projects) and **Editor**. Clicking a project on Home opens the Editor story, and the brand mark in the editor goes back to Home.

To view a page full screen, press **F** in Storybook, or open the story on its own, e.g. `iframe.html?id=pages-home--signed-in&viewMode=story`.

## Layout

```
src/
  theme/
    tokens.ts          all values
    theme.ts           MUI theme factory and type augmentation
  components/
    primitives/        NumberInput, SliderField, TagChip, SelectField, Vec3Field, BrandMark, ColorSchemeToggle
    panels/            SidePanel, DisclosureSection, OverflowMenu, InspectorPanel
    cards/             BenchIllustration, CubeThumbnail, DashboardCard, DesignCard, StackedCards
    compositions/      AppHeader, SiteHeader, SiteFooter, CanvasPlaceholder, StatusBar, EditorShell
    pages/             HomePage (+ Home and Editor page stories)
  demo/                placeholder content for stories and the demo app
  stories/tokens/      token documentation stories
.storybook/            Storybook config, theme decorator, toolbar globals
```

Each component is a single file that depends only on MUI and, sometimes, a sibling component. To copy one into another repo, bring the `theme.ts` type augmentation along with it, or replace `theme.layout.*` with that repo's own values.

## Deploying

`.github/workflows/storybook-pages.yml` builds Storybook and publishes it to GitHub Pages on every push to `main`. It can also be run by hand. Before the first run, go to **Settings → Pages → Source** in the repository and choose **GitHub Actions**.
