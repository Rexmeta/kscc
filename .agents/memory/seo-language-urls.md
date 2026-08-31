---
name: SEO language URLs
description: How public language variants are represented for indexing
---

Public language variants use the `lang` query parameter (`ko`, `en`, or `zh`) while the application still persists the visitor's language choice locally.

**Why:** The current SPA has no language-prefixed route tree, so query URLs expose crawlable, shareable variants without changing every existing internal route.

**How to apply:** Preserve the `lang` parameter in language switching, canonical URLs, hreflang links, and public sitemap entries. Treat unsupported values as Korean.