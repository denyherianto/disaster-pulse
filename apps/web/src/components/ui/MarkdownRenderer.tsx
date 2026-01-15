import React from 'react';
import { cn } from '@/lib/utils'; // Assuming this exists, if not I'll just use template literals or check for utils

// Simple markdown parser for the AI response
// Handles: **bold**, - lists, 1. numbered lists, ## headers, and newlines
export function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
  if (!content) return null;

  const sections = content.split('\n\n');

  return (
    <div className={cn("space-y-3 text-slate-700", className)}>
      {sections.map((section, sectionIndex) => {
        // Headers
        if (section.startsWith('## ')) {
          return (
            <h3 key={sectionIndex} className="text-lg font-semibold text-slate-900 mt-2">
              {section.replace(/^##\s+/, '')}
            </h3>
          );
        }
        
        // Lists
        if (section.startsWith('- ') || section.match(/^\d+\.\s/)) {
          const items = section.split('\n');
          return (
            <ul key={sectionIndex} className="space-y-1 ml-4 list-disc marker:text-slate-400">
              {items.map((item, itemIndex) => {
                const cleanItem = item.replace(/^- /, '').replace(/^\d+\.\s/, '');
                return (
                  <li key={itemIndex} className="pl-1">
                    <FormattedText text={cleanItem} />
                  </li>
                );
              })}
            </ul>
          );
        }

        // Regular paragraphs (handle single line breaks)
        return (
          <p key={sectionIndex} className="leading-relaxed">
            {section.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                <FormattedText text={line} />
                {i < section.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// Helper to handle bold formatting (**text**)
function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
