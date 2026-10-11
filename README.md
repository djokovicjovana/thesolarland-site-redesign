# The Solar Land website

New version of [thesolarland.com](https://thesolarland.com). A static site (HTML, CSS and JavaScript) that runs on any static host, including GitHub Pages. There is nothing to install or build.

## Pages

`index.html` (home and return calculator), `how-it-works.html`, `projects.html`, `about.html`, `faq.html`, `contact.html`, `join.html` (become an investor), `terms.html`, `privacy.html`, `404.html`.

## How it works

- **Return calculator** (`assets/js/main.js`): uses the rates published on the current site, 4.33% a year contractual and 6.5% a year estimated, over 25 years.
- **Forms** (contact and project updates): open the visitor's email app with the message ready, addressed to info@thesolarland.com. To use a form service instead, add its address to the form as `data-endpoint="…"`.
- **Become an investor** and **Log in**: lead to the investor platform at thesolarland.com/my-account/, where registration, contracts and reports live.
- **Media**: team photos, the logo mark and the planning drawings load from the thesolarland.com media library.
- **Privacy**: no cookies, no tracking, no third-party scripts. Fonts are hosted with the site.

## Before going live on thesolarland.com

1. Remove the line `<meta name="robots" content="noindex, nofollow">` from every page. It keeps this preview out of search engines.
2. Change the `og:url` and `og:image` addresses (link previews) to the final domain.

## Credits

Fonts: Fraunces and Figtree, SIL Open Font License. Hero photo: generated with Google Flow and marked on the page as an illustrative image.
