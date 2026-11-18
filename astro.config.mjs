// The DuckWake website: the home page, About and the docs, built with Starlight. Reference docs come from
// duckwake/duckwake at build time (scripts/sync-docs.mjs), so they always match the code on its main branch.
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';

export default defineConfig({
  site: 'https://duckwake.github.io',
  integrations: [
    starlight({
      title: 'DuckWake',
      description: 'Continuous SQL over Kafka into DuckLake, exactly once.',
      logo: {
        light: './src/assets/duckwake-horizontal.svg',
        dark: './src/assets/duckwake-horizontal-reversed.svg',
        replacesTitle: true,
      },
      favicon: '/favicon.svg',
      head: [
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '48x48' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
        { tag: 'link', attrs: { rel: 'manifest', href: '/site.webmanifest' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#0E1A24' } },
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://duckwake.github.io/og.png' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
      ],
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/duckwake/duckwake' }],
      customCss: ['./src/styles/brand.css', './src/styles/home.css', './src/styles/motion.css'],
      components: {
        Footer: './src/components/Footer.astro',
        PageTitle: './src/components/PageTitle.astro',
        Hero: './src/components/Hero.astro',
      },
      // Code blocks: rounded and flat, no shadow, and no window dots on shell blocks.
      expressiveCode: {
        // Shell blocks get a plain code frame too, not a terminal window; a block with a title keeps its tab.
        defaultProps: { frame: 'code' },
        styleOverrides: {
          borderRadius: '0.6rem',
          borderColor: 'var(--dw-code-border)',
          codeFontSize: '0.85rem',
          codeLineHeight: '1.65',
          codePaddingBlock: '0.9rem',
          codePaddingInline: '1.1rem',
          frames: {
            frameBoxShadowCssValue: 'none',
            editorActiveTabIndicatorTopColor: 'var(--sl-color-accent)',
            editorActiveTabIndicatorBottomColor: 'transparent',
          },
        },
      },
      lastUpdated: false,
      plugins: [starlightLinksValidator({ errorOnLocalLinks: true })],
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Install', slug: 'docs/start/install' },
            { label: 'Quick start', slug: 'docs/start/quick-start' },
            { label: 'Concepts', slug: 'docs/start/concepts' },
          ],
        },
        {
          label: 'Guides',
          items: [{ label: 'dbt-duckwake', slug: 'docs/guides/dbt' }],
        },
        {
          label: 'Reference',
          items: [
            { label: 'SQL functions', slug: 'docs/reference/sql' },
            { label: 'CLI and playground', slug: 'docs/reference/cli' },
            { label: 'Server: duckwaked', slug: 'docs/reference/server' },
            { label: 'Extension', slug: 'docs/reference/extension' },
          ],
        },
        {
          label: 'Operations',
          items: [
            { label: 'Monitoring and alerts', slug: 'docs/operations/alerts' },
            { label: 'Performance', slug: 'docs/operations/performance' },
          ],
        },
        {
          label: 'Project',
          items: [
            { label: 'Roadmap', slug: 'docs/project/roadmap' },
            { label: 'Changelog', slug: 'docs/project/changelog' },
            { label: 'Releases', slug: 'docs/project/releasing' },
          ],
        },
      ],
    }),
  ],
});
