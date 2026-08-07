import React from 'react';

/**
 * Formats any price into Brazilian currency string format with 2 decimal places (R$ X,XX).
 * Example: 10 -> "10,00", 349.9 -> "349,90", 0 -> "0,00"
 */
export function formatPrice(val) {
  if (val === undefined || val === null || isNaN(val)) return '0,00';
  const num = Number(val);
  return num.toFixed(2).replace('.', ',');
}

/**
 * Fallback image URL when an image is missing or fails to load.
 */
export const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';

/**
 * Handles image load errors by replacing broken src with fallback image.
 */
export function handleImageError(e) {
  e.target.onerror = null;
  e.target.src = DEFAULT_FALLBACK_IMAGE;
}

/**
 * Parses and renders rich text description supporting:
 * - Titles / Headings: # Title, ## Title, ### Title
 * - Bold: **bold text**
 * - Italic: *italic text* or _italic text_
 * - Bullet Points: - Item or * Item
 * - Paragraphs and Line Breaks
 */
export function renderFormattedDescription(text) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#cccccc', fontSize: '13px', lineHeight: '1.6' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} style={{ height: '6px' }} />;

        // Headings (#, ##, ###)
        if (trimmed.startsWith('### ')) {
          return (
            <h5 key={idx} style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginTop: '10px', marginBottom: '2px', textTransform: 'uppercase' }}>
              {parseInlineFormatting(trimmed.replace(/^###\s+/, ''))}
            </h5>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h4 key={idx} style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', marginTop: '12px', marginBottom: '4px', textTransform: 'uppercase' }}>
              {parseInlineFormatting(trimmed.replace(/^##\s+/, ''))}
            </h4>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h3 key={idx} style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', marginTop: '14px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {parseInlineFormatting(trimmed.replace(/^#\s+/, ''))}
            </h3>
          );
        }

        // Bullet Points (- Item or * Item)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', paddingLeft: '8px' }}>
              <span style={{ color: '#3498db', fontWeight: 'bold' }}>•</span>
              <span>{parseInlineFormatting(trimmed.replace(/^[-*]\s+/, ''))}</span>
            </div>
          );
        }

        // Standard Paragraph
        return (
          <p key={idx} style={{ margin: 0 }}>
            {parseInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Parses inline formatting for **bold** and *italic*
 */
function parseInlineFormatting(str) {
  // Regex pattern for **bold** and *italic*
  const parts = [];
  let remaining = str;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Match **bold**
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    // Match *italic* or _italic_
    const italicMatch = remaining.match(/[\*_](.*?)[\*_]/);

    // Find the earliest match
    let firstMatch = null;
    let matchType = null;

    if (boldMatch && (!italicMatch || boldMatch.index <= italicMatch.index)) {
      firstMatch = boldMatch;
      matchType = 'bold';
    } else if (italicMatch) {
      firstMatch = italicMatch;
      matchType = 'italic';
    }

    if (!firstMatch) {
      parts.push(<React.Fragment key={keyIdx++}>{remaining}</React.Fragment>);
      break;
    }

    // Add text before match
    if (firstMatch.index > 0) {
      parts.push(<React.Fragment key={keyIdx++}>{remaining.slice(0, firstMatch.index)}</React.Fragment>);
    }

    // Add formatted match
    if (matchType === 'bold') {
      parts.push(<strong key={keyIdx++} style={{ color: '#ffffff', fontWeight: '800' }}>{firstMatch[1]}</strong>);
    } else if (matchType === 'italic') {
      parts.push(<em key={keyIdx++} style={{ color: '#dddddd', fontStyle: 'italic' }}>{firstMatch[1]}</em>);
    }

    remaining = remaining.slice(firstMatch.index + firstMatch[0].length);
  }

  return parts;
}
