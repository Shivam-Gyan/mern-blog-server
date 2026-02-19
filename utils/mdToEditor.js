import { nanoid } from "nanoid";

/**
 * Convert markdown text to Editor.js blocks format.
 * Handles: headings, paragraphs (with bold, italic, links, inline-code),
 *          ordered/unordered lists, blockquotes, and images.
 */
export const convertMarkdownToEditorJs = (markdown) => {
    const lines = markdown.split("\n");
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Skip empty lines
        if (line.trim() === "") {
            i++;
            continue;
        }

        // --- HEADINGS ---
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const text = renderInline(headingMatch[2].trim());
            blocks.push({
                id: nanoid(),
                type: "header",
                data: { text, level },
            });
            i++;
            continue;
        }

        // --- IMAGES  ![caption](url) ---
        const imageMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imageMatch) {
            blocks.push({
                id: nanoid(),
                type: "image",
                data: {
                    file: { url: imageMatch[2] },
                    caption: imageMatch[1] || "",
                    withBorder: false,
                    stretched: false,
                    withBackground: false,
                },
            });
            i++;
            continue;
        }

        // --- BLOCKQUOTE ---
        if (line.trimStart().startsWith("> ")) {
            const quoteLines = [];
            while (i < lines.length && lines[i].trimStart().startsWith("> ")) {
                quoteLines.push(lines[i].replace(/^>\s?/, ""));
                i++;
            }
            const quoteText = renderInline(quoteLines.join(" ").trim());
            blocks.push({
                id: nanoid(),
                type: "quote",
                data: { text: quoteText, caption: "" },
            });
            continue;
        }

        // --- UNORDERED LIST  (- or * or +) ---
        const ulMatch = line.match(/^(\s*)[*+-]\s+(.+)$/);
        if (ulMatch) {
            const items = [];
            while (i < lines.length && /^(\s*)[*+-]\s+(.+)$/.test(lines[i])) {
                const m = lines[i].match(/^(\s*)[*+-]\s+(.+)$/);
                items.push(renderInline(m[2].trim()));
                i++;
            }
            blocks.push({
                id: nanoid(),
                type: "list",
                data: { style: "unordered", items },
            });
            continue;
        }

        // --- ORDERED LIST  (1. 2. etc.) ---
        const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
        if (olMatch) {
            const items = [];
            while (i < lines.length && /^(\s*)\d+\.\s+(.+)$/.test(lines[i])) {
                const m = lines[i].match(/^(\s*)\d+\.\s+(.+)$/);
                items.push(renderInline(m[2].trim()));
                i++;
            }
            blocks.push({
                id: nanoid(),
                type: "list",
                data: { style: "ordered", items },
            });
            continue;
        }

        // --- HORIZONTAL RULE ---
        if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
            i++;
            continue;
        }

        // --- PARAGRAPH (default) ---
        // Gather consecutive non-empty, non-special lines into one paragraph
        const paraLines = [];
        while (
            i < lines.length &&
            lines[i].trim() !== "" &&
            !lines[i].match(/^#{1,6}\s/) &&
            !lines[i].trimStart().startsWith("> ") &&
            !lines[i].match(/^(\s*)[*+-]\s+/) &&
            !lines[i].match(/^(\s*)\d+\.\s+/) &&
            !lines[i].trim().match(/^!\[/) &&
            !lines[i].trim().match(/^(-{3,}|_{3,}|\*{3,})$/)
        ) {
            paraLines.push(lines[i].trim());
            i++;
        }

        if (paraLines.length > 0) {
            const text = renderInline(paraLines.join(" "));
            blocks.push({
                id: nanoid(),
                type: "paragraph",
                data: { text },
            });
        }
    }

    return {
        time: Date.now(),
        blocks,
        version: "2.27.2",
    };
};


// ── Inline Markdown → HTML renderer ──────────────────────────────────

function renderInline(text) {
    // Bold  **text** or __text__
    text = text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    text = text.replace(/__(.+?)__/g, "<b>$1</b>");

    // Italic  *text* or _text_  (but not inside words with underscores)
    text = text.replace(/\*(.+?)\*/g, "<i>$1</i>");
    text = text.replace(/(?<!\w)_(.+?)_(?!\w)/g, "<i>$1</i>");

    // Inline code  `code`
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Links  [text](url)
    text = text.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    return text;
}
