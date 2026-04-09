import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { normalizeRichTextHtml } from '@/lib/richText';

const DEFAULT_CONTENT_CLASSNAME = [
  'prose prose-slate max-w-none break-words',
  'prose-headings:text-[#0F172A] prose-headings:font-bold',
  'prose-p:text-[#475569] prose-p:leading-7',
  'prose-strong:text-[#0F172A]',
  'prose-a:text-[#02338D] prose-a:font-medium hover:prose-a:text-[#022A78]',
  'prose-blockquote:border-l-[#02338D]/25 prose-blockquote:text-[#475569]',
  'prose-code:text-[#0F172A]',
  'prose-pre:bg-[#0F172A] prose-pre:text-white',
  '[&_ol]:list-decimal [&_ol]:pl-5',
  '[&_ul]:list-disc [&_ul]:pl-5',
  '[&_li]:text-[#475569]',
  '[&_span]:break-words [&_div]:break-words',
].join(' ');

const RichTextContent = ({
  value,
  className,
  emptyFallback = null,
  as: Component = 'div',
}) => {
  const html = useMemo(() => normalizeRichTextHtml(value), [value]);

  if (!html) {
    return emptyFallback;
  }

  return (
    <Component
      className={cn(DEFAULT_CONTENT_CLASSNAME, className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default RichTextContent;
