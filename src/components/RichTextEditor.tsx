import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Link as LinkIcon, X } from 'lucide-react';
import Placeholder from '@tiptap/extension-placeholder';

import { BLOG_CONTENT_CLASS } from '../utils/blogStyles';

interface ProductLinkData {
    url: string;
    title: string;
    phrase: string;
}

interface RichTextEditorProps {
    content: string;
    initialLinks?: ProductLinkData[];
    onChange: (html: string, links: ProductLinkData[]) => void;
    placeholder?: string;
}

export default function RichTextEditor({ content, initialLinks = [], onChange, placeholder }: RichTextEditorProps) {
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showLinkTrigger, setShowLinkTrigger] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const [selectedText, setSelectedText] = useState('');
    const [productLinks, setProductLinks] = useState<ProductLinkData[]>(initialLinks);
    const [storedSelection, setStoredSelection] = useState<{ from: number, to: number } | null>(null);

    // Sync product links when initialLinks changes (e.g., when opening a new submission)
    useEffect(() => {
        // Prevent infinite loop by checking if data actually changed
        // Default param [] creates new reference every render
        if (JSON.stringify(initialLinks) !== JSON.stringify(productLinks)) {
            setProductLinks(initialLinks);
        }
    }, [initialLinks]);

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
            Placeholder.configure({
                placeholder: placeholder || 'Write something...',
                emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-white/30 before:float-left before:pointer-events-none',
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: `${BLOG_CONTENT_CLASS} min-h-[500px] px-6 py-4 outline-none`,
            },
        },

        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange(html, productLinks);
        },
        onSelectionUpdate: ({ editor }) => {
            const { from, to, empty } = editor.state.selection;

            if (!empty && (to - from) > 0) {
                const text = editor.state.doc.textBetween(from, to);
                setSelectedText(text);
                setStoredSelection({ from, to });
                // We show the trigger on pointerup instead to avoid flickering during drag
            } else {
                setShowLinkTrigger(false);
            }
        },
        onBlur: () => {
            // No-op. We want the trigger to stay visible until selection changes or modal opens.
            // This prevents it from disappearing when clicking the top bar.
        },
    });

    const handlePointerUp = useCallback(() => {
        if (!editor || showLinkModal) return;

        const { from, to, empty } = editor.state.selection;
        if (!empty && (to - from) > 0) {
            // Show trigger bar when user finishes selecting
            setShowLinkTrigger(true);
        } else {
            setShowLinkTrigger(false);
        }
    }, [editor, showLinkModal]);

    const handleOpenLinkModal = useCallback(() => {
        setLinkUrl('');
        setLinkTitle('');
        setShowLinkTrigger(false);
        setShowLinkModal(true);
    }, []);

    const closeLinkModal = useCallback(() => {
        setShowLinkModal(false);
        setStoredSelection(null);
        setSelectedText('');
        setLinkUrl('');
        setLinkTitle('');
        setShowLinkTrigger(false);
        // Return focus to editor if needed
        if (editor) {
            editor.chain().focus().run();
        }
    }, [editor]);

    const applyLink = useCallback(() => {
        if (!editor || !linkUrl || !storedSelection) return;

        editor
            .chain()
            .focus()
            .setTextSelection(storedSelection)
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

        closeLinkModal();
    }, [editor, linkUrl, linkTitle, selectedText, productLinks, onChange, storedSelection, closeLinkModal]);

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
            <div
                className="bg-black/30 rounded-none min-h-[500px] relative"
                onPointerUp={handlePointerUp}
            >
                <EditorContent editor={editor} />
            </div>

            <p className="text-white/40 text-xs mt-2">
                Highlight text to add a product link
            </p>

            {/* Product Links List */}
            {productLinks.length > 0 && (
                <div className="mt-4 bg-black/20 p-4">
                    <h4 className="text-white/80 text-sm font-semibold mb-3 uppercase tracking-wider">
                        Product Links ({productLinks.length})
                    </h4>
                    <div className="space-y-2">
                        {productLinks.map((link, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between bg-black/30 p-2"
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

            {/* Price/Link Trigger Bar - iOS Optimization: Fixed Top Bar */}
            {showLinkTrigger && !showLinkModal && (
                <div className="fixed top-0 left-0 right-0 z-[1000000] pointer-events-none p-4 animate-slide-down">
                    <div className="max-w-2xl mx-auto w-full pointer-events-auto">
                        <button
                            type="button"
                            onClick={handleOpenLinkModal}
                            onMouseDown={(e) => e.preventDefault()} // Prevent blur
                            className="w-full bg-white border border-black shadow-2xl p-4 flex items-center justify-center gap-2 group hover:bg-black transition-all duration-300"
                        >
                            <LinkIcon className="w-5 h-5 text-black group-hover:text-white transition-colors" />
                            <span className="text-black group-hover:text-white text-sm font-bold uppercase tracking-[0.2em] transition-colors">
                                Add Product Link
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {/* Link Modal - iOS Optimized: Fixed and Top-Anchored */}
            {showLinkModal && (
                <div className="fixed inset-0 z-[1000001] pointer-events-none">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 pointer-events-auto backdrop-blur-sm animate-fade-in"
                        onClick={closeLinkModal}
                    />

                    {/* Modal Content - Top Anchored */}
                    <div className="absolute top-0 left-0 right-0 p-4 pointer-events-auto animate-slide-down">
                        <div className="bg-black border border-white/30 shadow-2xl max-w-2xl mx-auto w-full pt-2 pb-6 px-6">
                            {/* Drag Indicator / Handle for visual cues */}
                            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white text-lg font-bold">Add Product Link</h3>
                                <button
                                    onClick={closeLinkModal}
                                    className="text-white/40 hover:text-white transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 uppercase tracking-wider font-semibold">Selection Preview</label>
                                    <div className="bg-white/5 border border-white/10 p-2 text-white/90 text-sm h-[88px] overflow-y-auto italic italic-text-selection">
                                        "{selectedText}"
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-white/70 text-xs mb-1 uppercase tracking-wider font-semibold">Product Title *</label>
                                        <input
                                            type="text"
                                            value={linkTitle}
                                            onChange={(e) => setLinkTitle(e.target.value)}
                                            placeholder="Brand & Model"
                                            className="w-full bg-black border border-white/30 p-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/60"
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-white/70 text-xs mb-1 uppercase tracking-wider font-semibold">Affiliate Link *</label>
                                        <input
                                            type="url"
                                            value={linkUrl}
                                            onChange={(e) => setLinkUrl(e.target.value)}
                                            placeholder="https://amzn.to/..."
                                            className="w-full bg-black border border-white/30 p-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/60"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeLinkModal}
                                    className="flex-1 px-4 py-2 border border-white/30 text-white/70 hover:text-white hover:border-white/60 transition text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={applyLink}
                                    disabled={!linkUrl || !linkTitle}
                                    className="flex-1 px-4 py-2 bg-white text-black font-bold hover:bg-white/90 transition disabled:opacity-30 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
                                >
                                    Add Link
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
