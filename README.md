# optikit-ui-lab

A sandbox for trying out ideas for the Optikit UI revamp. It uses the same stack as the production app (Vite, React 19, strict TypeScript, MUI 7 with Emotion, `@mui/icons-material`), so components built here can be ported over. Storybook (React + Vite) is the main way to view them.

**Live Storybook:** https://manuelfragata.github.io/optikit-ui-lab/
**Clickable prototype:** https://manuelfragata.github.io/optikit-ui-lab/app/

Signed out, Home is the landing page: a translucent sticky top bar, a slideshow of live example designs a visitor can change without an account (and open in the editor, changes included), the community gallery, a live 3D "How it works" bench, and pricing, then the footer. The bench (`src/components/landing/bench3d/`) is plain three.js, code-split and loaded only when it scrolls into view; it renders on demand and pauses off screen. Its parts are real openUC2 modules (GLB) loaded at run time from the public OptiKit Store on GitHub (`src/demo/benchAssembly.ts`); no meshes are copied into this repo. Section links use plain anchors (`#examples`, `#community`, `#pricing`).

The editor follows the part model of the UI-V4 brief (optikit-v2, `DOCS/editor/UI-V4-BRIEF.md`): the schematic is physical, and every part is either **in a cube** or **not mounted yet**. The inspector's Placement section moves a part between the two states with *Realize* (swap for an existing module), *Freeze* (generate a holder at the current position) and *Unbind*; a mounted part also has a *seat* in quarter turns. The status bar counts the parts not mounted yet (none left means buildable), and the canvas switches between 2D and 3D instead of separate schematic, parts and assembly views.

The prototype links the pages together: Home, then Log in / Sign up (any details sign you in as the demo user Manu), then the Editor and the Account settings. Routes live in the URL hash (`#/`, `#/editor/<id>`, `#/account`, `#/login`, `#/signup`), so links and the back button work, and the session is remembered in the browser. The code is in `src/app/`, and the same app is the **Pages → Prototype** story.

## Run it

```bash
npm install
npm run storybook        # http://localhost:6006
npm run dev              # the clickable prototype (Home, log in, Editor, Account)
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run typecheck` | `tsc` in strict mode |
| `npm run lint` | ESLint, set up as in optikit-v2's frontend |
| `npm run build` | typecheck, then build the Vite app into `dist/` |
| `npm run build-storybook` | build static Storybook into `storybook-static/` |

## Where the tokens live

