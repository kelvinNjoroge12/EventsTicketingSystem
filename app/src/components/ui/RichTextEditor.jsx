import React, { useEffect, useMemo, useRef } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Underline,
  Unlink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isRichTextEmpty,
  normalizeEditorUrl,
  normalizeRichTextHtml,
  sanitizeRichTextHtml,
} from '@/lib/richText';

const TOOLBAR_BUTTON_CLASSNAME = 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#475569] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC] hover:text-[#0F172A]';
const COLOR_INPUT_CLASSNAME = 'h-9 w-9 cursor-pointer rounded-lg border border-[#E2E8F0] bg-white p-1';

const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Write your event description here...',
  helperText,
  error,
  className,
  editorClassName,
}) => {
  const editorRef = useRef(null);
  const selectionRef = useRef(null);
  const normalizedValue = useMemo(() => normalizeRichTextHtml(value), [value]);
  const isEmpty = useMemo(() => isRichTextEmpty(normalizedValue), [normalizedValue]);

  useEffect(() => {
    if (!editorRef.current) return;
    const currentSanitized = sanitizeRichTextHtml(editorRef.current.innerHTML);
    if (currentSanitized !== normalizedValue) {
      editorRef.current.innerHTML = normalizedValue;
    }
  }, [normalizedValue]);

  const saveSelection = () => {
    if (typeof window === 'undefined') return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      selectionRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    if (typeof window === 'undefined') return;
    const selection = window.getSelection();
    if (!selection || !selectionRef.current) return;
    try {
      selection.removeAllRanges();
      selection.addRange(selectionRef.current);
    } catch {
      selectionRef.current = null;
    }
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const emitChange = () => {
    if (!editorRef.current || typeof onChange !== 'function') return;
    const sanitized = sanitizeRichTextHtml(editorRef.current.innerHTML);
    if (editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized;
    }
    onChange(sanitized);
  };

  const runCommand = (command, commandValue = null) => {
    if (typeof document === 'undefined') return;
    focusEditor();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    emitChange();
  };

  const applyLink = () => {
    if (typeof window === 'undefined') return;
    const nextUrl = window.prompt('Enter the link URL');
    if (!nextUrl) return;
    runCommand('createLink', normalizeEditorUrl(nextUrl));
  };

  const applyHighlight = (color) => {
    if (typeof document === 'undefined') return;
    focusEditor();
    restoreSelection();
    document.execCommand('hiliteColor', false, color);
    document.execCommand('backColor', false, color);
    saveSelection();
    emitChange();
  };

  const handlePaste = (event) => {
    if (typeof document === 'undefined') return;
    event.preventDefault();
    const html = event.clipboardData?.getData('text/html');
    const text = event.clipboardData?.getData('text/plain');
    const nextContent = html ? sanitizeRichTextHtml(html) : normalizeRichTextHtml(text || '');
    focusEditor();
    restoreSelection();
    document.execCommand('insertHTML', false, nextContent);
    saveSelection();
    emitChange();
  };

  const handleToolbarMouseDown = (event, callback) => {
    event.preventDefault();
    callback();
  };

  return (
    <div className={cn('rounded-2xl border bg-white shadow-sm', error ? 'border-[#DC2626]' : 'border-[#E2E8F0]', className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
        <button type="button" className={TOOLBAR_BUTTON_CLASSNAME} onMouseDown={(event) => handleToolbarMouseDown(event, () => runCommand('bold'))} aria-label="Bold">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASSNAME} onMouseDown={(event) => handleToolbarMouseDown(event, () => runCommand('italic'))} aria-label="Italic">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASSNAME} onMouseDown={(event) => handleToolbarMouseDown(event, () => runCommand('underline'))} aria-label="Underline">
          <Underline className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASSNAME} onMouseDown={(event) => handleToolbarMouseDown(event, () => runCommand('insertUnorderedList'))} aria-label="Bullet list">
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASSNAME} onMouseDown={(event) => handleToolbarMouseDown(event, () => runCommand('insertOrderedList'))} aria-label="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASSNAME} onMouseDown={(event) => handleToolbarMouseDown(event, () => runCommand('formatBlock', '<h2>'))} aria-label="Heading">
          <Heading2 className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASSNAME} onMouseDown={(event) => handleToolbarMouseDown(event, () => runCommand('formatBlock', '<blockquote>'))} aria-label="Quote">
          <Quote className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASSNAME} onMouseDown={(event) => handleToolbarMouseDown(event, applyLink)} aria-label="Insert link">
          <Link2 className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASSNAME} onMouseDown={(event) => handleToolbarMouseDown(event, () => runCommand('unlink'))} aria-label="Remove link">
          <Unlink className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASSNAME} onMouseDown={(event) => handleToolbarMouseDown(event, () => runCommand('justifyLeft'))} aria-label="Align left">
          <AlignLeft className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASSNAME} onMouseDown={(event) => handleToolbarMouseDown(event, () => runCommand('justifyCenter'))} aria-label="Align center">
          <AlignCenter className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASSNAME} onMouseDown={(event) => handleToolbarMouseDown(event, () => runCommand('justifyRight'))} aria-label="Align right">
          <AlignRight className="h-4 w-4" />
        </button>
        <input
          type="color"
          className={COLOR_INPUT_CLASSNAME}
          title="Text color"
          aria-label="Text color"
          defaultValue="#02338D"
          onMouseDown={saveSelection}
          onChange={(event) => runCommand('foreColor', event.target.value)}
        />
        <input
          type="color"
          className={COLOR_INPUT_CLASSNAME}
          title="Highlight color"
          aria-label="Highlight color"
          defaultValue="#FEF08A"
          onMouseDown={saveSelection}
          onChange={(event) => applyHighlight(event.target.value)}
        />
        <button type="button" className={TOOLBAR_BUTTON_CLASSNAME} onMouseDown={(event) => handleToolbarMouseDown(event, () => runCommand('removeFormat'))} aria-label="Clear formatting">
          <Eraser className="h-4 w-4" />
        </button>
      </div>

      <div className="relative">
        {isEmpty && (
          <div className="pointer-events-none absolute inset-x-0 top-0 px-4 py-3 text-sm text-[#94A3B8]">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            'min-h-[260px] w-full px-4 py-3 text-sm text-[#0F172A] focus:outline-none',
            '[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5',
            '[&_a]:text-[#02338D] [&_a]:underline',
            editorClassName
          )}
          onInput={emitChange}
          onBlur={() => {
            saveSelection();
            emitChange();
          }}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onPaste={handlePaste}
        />
      </div>

      {(helperText || error) && (
        <div className="border-t border-[#E2E8F0] px-4 py-3">
          {error ? (
            <p className="text-xs text-[#DC2626]">{error}</p>
          ) : (
            <p className="text-xs text-[#64748B]">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
