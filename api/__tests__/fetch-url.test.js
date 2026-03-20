const { stripHtml } = require('../fetch-url');

describe('stripHtml', () => {
  test('fjerner HTML-tagger og returnerer tekst', () => {
    const html = '<p>Hei <strong>verden</strong></p>';
    expect(stripHtml(html)).toBe('Hei verden');
  });

  test('fjerner script- og style-blokker', () => {
    const html = '<p>Tekst</p><script>alert("x")</script><style>.x{}</style><p>Mer</p>';
    const result = stripHtml(html);
    expect(result).toContain('Tekst');
    expect(result).toContain('Mer');
    expect(result).not.toContain('alert');
    expect(result).not.toContain('.x');
  });

  test('fjerner nav, footer og header', () => {
    const html = '<nav>Meny</nav><main><p>Innhold</p></main><footer>Bunn</footer>';
    const result = stripHtml(html);
    expect(result).toContain('Innhold');
    expect(result).not.toContain('Meny');
    expect(result).not.toContain('Bunn');
  });

  test('dekoder HTML-entiteter', () => {
    const html = '&amp; &lt; &gt; &quot; &#39; &nbsp;';
    expect(stripHtml(html)).toBe('& < > " \'');
  });

  test('kollapser mellomrom', () => {
    const html = '<p>Mye    mellomrom</p>\n\n\n\n<p>Her</p>';
    const result = stripHtml(html);
    expect(result).toMatch(/Mye mellomrom/);
    expect(result).not.toMatch(/\n\n\n/);
  });
});