All raw values are in **`src/theme/tokens.ts`**. They follow the **Bench** direction (hairlines instead of fills, labels and values in mono, one accent used sparingly), with colours and type from the [openUC2 brand guide](https://docs.openuc2.com/dev/design/brand-guidelines/):

- `brand`: openUC2 blue (`anchor`), green (`lime`), turquoise and grey; `markColors` holds the two approved colourings of the cube mark (full colour, and greyscale for dark backgrounds), drawn by `src/components/primitives/OpenUC2Mark.tsx`
- `colors.light` / `colors.dark`: accent, accent hover and soft, status, surface, sunken, line, ink 1–3
- `canvasColors` and `rayColors`: the drawing surface, which never uses brand colour
- radius (3px), spacing and density, layout dimensions, font families and the Bench type scale

Values marked `(derived)` are not on the Bench sheet: some dark-mode greys and rays, and the warning/error colours. To try a new colour or size, edit that file.

`src/theme/theme.ts` turns the tokens into an MUI theme with `createTheme({ cssVariables, colorSchemes: { light, dark } })`. It also:

- sets `colorSchemeSelector: 'data'`, so the scheme can be switched at runtime (Storybook's toolbar toggle depends on this)
- adds typed theme keys: `palette.accent`, `palette.header`, `palette.canvas`, `theme.layout`, `theme.density` and a `mono` typography variant
- exports `createAppTheme(density)`, where `density` is `'comfortable'` (spacing base 7) or `'compact'` (spacing base 5, small controls)

Components never import `tokens.ts`. They read from the theme (`sx={{ bgcolor: 'background.paper' }}`, `theme.spacing(theme.layout.railWidth)`), so changing a token updates every story. The token stories are the only exception, because they exist to show the raw values.

## Fonts

Two typefaces, both SIL OFL 1.1 and self-hosted, so no page load asks a font service (no Google Fonts) and the app works offline:

- **Objectivity** for everything that is read. The openUC2 guide names it as the free alternative to its licensed Stolzl. Files in `src/theme/fonts/objectivity/`.
- **JetBrains Mono** for values, versions, coordinates and prices (the `mono` variant). Files in `src/theme/fonts/jetbrains-mono/`.

Each folder has its licence in `OFL.txt`. The family stacks are `fonts` in `src/theme/tokens.ts`; `src/theme/fonts.ts` loads the files. **Tokens → Typography → Fonts** shows both.

## Storybook

The toolbar has two switches:

- **Scheme**: light or dark. Sets the MUI colour scheme through `useColorScheme().setMode`.
- **Density**: comfortable or compact. Rebuilds the theme with the other density.

Stories are grouped as follows:

1. **Tokens**: colour swatches with WCAG contrast ratios, the type scale and the two fonts, the spacing scale, layout dimensions and radius.
2. **Primitives**: Button, Pill, Pill Switch, Tag Chip, Tooltip, Text Field, Number Input, Vec3 Field, Slider Field (a slider with a linked numeric input), Select.
3. **Panels**: Side Panel (collapsed rail, expanded, pinned), Disclosure Section, Overflow Menu.
4. **Cards**: Dashboard Card, Design Card (part, assembly, instrument, collection) and Stacked Cards (tabbed, auto-advancing, pauses on hover or focus).
5. **Editor**: the Schematic Canvas; the Canvas Overlays that float over it (layer preview, dock, quick add, selection actions, command palette); the Sidebar Panels (library, layers, parts, bill of materials, properties, design info).
6. **Landing**: the landing page's sections.
7. **Compositions**: the Workspace Shell (header and tabs), the Editor Shell (the View tab, in 2D and 3D; its controls cover the panels, the selection and the view) and the Settings Dialog.
8. **Views**: one per workspace tab: Explore, Design Page, Projects, New Project, File (one story per section) and Commercial.
9. **Pages**: whole screens. **Prototype** is the whole clickable app; **Landing**, **Home** and **Editor** are pages on their own.

To view a page full screen, press **F** in Storybook, or open the story on its own, e.g. `iframe.html?id=pages-home--signed-in&viewMode=story`.

## Layout

```
src/
  theme/
    tokens.ts          all values
    theme.ts           MUI theme factory and type augmentation
    fonts.ts, fonts/   the two self-hosted fonts (Objectivity, JetBrains Mono)
  components/
    primitives/        Pill, PillSwitch, NumberInput, SliderField, TagChip, SelectField, Vec3Field, BrandMark, download, format
    panels/            SidePanel, DisclosureSection, OverflowMenu
    editor/            the design model, the 2D canvas, scene3d/ for 3D, the floating tools, panels/ for the sidebars,
                       bom and designFile (pure, tested), light (where the drawn light comes from)
    cards/             BenchIllustration, CubeThumbnail, DashboardCard, DesignCard, StackedCards
    compositions/      AppHeader, SiteHeader, SiteFooter, StatusBar, WorkspaceShell, Ribbon, EditorShell (+ editor/)
    views/             one per workspace tab: Explore, DesignPage, Projects, File (+ file/), Commercial (+ commercial/)
    landing/, pages/   the signed-out landing page, Home, Account
  settings/            preferences (kept in the browser) and the Settings dialog
  app/                 the clickable prototype: routing, and the tabs wired to demo data
  api/                 types shared with the real API
  demo/                DEMO ONLY: placeholder content and stand-ins (prices, light) until the real services
  stories/tokens/      token documentation stories
.storybook/            Storybook config, theme decorator, toolbar globals
```

Each component is a single file that depends only on MUI and, sometimes, a sibling component. To copy one into another repo, bring the `theme.ts` type augmentation along with it, or replace `theme.layout.*` with that repo's own values.

## Deploying

`.github/workflows/storybook-pages.yml` builds Storybook and publishes it to GitHub Pages on every push to `main`. It can also be run by hand. Before the first run, go to **Settings → Pages → Source** in the repository and choose **GitHub Actions**.
