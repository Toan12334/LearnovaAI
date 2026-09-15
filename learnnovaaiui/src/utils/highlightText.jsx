import React from 'react';

/**
 * Utility to highlight matched fragments/plagiarized snippets in a text block
 * 
 * @param {string} text - The original text
 * @param {Array<{start: number, end: number, score: number, sourceUrl?: string}>} matches - Match ranges
 * @returns {React.ReactNode}
 */
export function highlightText(text, matches = []) {
  if (!text) return null;
  if (!matches || matches.length === 0) return text;

  // Sort matches by start position
  const sortedMatches = [...matches].sort((a, b) => a.start - b.start);
  const elements = [];
  let currentIndex = 0;

  sortedMatches.forEach((match, idx) => {
    const { start, end, score = 100, sourceUrl } = match;

    if (start > currentIndex) {
      elements.push(
        <span key={`text-${currentIndex}`}>
          {text.slice(currentIndex, start)}
        </span>
      );
    }

    const highlightColor =
      score >= 80 ? 'rgba(239, 68, 68, 0.25)' :
      score >= 50 ? 'rgba(245, 158, 11, 0.25)' :
      'rgba(59, 130, 246, 0.2)';

    const borderColor =
      score >= 80 ? '#ef4444' :
      score >= 50 ? '#f59e0b' :
      '#3b82f6';

    elements.push(
      <mark
        key={`match-${idx}`}
        title={`Độ tương đồng: ${score}% ${sourceUrl ? `- Nguồn: ${sourceUrl}` : ''}`}
        style={{
          backgroundColor: highlightColor,
          borderBottom: `2px solid ${borderColor}`,
          borderRadius: '3px',
          padding: '2px 4px',
          cursor: 'pointer',
          color: 'inherit'
        }}
      >
        {text.slice(start, end)}
      </mark>
    );

    currentIndex = Math.max(currentIndex, end);
  });

  if (currentIndex < text.length) {
    elements.push(
      <span key={`text-end`}>
        {text.slice(currentIndex)}
      </span>
    );
  }

  return elements;
}

export default highlightText;
