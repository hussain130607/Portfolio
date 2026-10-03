# Hussain Muhammad Abdullah — Portfolio

Portfolio site built with React, Tailwind CSS and Motion. The built site lives in the repo root, so
Cloudflare Pages serves this folder as-is (build command: none, output directory: `/`).

- `index.html`, `assets/app/` — the built portfolio (generated, do not edit by hand)
- `app-src/` — its source: `cd app-src && npm install && npm run build` rebuilds the files above
- `assets/` — photo, certificate and app screenshots
- `demos/gift-r/` — Gift R storefront in demo mode (sample data, no backend)
- `demos/crafty-bay/` — Crafty Bay Flutter web build (`flutter build web --release --base-href /demos/crafty-bay/`)
- `demos/pocket-ledger`, `demos/dart-quiz`, `demos/taskboard` — mini web apps
- `book/` — a short page preview of the Dart and Flutter books. It is not in this repository (the books are private); it is added at deploy time.
