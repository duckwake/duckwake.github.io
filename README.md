# duckwake.github.io

The website of DuckWake: continuous SQL over Kafka into DuckLake, exactly once.

The page is plain HTML and CSS in `site/`, with no build step. `.github/workflows/pages.yml` publishes it to
https://duckwake.github.io on every push to `main`.

`brand/` holds the brand kit: logo masters (`svg/`), one-colour variants (`variants/`), web icons (`web/`),
social images (`social/`), the concept presentation (`presentation/`) and the logo guidelines
(`brand/GUIDELINES.md`). It is not part of the published site.
