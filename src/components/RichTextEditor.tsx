/**
 * Rich Text Editor Component
 * Uses TipTap with a floating tooltip (bubble menu) for adding product links.
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Link as LinkIcon, X } from 'lucide-react';

interface ProductLinkData {
    url: string;
    title: string;
    phrase: string;
}

interface RichTextEditorProps {
    content: string;
    onChange: (html: string, links: ProductLinkData[]) => void;
    placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const [selectedText, setSelectedText] = useState('');
    const [productLinks, setProductLinks] = useState<ProductLinkData[]>([]);

    // Floating tooltip state
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const editorContainerRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-white underline hover:text-white/80 transition cursor-pointer',
                    rel: 'noopener noreferrer nofollow',
                    target: '_blank',
                },
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none min-h-[300px] focus:outline-none p-4 text-white/90 leading-relaxed',
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange(html, productLinks);
        },
        onSelectionUpdate: ({ editor }) => {
            const { from, to, empty } = editor.state.selection;

            if (!empty && (to - from) > 0) {
                // Get selection coordinates
                const view = editor.view;
                const start = view.coordsAtPos(from);
                const end = view.coordsAtPos(to);

                // Calculate tooltip position (centered above selection)
                if (editorContainerRef.current) {
                    const containerRect = editorContainerRef.current.getBoundingClientRect();
                    const left = ((start.left + end.right) / 2) - containerRect.left;
                    const top = start.top - containerRect.top - 45; // 45px above selection

                    setTooltipPosition({ top: Math.max(0, top), left: Math.max(40, left) });
                    setShowTooltip(true);
                }
            } else {
                setShowTooltip(false);
            }
        },
        onBlur: () => {
            // Delay hiding tooltip to allow clicking on it
            setTimeout(() => {
                if (!showLinkModal) {
                    setShowTooltip(false);
                }
            }, 200);
        },
    });

    const openLinkModal = useCallback(() => {
        if (!editor) return;

        const { from, to, empty } = editor.state.selection;
        if (empty) return;

        const text = editor.state.doc.textBetween(from, to);
        setSelectedText(text);
        setLinkUrl('');
        setLinkTitle('');
        setShowTooltip(false);
        setShowLinkModal(true);
    }, [editor]);

    const applyLink = useCallback(() => {
        if (!editor || !linkUrl) return;

        editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({
                href: linkUrl,
            } as any)
            .run();

        // Update product links list
        const newLink: ProductLinkData = {
            url: linkUrl,
            title: linkTitle,
            phrase: selectedText,
        };

        const updatedLinks = [...productLinks, newLink];
        setProductLinks(updatedLinks);

        // Trigger onChange with updated content and links
        onChange(editor.getHTML(), updatedLinks);

        setShowLinkModal(false);
        setLinkUrl('');
        setLinkTitle('');
        setSelectedText('');
    }, [editor, linkUrl, linkTitle, selectedText, productLinks, onChange]);

    const removeLink = useCallback((index: number) => {
        const updatedLinks = productLinks.filter((_, i) => i !== index);
        setProductLinks(updatedLinks);

        if (editor) {
            onChange(editor.getHTML(), updatedLinks);
        }
    }, [productLinks, editor, onChange]);

    if (!editor) {
        return null;
    }

    return (
        <div className="relative" ref={editorContainerRef}>
            {/* Editor */}
            <div className="bg-black/30 border border-white/20 rounded-none min-h-[300px] relative">
                <EditorContent editor={editor} />

                {/* Floating Tooltip - appears on text selection */}
                {showTooltip && (
                    <div
                        className="absolute z-50 bg-black border border-white/40 rounded shadow-lg px-2 py-1 flex items-center gap-1 animate-fade-in"
                        style={{
                            top: `${tooltipPosition.top}px`,
                            left: `${tooltipPosition.left}px`,
                            transform: 'translateX(-50%)'
                        }}
                        onMouseDown={(e) => e.preventDefault()} // Prevent blur
                    >
                        <button
                            type="button"
                            onClick={openLinkModal}
                            className="flex items-center gap-1.5 text-white hover:text-white/80 text-sm px-2 py-1 hover:bg-white/10 transition rounded"
                        >
                            <LinkIcon className="w-4 h-4" />
                            <span className="text-xs font-medium">Add Link</span>
                        </button>
                    </div>
                )}
            </div>

            <p className="text-white/40 text-xs mt-2">
                Highlight text to add a product link
            </p>

            {/* Product Links List */}
            {productLinks.length > 0 && (
                <div className="mt-4 bg-black/20 border border-white/10 p-4">
                    <h4 className="text-white/80 text-sm font-semibold mb-3 uppercase tracking-wider">
                        Product Links ({productLinks.length})
                    </h4>
                    <div className="space-y-2">
                        {productLinks.map((link, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between bg-black/30 p-2 border border-white/10"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm truncate">
                                        <span className="text-white/50">"{link.phrase}"</span>
                                        {' → '}
                                        <span className="font-medium">{link.title || 'Untitled'}</span>
                                    </p>
                                    <p className="text-white/40 text-xs truncate">{link.url}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeLink(index)}
                                    className="ml-2 text-white/40 hover:text-red-400 transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Link Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-black border border-white/30 p-6 w-full max-w-md mx-4">
                        <h3 className="text-white text-lg font-bold mb-4">Add Product Link</h3>

                        <div className="mb-4">
                            <label className="block text-white/70 text-sm mb-1">Selected Text</label>
                            <div className="bg-white/5 border border-white/10 p-2 text-white/90">
                                "{selectedText}"
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-white/70 text-sm mb-1">Product Title *</label>
                            <input
                                type="text"
                                value={linkTitle}
                                onChange={(e) => setLinkTitle(e.target.value)}
                                placeholder="e.g., The E-Myth Revisited"
                                className="w-full bg-black border border-white/30 p-2 text-white placeholder:text-white/30 focus:outline-none focus:border-white/60"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-white/70 text-sm mb-1">Affiliate Link URL *</label>
                            <input
                                type="url"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://amzn.to/..."
                                className="w-full bg-black border border-white/30 p-2 text-white placeholder:text-white/30 focus:outline-none focus:border-white/60"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowLinkModal(false)}
                                className="flex-1 px-4 py-2 border border-white/30 text-white/70 hover:text-white hover:border-white/60 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={applyLink}
                                disabled={!linkUrl || !linkTitle}
                                className="flex-1 px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add Link
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
