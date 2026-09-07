import React, { useMemo } from 'react';
import katex from 'katex';
import { Copy, Check } from 'lucide-react';

interface FormattedMessageProps {
  content: string;
  className?: string;
}

// Safely render a LaTeX math snippet with KaTeX
function renderKatex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex.trim(), {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false,
    });
  } catch (err) {
    return `<span class="font-mono text-amber-600">${tex}</span>`;
  }
}

// Code block with copy action
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] overflow-hidden bg-[#181A20] text-[#F3F4F6] text-[11px] font-mono shadow-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0F1115] border-b border-[#2D323F] text-[10px] text-[#9CA3AF]">
        <span className="uppercase tracking-wider font-semibold">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto leading-relaxed scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Render inline text with bold, italic, inline code, and inline LaTeX math $...$
function renderInlineText(text: string): React.ReactNode[] {
  // Regex splitting by inline math $...$ or inline code `...`
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  // Pattern matches $...$ (math), `...` (code), **...** (bold), *...* (italic)
  // Inline math: $([^\$]+?)\$
  const tokenRegex = /(\$([^\$]+?)\$|`([^`]+?)`|\*\*([^*]+?)\*\*|\*([^*]+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(
        <span key={`txt-${keyIdx++}`}>
          {remaining.substring(lastIndex, match.index)}
        </span>
      );
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('$') && fullMatch.endsWith('$') && match[2]) {
      // Inline LaTeX Math
      const mathHtml = renderKatex(match[2], false);
      tokens.push(
        <span
          key={`math-${keyIdx++}`}
          className="inline-block px-1 py-0.5 rounded bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200/50 dark:border-emerald-800/40 font-mono text-[11px] align-middle"
          dangerouslySetInnerHTML={{ __html: mathHtml }}
        />
      );
    } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`') && match[3]) {
      // Inline Code
      tokens.push(
        <code
          key={`code-${keyIdx++}`}
          className="px-1.5 py-0.5 rounded bg-[#F7F5F2] dark:bg-[#282C37] text-[#1A1A1A] dark:text-[#F3F4F6] border border-[#E8E5DF] dark:border-[#3A404F] font-mono text-[11px]"
        >
          {match[3]}
        </code>
      );
    } else if (fullMatch.startsWith('**') && fullMatch.endsWith('**') && match[4]) {
      // Bold
      tokens.push(
        <strong
          key={`bold-${keyIdx++}`}
          className="font-bold text-[#1A1A1A] dark:text-[#F3F4F6]"
        >
          {match[4]}
        </strong>
      );
    } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*') && match[5]) {
      // Italic
      tokens.push(
        <em key={`em-${keyIdx++}`} className="italic">
          {match[5]}
        </em>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < remaining.length) {
    tokens.push(
      <span key={`txt-end-${keyIdx++}`}>
        {remaining.substring(lastIndex)}
      </span>
    );
  }

  return tokens.length > 0 ? tokens : [<span key="empty">{text}</span>];
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content, className = '' }) => {
  const elements = useMemo(() => {
    if (!content) return null;

    const nodes: React.ReactNode[] = [];
    const lines = content.split('\n');
    let idx = 0;
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeLines: string[] = [];

    let inMathBlock = false;
    let mathLines: string[] = [];

    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (inTable && tableHeaders.length > 0) {
        nodes.push(
          <div key={`table-${idx++}`} className="my-2.5 overflow-x-auto rounded-xl border border-[#E8E5DF] dark:border-[#2D323F]">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-[#F7F5F2] dark:bg-[#1E2330] border-b border-[#E8E5DF] dark:border-[#2D323F]">
                  {tableHeaders.map((th, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 font-bold text-[#1A1A1A] dark:text-[#F3F4F6] whitespace-nowrap">
                      {renderInlineText(th)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5DF] dark:divide-[#2D323F]">
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#FDFCFB] dark:hover:bg-[#22252E] transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-[#4B5563] dark:text-[#9CA3AF]">
                        {renderInlineText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check for code blocks ```
      if (trimmed.startsWith('```')) {
        flushTable();
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = trimmed.slice(3).trim();
          codeLines = [];
        } else {
          inCodeBlock = false;
          nodes.push(
            <CodeBlock
              key={`code-${idx++}`}
              language={codeLanguage}
              code={codeLines.join('\n')}
            />
          );
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // Check for standalone display math blocks $$ or \[
      if (trimmed === '$$' || trimmed === '\\[') {
        flushTable();
        if (!inMathBlock) {
          inMathBlock = true;
          mathLines = [];
        } else {
          inMathBlock = false;
          const mathHtml = renderKatex(mathLines.join('\n'), true);
          nodes.push(
            <div
              key={`math-block-${idx++}`}
              className="my-3 px-4 py-3 rounded-xl bg-[#FDFCFB] dark:bg-[#1E2330] border border-emerald-200 dark:border-emerald-800/60 overflow-x-auto text-center shadow-2xs"
              dangerouslySetInnerHTML={{ __html: mathHtml }}
            />
          );
        }
        continue;
      }

      // Single line display math: $$ formula $$
      if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 2) {
        flushTable();
        const formula = trimmed.slice(2, -2);
        const mathHtml = renderKatex(formula, true);
        nodes.push(
          <div
            key={`math-block-${idx++}`}
            className="my-3 px-4 py-3 rounded-xl bg-[#FDFCFB] dark:bg-[#1E2330] border border-emerald-200 dark:border-emerald-800/60 overflow-x-auto text-center shadow-2xs"
            dangerouslySetInnerHTML={{ __html: mathHtml }}
          />
        );
        continue;
      }

      if (inMathBlock) {
        if (trimmed === '$$' || trimmed === '\\]') {
          inMathBlock = false;
          const mathHtml = renderKatex(mathLines.join('\n'), true);
          nodes.push(
            <div
              key={`math-block-${idx++}`}
              className="my-3 px-4 py-3 rounded-xl bg-[#FDFCFB] dark:bg-[#1E2330] border border-emerald-200 dark:border-emerald-800/60 overflow-x-auto text-center shadow-2xs"
              dangerouslySetInnerHTML={{ __html: mathHtml }}
            />
          );
        } else {
          mathLines.push(line);
        }
        continue;
      }

      // Check for Markdown tables | Col 1 | Col 2 |
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());

        // Check if separator line |---|---|
        const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));
        if (isSeparator) {
          continue;
        }

        if (!inTable) {
          inTable = true;
          tableHeaders = cells;
          tableRows = [];
        } else {
          tableRows.push(cells);
        }
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Empty line
      if (!trimmed) {
        nodes.push(<div key={`spacer-${idx++}`} className="h-2" />);
        continue;
      }

      // Headings
      if (trimmed.startsWith('### ')) {
        nodes.push(
          <h4
            key={`h4-${idx++}`}
            className="text-xs font-bold font-display text-[#1A1A1A] dark:text-[#F3F4F6] mt-3 mb-1 tracking-tight"
          >
            {renderInlineText(trimmed.slice(4))}
          </h4>
        );
        continue;
      }

      if (trimmed.startsWith('## ')) {
        nodes.push(
          <h3
            key={`h3-${idx++}`}
            className="text-sm font-bold font-display text-[#1A1A1A] dark:text-[#F3F4F6] mt-3.5 mb-1.5 tracking-tight border-b border-[#E8E5DF] dark:border-[#2D323F] pb-1"
          >
            {renderInlineText(trimmed.slice(3))}
          </h3>
        );
        continue;
      }

      if (trimmed.startsWith('# ')) {
        nodes.push(
          <h2
            key={`h2-${idx++}`}
            className="text-base font-bold font-display text-[#1A1A1A] dark:text-[#F3F4F6] mt-4 mb-2 tracking-tight border-b border-[#E8E5DF] dark:border-[#2D323F] pb-1.5"
          >
            {renderInlineText(trimmed.slice(2))}
          </h2>
        );
        continue;
      }

      // Blockquotes
      if (trimmed.startsWith('> ')) {
        nodes.push(
          <blockquote
            key={`quote-${idx++}`}
            className="pl-3 py-1 my-1.5 border-l-2 border-emerald-500 text-xs italic text-[#4B5563] dark:text-[#9CA3AF] bg-[#F7F5F2]/50 dark:bg-[#1E2330]/40 rounded-r-lg"
          >
            {renderInlineText(trimmed.slice(2))}
          </blockquote>
        );
        continue;
      }

      // Unordered lists (- or *)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        nodes.push(
          <div key={`li-${idx++}`} className="flex items-start space-x-2 my-0.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
            <span className="flex-1 leading-relaxed text-[#1A1A1A] dark:text-[#F3F4F6]">
              {renderInlineText(trimmed.slice(2))}
            </span>
          </div>
        );
        continue;
      }

      // Numbered lists (1. , 2. )
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        nodes.push(
          <div key={`numli-${idx++}`} className="flex items-start space-x-2 my-0.5 text-xs">
            <span className="font-mono-num font-bold text-emerald-600 dark:text-emerald-400 text-[11px] mt-0.5 shrink-0">
              {numMatch[1]}.
            </span>
            <span className="flex-1 leading-relaxed text-[#1A1A1A] dark:text-[#F3F4F6]">
              {renderInlineText(numMatch[2])}
            </span>
          </div>
        );
        continue;
      }

      // Standard paragraph line
      nodes.push(
        <p key={`p-${idx++}`} className="leading-relaxed text-[#1A1A1A] dark:text-[#F3F4F6] text-xs">
          {renderInlineText(line)}
        </p>
      );
    }

    if (inTable) {
      flushTable();
    }

    return nodes;
  }, [content]);

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};
