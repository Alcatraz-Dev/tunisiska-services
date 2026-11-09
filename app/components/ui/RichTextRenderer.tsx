import React from 'react';
import { View } from 'react-native';
import { AutoText } from './AutoText';

interface RichTextRendererProps {
  content: string | any[] | null | undefined;
  className?: string;
}

export function hasRichTextContent(content: string | any[] | null | undefined) {
  if (typeof content === 'string') return content.trim().length > 0;
  if (!Array.isArray(content)) return false;

  return content.some((block) =>
    Array.isArray(block?.children) &&
    block.children.some((child: any) => typeof child?.text === 'string' && child.text.trim()),
  );
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  content,
  className = '',
}) => {
  if (!content) {
    return null;
  }

  // The admin app historically wrote legal content as plain text, while the
  // Sanity Studio schema stores Portable Text blocks. Render both shapes so
  // older documents remain readable while new edits use the schema format.
  if (typeof content === 'string') {
    const paragraphs = content
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    return (
      <View>
        {paragraphs.map((paragraph, index) => (
          <AutoText
            key={`paragraph-${index}`}
            className={className ? `${className} mb-4 leading-7` : 'mb-4 leading-7'}
          >
            {paragraph}
          </AutoText>
        ))}
      </View>
    );
  }

  if (!Array.isArray(content)) return null;

  return (
    <View>
      {content.map((block, index) => {
        if (block._type === 'block') {
          // Handle different block styles - smaller sizes for mobile app
          let additionalStyle = '';

          switch (block.style) {
            case 'h1':
              additionalStyle = 'text-lg font-bold mb-3';
              break;
            case 'h2':
              additionalStyle = 'text-base font-bold mb-2';
              break;
            case 'h3':
              additionalStyle = 'text-sm font-semibold mb-2';
              break;
            case 'blockquote':
              additionalStyle = 'italic border-l-2 border-gray-300 pl-3 ml-2 mb-3 text-sm';
              break;
            default:
              additionalStyle = 'mb-2 leading-5';
          }

          const combinedClassName = className ? `${className} ${additionalStyle}` : additionalStyle;

          // Render each text segment separately to avoid [object Object] issues
          const renderTextSegments = () => {
            const children = block.children || [];
            const segments: any[] = [];

            children.forEach((child: any, childIndex: number) => {
              if (typeof child === 'string') {
                segments.push(
                  <AutoText key={`text-${childIndex}`} className={combinedClassName}>
                    {child}
                  </AutoText>
                );
              } else {
                const markedText = child.text || '';
                const marks = child.marks || [];
                let segmentClassName = combinedClassName;

                if (marks.includes('strong')) {
                  segmentClassName += ' font-bold';
                }
                if (marks.includes('em')) {
                  segmentClassName += ' italic';
                }

                segments.push(
                  <AutoText key={`mark-${childIndex}`} className={segmentClassName}>
                    {markedText}
                  </AutoText>
                );
              }
            });

            return segments;
          };

          return (
            <View key={index}>
              {renderTextSegments()}
            </View>
          );
        }

        return null;
      })}
    </View>
  );
};
