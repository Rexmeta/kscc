# Web performance baseline

Measured on 2026-09-01 (Asia/Seoul) against the development workflow on port
5000. The API timings below are spot checks through the Replit preview domain,
not a substitute for a production Lighthouse run.

## Build transfer baseline

The first build was captured before the follow-up changes:

| Asset | Before | After | Change |
| --- | ---: | ---: | ---: |
| Initial JavaScript | 438.46 kB (138.63 kB gzip) | 396.22 kB (128.58 kB gzip) | -9.6% raw, -7.2% gzip |
| HTML shell | 1.94 kB (0.81 kB gzip) | 1.64 kB (0.77 kB gzip) | -15.5% raw |
| Main CSS | 107.01 kB (16.60 kB gzip) | 106.99 kB (16.59 kB gzip) | effectively unchanged |
| Home route chunk | included in initial JavaScript | 20.19 kB (5.10 kB gzip) | moved out of initial entry |

The home route now loads as its own route chunk. Administrator, editor,
uploader, and chart chunks remain outside the initial entry; the largest of
those chunks is only requested by the corresponding management flow.

## Font and image loading

- One stylesheet link remains in the HTML shell; the runtime no longer adds a
  second Google Fonts request.
- The requested font weights were reduced to the weights used by the UI
  (`400`, `500`, `600`, `700`, and the existing Korean/Chinese `900` heading
  weight).
- The home hero no longer downloads an external image after the news request.
  It renders with the existing gradient overlay immediately.
- Images below the first viewport keep explicit dimensions and lazy loading.

## Preview API spot check after changes

| Request | TTFB | Total | Response |
| --- | ---: | ---: | ---: |
| `/` | 73 ms | 74 ms | 46,442 B |
| `/news` | 14 ms | 14 ms | 46,220 B |
| `/events` | 13 ms | 14 ms | 46,319 B |
| `/resources` | 12 ms | 14 ms | 46,289 B |
| Published news list | 212 ms | 212 ms | 24,963 B |
| Upcoming event list | 13 ms | 13 ms | 22 B |
| Published resource list | 18 ms | 18 ms | 1,457 B |
| Resource category counts | 11 ms | 12 ms | 26 B |

The news-list sample includes the current database/query state and should be
repeated against a production-sized dataset before setting an SLO.

## Database measurement

The development database contains 16 posts, one published resource, one
resource category metadata row, and 20 translations. PostgreSQL selected
sequential scans for the category query at this size, which is expected. The
category endpoint now performs one narrow posts/metadata query rather than
paginating through every resource and hydrating translations and all metadata.
No new index was added without a production-sized plan showing that it would
help.

## Client request policy

- News, events, and resources use a two-minute stale window.
- Filter controls keep draft input separate from applied query parameters, so
  typing or changing a select does not issue a request until the filter is
  applied.
- The homepage requests only the 12 partners it renders.
- Authenticated survey settings use a five-minute stale window and no longer
  poll every 30 seconds in the background.

## Published browser traces

Measured on 2026-09-02 (Asia/Seoul) against the successful public deployment
at `https://kscc.kr`. Each route/profile has three cold-cache samples; the
tables report the median. The repeatable runner is
`node scripts/production-performance-trace.mjs https://kscc.kr --runs=3`.
It uses Chromium CDP with the cache cleared and disabled for each navigation.

The mobile profile is a 390 × 844 viewport with 4× CPU throttling, 150 ms
latency, and 1.6 Mbps down / 750 Kbps up. The desktop profile is 1440 × 900
with no CPU or network throttling. “JS” and “CSS” are first-party transfer
bytes; font CSS is listed separately because it is served by Google Fonts.
Image bytes include the public image/object-storage requests observed during
the 2-second settled window.

| Profile | Route | LCP | CLS | TTFB | Requests | JS | CSS | Font CSS | Images |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | `/` | 2,252 ms | 0.0000 | 95 ms | 41 | 432 KB | 105 KB | 212 KB | 0 KB |
| Mobile | `/news` | 1,944 ms | 0.2026 | 87 ms | 33 | 437 KB | 105 KB | 212 KB | 0 KB |
| Mobile | `/events` | 2,212 ms | 0.2104 | 82 ms | 34 | 437 KB | 105 KB | 212 KB | 0.1 KB |
| Mobile | `/resources` | 2,420 ms | 0.0000 | 85 ms | 40 | 449 KB | 105 KB | 212 KB | 0 KB |
| Desktop | `/` | 700 ms | 0.4779 | 86 ms | 93 | 432 KB | 105 KB | 212 KB | 525 KB |
| Desktop | `/news` | 1,000 ms | 0.1369 | 91 ms | 102 | 437 KB | 105 KB | 212 KB | 3.32 MB |
| Desktop | `/events` | 932 ms | 0.1369 | 85 ms | 74 | 438 KB | 105 KB | 212 KB | 0.1 KB |
| Desktop | `/resources` | 740 ms | 0.2424 | 87 ms | 41 | 449 KB | 105 KB | 212 KB | 0 KB |

All 24 navigations reached the browser load event. The main production
baseline is healthy for TTFB (82–95 ms mobile, 85–91 ms desktop) and LCP
(1.94–2.42 s mobile, 0.70–1.00 s desktop). The desktop news page is the
remaining transfer hotspot: the current published data sends approximately
3.32 MB of original images for the first view. The existing lazy loading
prevents those images from being requested on the tested mobile viewport, but
it does not reduce the bytes when the desktop lazy-load threshold includes
the cards.

The initial loading state also allowed the footer to enter the viewport before
the list data arrived, producing the measured desktop CLS values above. The
rebuilt app now gives the main content a viewport-sized minimum height in
`client/src/App.tsx`; a one-sample rebuilt-workflow check reduced desktop
home CLS to 0.0154 and produced 0 CLS on the news, events, and resources
routes. This change is ready for the next publish; the production figures
above intentionally remain the trace of the currently published build.

### Critical API timings

The same production traces observed these API medians:

| Profile | Homepage APIs (4 requests) | News list | Events list | Resources (list + categories) |
| --- | ---: | ---: | ---: | ---: |
| Mobile | 155–223 ms | 206 ms | 195 ms | 159–187 ms |
| Desktop | 120–185 ms | 185 ms | 186 ms | 122–197 ms |

All observed API responses returned HTTP 200. Homepage transfer was about
12.6 KB, news 21.0 KB, events 8.6 KB, and resources 1.7 KB. The homepage
requests were `/api/posts` for the latest news and upcoming events,
`/api/partners?limit=12`, and `/api/members?limit=1`; the list routes used
their corresponding compact `/api/posts` query plus the resource category
endpoint where applicable.

The repeatable runner records each individual API URL, status, duration, and
transfer size in addition to the summarized values above, so a future
production-sized dataset can be compared without changing the measurement
method.