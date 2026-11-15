# kheengz-nextjs docs

One topic per file, updated in the same change as the code it describes. The workspace's
`docs/decisions.md` says what was settled and why; these say how the web app does it.

| Doc | What it covers | Came from |
| --- | --- | --- |
| [sessions-and-cache-components.md](sessions-and-cache-components.md) | The static shell, why the server never reads the session, PrimeReact in a cascade layer | Kheengz |
| [dashboard-patterns.md](dashboard-patterns.md) | Confirmations, Export, locked rows, forms, filters, paging, state without effects, words | GiftNest, trimmed |
| [e2e-testing.md](e2e-testing.md) | Playwright: running it, the projects, what is covered | GiftNest, rewritten |

GiftNest's link-previews and printing docs were not copied: they arrive with the storefront's share
cards and the receipts (Phase 1).
