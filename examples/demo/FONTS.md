# Self-hosted deck fonts

The `woff2` files in `public/fonts/` are baked into the artifact by
`prezzer build` so the deck presents with its full typography offline —
this is the airplane-mode path from
[docs/deck-authoring.md](../../docs/deck-authoring.md#fonts).

| Files                      | Family        | Source                                             | License                   |
| -------------------------- | ------------- | -------------------------------------------------- | ------------------------- |
| `ClashDisplay-*.woff2`     | Clash Display | [Fontshare](https://www.fontshare.com)             | ITF Free Font License     |
| `Satoshi-*.woff2`          | Satoshi       | [Fontshare](https://www.fontshare.com)             | ITF Free Font License     |
| `GeistMono-Variable.woff2` | Geist Mono    | [Vercel](https://vercel.com/font) via Google Fonts | SIL Open Font License 1.1 |

Geist Mono is the latin-subset variable file (one file covers weights
100–900). The Fontshare families are the hosted-webfont builds for the
weights the deck uses.
