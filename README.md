# LAE Course companion site

Companion website for a 12-week low-altitude economy course.

**Live site:** <https://kochiuyu.github.io/lae-companion/>

## What is on the site

- **Orient:** primers, course overview, how to use the site, common questions, key numbers
- **Teach:** one page per week (Weeks 1–12) with reading, presentation mode, readings and an earlier class-outline PDF
- **Review:** formulas, tables, figures, readings and self-check quizzes
- **Official facts:** glossary, official status, companies and sectors
- **Updates:** government news, business news, use cases, timeline

The Official facts and Updates pages are a dated evidence desk, not a second textbook. Each page shows an "as of" date.

## Build

Built with [Quarto](https://quarto.org/) (`quarto preview` to preview, `quarto render` to build). A push to `main` deploys to GitHub Pages through `.github/workflows/publish.yml`.

## Present a weekly lesson

Each weekly page has a **Present lesson** button. The browser builds its slide view from that page's sections, figures, tables and calculations, so the Quarto page is the teaching source. **Notes** shows the corresponding full reading content on the same screen. Use Previous/Next, the slide menu, arrow keys, Page Up/Down or Home/End to move. **Read this section** returns to the source section. Full screen and a landscape Print slides view are available. A URL such as `week-01.html?present=1&slide=one-completed-mission` opens a specific slide.

Presentation mode is implemented by `_presentation.html` and `assets/presentation.js`/`assets/presentation.css`. It runs only on weekly pages and needs JavaScript; the reading page remains available without it. The earlier Beamer PDFs stay available as class-outline references during the transition.
