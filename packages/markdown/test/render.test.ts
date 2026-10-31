import { describe, expect, it } from 'vitest';

import { renderMarkdown } from '../src/index.ts';

const html = (source: string) => renderMarkdown(source).html;

describe('renderMarkdown', () => {
  it('renders GitHub-flavored Markdown', () => {
    expect(html('**bold** and ~~gone~~')).toBe('<p><strong>bold</strong> and <del>gone</del></p>');
    expect(html('| a |\n| - |\n| 1 |')).toContain('<table>');
  });

  it('highlights code blocks that name a language', () => {
    const result = html('```ts\nconst answer = 42;\n```');
    expect(result).toContain('class="hljs language-ts"');
    expect(result).toContain('<span class="hljs-keyword">const</span>');
  });

  describe('security', () => {
    it('shows HTML as plain text', () => {
      expect(html('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>')).toBe(
        '<p>&#x3C;script>alert(1)&#x3C;/script></p>\n<p>&#x3C;img src=x onerror=alert(1)></p>',
      );
      expect(html('Use the <Button> component')).toBe('<p>Use the &#x3C;Button> component</p>');
    });

    it('removes javascript: links', () => {
      expect(html('[click](javascript:alert(1))')).toBe('<p><a>click</a></p>');
    });

    it('turns images into links instead of loading them', () => {
      expect(html('![a cat](https://example.com/cat.png)')).toBe(
        '<p><a href="https://example.com/cat.png" rel="nofollow ugc noopener noreferrer">a cat</a></p>',
      );
    });

    it('marks external links as user-generated', () => {
      expect(html('<https://example.com>')).toContain('rel="nofollow ugc noopener noreferrer"');
    });
  });

  describe('hashtags', () => {
    it('links hashtags and collects their normalized names', () => {
      const result = renderMarkdown('Learning #Rust and #rust with #TypeScript.');
      expect(result.tags).toEqual(['rust', 'typescript']);
      expect(result.html).toBe(
        '<p>Learning <a href="/tags/rust" class="hashtag">#Rust</a> and ' +
          '<a href="/tags/rust" class="hashtag">#rust</a> with ' +
          '<a href="/tags/typescript" class="hashtag">#TypeScript</a>.</p>',
      );
    });

    it('accepts tags at the start of the text and with accents', () => {
      expect(renderMarkdown('#programação é legal').tags).toEqual(['programação']);
    });

    it('ignores hashtags in code, links, URLs and words', () => {
      const source = [
        '`#notag` and',
        '```\n#notag\n```',
        '[#notag](https://example.com)',
        'https://example.com/#notag',
        'C#notag and issue&#35;',
      ].join('\n\n');
      expect(renderMarkdown(source).tags).toEqual([]);
    });

    it('uses a custom tag path', () => {
      const result = renderMarkdown('#go', {
        tagPath: (name) => `https://social.dev/tags/${name}`,
      });
      expect(result.html).toContain('href="https://social.dev/tags/go"');
    });
  });
});
