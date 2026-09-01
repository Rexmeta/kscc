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

LCP, CLS, and mobile/desktop browser traces require a production browser
measurement run; the build, preview TTFB, request, and bundle measurements
above are the reproducible baseline available in this workspace.