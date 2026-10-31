import { normalizeTag } from '@social-dev/shared';
import type { Element, Root as HastRoot } from 'hast';
import type { Html, Link, LinkReference, PhrasingContent, Root as MdastRoot, Text } from 'mdast';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { visitParents } from 'unist-util-visit-parents';

export interface RenderedMarkdown {
  /** Sanitized HTML, safe to insert into a page. */
  html: string;
  /** Normalized names of the hashtags found in the text, in order of appearance. */
  tags: string[];
}

export interface RenderOptions {
  /** Path of a tag page. Defaults to `/tags/<name>`. */
  tagPath?: (name: string) => string;
}

// A hashtag starts after whitespace, punctuation or the start of the text, never inside a
// word, a URL fragment (/#x) or an HTML entity (&#x).
const HASHTAG = /(^|[^\p{L}\p{N}_#&/])#([\p{L}\p{N}_]+)/gu;

/** Turns #hashtags in plain text into links and collects their names. */
function remarkHashtags(options: { tags: Set<string>; tagPath: (name: string) => string }) {
  return (tree: MdastRoot) => {
    visitParents(tree, 'text', (node, ancestors) => {
      const parent = ancestors.at(-1);
      if (!parent || !('children' in parent)) return;
      if (
        ancestors.some((ancestor) => ancestor.type === 'link' || ancestor.type === 'linkReference')
      ) {
        return;
      }

      const parts: PhrasingContent[] = [];
      let last = 0;
      for (const match of node.value.matchAll(HASHTAG)) {
        const prefix = match[1] ?? '';
        const raw = match[2] ?? '';
        const name = normalizeTag(raw);
        if (!name) continue;

        const start = match.index + prefix.length;
        if (start > last) parts.push({ type: 'text', value: node.value.slice(last, start) });
        parts.push({
          type: 'link',
          url: options.tagPath(name),
          children: [{ type: 'text', value: `#${raw}` }],
          data: { hProperties: { className: ['hashtag'] } },
        });
        options.tags.add(name);
        last = start + raw.length + 1;
      }
      if (parts.length === 0) return;
      if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) });

      const siblings = parent.children as PhrasingContent[];
      siblings.splice(siblings.indexOf(node), 1, ...parts);
    });
  };
}

/**
 * Renders images as links to the image. Embedding them would make every reader's browser
 * fetch arbitrary third-party URLs; they come back once uploads and a media proxy exist.
 */
function remarkImagesAsLinks() {
  return (tree: MdastRoot) => {
    visit(tree, (node, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.type === 'image') {
        const link: Link = {
          type: 'link',
          url: node.url,
          title: node.title ?? null,
          // Images without alt text show their address.
          children: [{ type: 'text', value: node.alt?.trim() ? node.alt : node.url }],
        };
        parent.children[index] = link;
      } else if (node.type === 'imageReference') {
        const link: LinkReference = {
          type: 'linkReference',
          identifier: node.identifier,
          label: node.label ?? null,
          referenceType: node.referenceType,
          children: [{ type: 'text', value: node.alt ?? '' }],
        };
        parent.children[index] = link;
      }
    });
  };
}

/**
 * Shows HTML written in a post as plain text instead of dropping it, so "use the <Button>
 * component" reads as typed. Nothing in it is ever interpreted as markup.
 */
function remarkHtmlAsText() {
  return (tree: MdastRoot) => {
    visit(tree, 'html', (node: Html, index, parent) => {
      if (!parent || index === undefined) return;
      const text: Text = { type: 'text', value: node.value };
      // Block-level HTML sits where paragraphs go, so it needs one around it.
      const isBlock =
        parent.type === 'root' || parent.type === 'blockquote' || parent.type === 'listItem';
      parent.children[index] = isBlock ? { type: 'paragraph', children: [text] } : text;
    });
  };
}

/** External links get rel attributes so they pass no ranking or referrer to other sites. */
function rehypeExternalLinks() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return;
      const href = node.properties.href;
      if (typeof href === 'string' && /^[a-z][a-z0-9+.-]*:/i.test(href)) {
        node.properties.rel = ['nofollow', 'ugc', 'noopener', 'noreferrer'];
      }
    });
  };
}

// Allows the "hashtag" class on links, next to the classes the default schema already allows.
type PropertyDefinition = NonNullable<NonNullable<SanitizeSchema['attributes']>[string]>[number];

const linkAttributes = (defaultSchema.attributes?.a ?? []).map((attribute): PropertyDefinition => {
  if (!Array.isArray(attribute) || attribute[0] !== 'className') return attribute;
  const [name, ...values] = attribute;
  return [name, ...values, 'hashtag'];
});

const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  attributes: { ...defaultSchema.attributes, a: linkAttributes },
};

/** Converts post Markdown into sanitized HTML and extracts its hashtags. */
export function renderMarkdown(source: string, options: RenderOptions = {}): RenderedMarkdown {
  const tags = new Set<string>();
  const tagPath = options.tagPath ?? ((name: string) => `/tags/${encodeURIComponent(name)}`);

  const html = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkHtmlAsText)
    .use(remarkImagesAsLinks)
    .use(remarkHashtags, { tags, tagPath })
    .use(remarkRehype)
    // Defense in depth: nothing above should produce unsafe HTML, but sanitize anyway.
    .use(rehypeSanitize, sanitizeSchema)
    // Runs after sanitize: it only adds spans with hljs-* classes to code blocks.
    .use(rehypeHighlight)
    .use(rehypeExternalLinks)
    .use(rehypeStringify)
    .processSync(source)
    .toString();

  return { html, tags: [...tags] };
}
