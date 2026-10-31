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
  /** Usernames that were linked as mentions, as given in `mentions`, in order of appearance. */
  mentions: string[];
}

export interface RenderOptions {
  /** Path of a tag page. Defaults to `/tags/<name>`. */
  tagPath?: (name: string) => string;
  /**
   * Accounts that exist, keyed by lowercase username, with the username as displayed.
   * Only these `@mentions` become links; get the candidates with `findMentions`.
   */
  mentions?: ReadonlyMap<string, string>;
  /** Path of a profile. Defaults to `/@<username>`. */
  profilePath?: (username: string) => string;
}

// A hashtag starts after whitespace, punctuation or the start of the text, never inside a
// word, a URL fragment (/#x) or an HTML entity (&#x).
const HASHTAG = /(^|[^\p{L}\p{N}_#&/])#([\p{L}\p{N}_]+)/gu;

// A mention is @ plus a username, not inside a word or an email address. "@user@domain"
// (remote accounts) is left alone until federation (M5).
const MENTION = /(^|[^\p{L}\p{N}_@/.])@([A-Za-z0-9_]{3,30})(?![A-Za-z0-9_@])/gu;

/**
 * Replaces matches of `pattern` in plain text with links. Text inside code and existing
 * links is never touched. `pattern` captures what comes before the token (group 1) and the
 * name after the sigil (group 2); `toLink` returns null to leave a match as text.
 *
 * Returns a new plugin on each call: unified merges repeated uses of the same plugin, so
 * hashtags and mentions each need their own.
 */
function linkify(options: {
  pattern: RegExp;
  sigil: string;
  toLink: (name: string) => Link | null;
}) {
  return () => (tree: MdastRoot) => {
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
      for (const match of node.value.matchAll(options.pattern)) {
        const prefix = match[1] ?? '';
        const raw = match[2] ?? '';
        const link = options.toLink(raw);
        if (!link) continue;

        const start = match.index + prefix.length;
        if (start > last) parts.push({ type: 'text', value: node.value.slice(last, start) });
        parts.push({ ...link, children: [{ type: 'text', value: `${options.sigil}${raw}` }] });
        last = start + options.sigil.length + raw.length;
      }
      if (parts.length === 0) return;
      if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) });

      const siblings = parent.children as PhrasingContent[];
      siblings.splice(siblings.indexOf(node), 1, ...parts);
    });
  };
}

function classedLink(url: string, className: string): Link {
  return { type: 'link', url, children: [], data: { hProperties: { className: [className] } } };
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

// Allows the "hashtag" and "mention" classes on links, next to the ones the default schema allows.
type PropertyDefinition = NonNullable<NonNullable<SanitizeSchema['attributes']>[string]>[number];

const linkAttributes = (defaultSchema.attributes?.a ?? []).map((attribute): PropertyDefinition => {
  if (!Array.isArray(attribute) || attribute[0] !== 'className') return attribute;
  const [name, ...values] = attribute;
  return [name, ...values, 'hashtag', 'mention'];
});

const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  attributes: { ...defaultSchema.attributes, a: linkAttributes },
};

/**
 * Lowercase usernames written as @mentions, in order of appearance. Look them up and pass
 * the ones that exist to `renderMarkdown` as `mentions`.
 */
export function findMentions(source: string): string[] {
  const found = new Set<string>();
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(
      linkify({
        pattern: MENTION,
        sigil: '@',
        toLink: (username: string) => {
          found.add(username.toLowerCase());
          return null;
        },
      }),
    );
  processor.runSync(processor.parse(source));
  return [...found];
}

/** Converts post Markdown into sanitized HTML and extracts its hashtags and mentions. */
export function renderMarkdown(source: string, options: RenderOptions = {}): RenderedMarkdown {
  const tags = new Set<string>();
  const mentions = new Set<string>();
  const tagPath = options.tagPath ?? ((name: string) => `/tags/${encodeURIComponent(name)}`);
  const profilePath = options.profilePath ?? ((username: string) => `/@${username}`);
  const known = options.mentions ?? new Map<string, string>();

  const html = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkHtmlAsText)
    .use(remarkImagesAsLinks)
    .use(
      linkify({
        pattern: HASHTAG,
        sigil: '#',
        toLink: (raw: string) => {
          const name = normalizeTag(raw);
          if (!name) return null;
          tags.add(name);
          return classedLink(tagPath(name), 'hashtag');
        },
      }),
    )
    .use(
      linkify({
        pattern: MENTION,
        sigil: '@',
        toLink: (raw: string) => {
          const username = known.get(raw.toLowerCase());
          if (!username) return null;
          mentions.add(username);
          return classedLink(profilePath(username), 'mention');
        },
      }),
    )
    .use(remarkRehype)
    // Defense in depth: nothing above should produce unsafe HTML, but sanitize anyway.
    .use(rehypeSanitize, sanitizeSchema)
    // Runs after sanitize: it only adds spans with hljs-* classes to code blocks.
    .use(rehypeHighlight)
    .use(rehypeExternalLinks)
    .use(rehypeStringify)
    .processSync(source)
    .toString();

  return { html, tags: [...tags], mentions: [...mentions] };
}
