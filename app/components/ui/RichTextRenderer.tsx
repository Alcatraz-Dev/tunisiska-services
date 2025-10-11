import React from 'react';
import { View } from 'react-native';
import { AutoText } from './AutoText';

interface RichTextRendererProps {
  content: any[];
  className?: string;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  content,
  className = '',
}) => {
  if (!content || !Array.isArray(content)) {
    return null;
  }

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