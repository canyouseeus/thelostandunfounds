import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback, useEffect, useRef } from 'react';
import { LinkIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { BLOG_CONTENT_CLASS } from '../utils/blogStyles';

// --- Toolbar Icons (Inline SVGs for reliability) ---
const Icons = {
    Bold: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8" /><path d="M15 20a4 4 0 0 0 0-8H6v8Z" /></svg>,
    Italic: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>,
    Underline: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg>,
    Strike: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><path d="M16 6C16 6 14.5 4 12 4C9.5 4 8 6 8 6" /><path d="M8 18C8 18 9.5 20 12 20C14.5 20 16 18 16 18" /></svg>,
    H1: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="m17 12 3-2v8" /></svg>,
    H2: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" /></svg>,
    H3: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" /><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" /></svg>,
    BulletList: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>,
    OrderedList: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" x2="21" y1="6" y2="6" /><line x1="10" x2="21" y1="12" y2="12" /><line x1="10" x2="21" y1="18" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></svg>,
    Blockquote: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12h8" /><path d="M16 12V8a4 4 0 0 0-8 0v4" /><path d="M10 16v4a2 2 0 0 0 4 0v-4" /></svg>,
    HorizontalRule: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" x2="19" y1="12" y2="12" /></svg>,
    Code: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
    ClearFormat: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 2v6h6V6.5" /><path d="M21.5 2v6h-6V6.5" /><path d="M22 2l-7.5 7.5L9.5 2" /><line x1="9" x2="15" y1="8" y2="8" /><line x1="12" x2="12" y1="8" y2="22" /></svg>,
    Undo: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>,
    Redo: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></svg>,
};

// --- Menu Bar Component ---

interface MenuBarProps {
    editor: Editor | null;
}

const MenuBar = ({ editor }: MenuBarProps) => {
    if (!editor) {
        return null;
    }

    const Button = ({ onClick, isActive, disabled, children, title }: any) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`p-1.5 rounded transition-all ${isActive
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'text-white/60 hover:text-white hover:bg-white/10'
                } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
            title={title}
        >
            {children}
        </button>
    );

    const Divider = () => <div className="w-[1px] h-6 bg-white/10 mx-1" />;

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-black border-b border-white/10 sticky top-0 z-50">
            <Button
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold (Cmd+B)"
            >
                <Icons.Bold />
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic (Cmd+I)"
            >
                <Icons.Italic />
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                disabled={!editor.can().chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                title="Underline (Cmd+U)"
            >
                <Icons.Underline />
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                disabled={!editor.can().chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                title="Strike (Cmd+Shift+X)"
            >
                <Icons.Strike />
            </Button>

            <Divider />

            <Button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
            >
                <Icons.H1 />
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
            >
                <Icons.H2 />
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
            >
                <Icons.H3 />
            </Button>

            <Divider />

            <Button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
            >
                <Icons.BulletList />
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Ordered List"
            >
                <Icons.OrderedList />
            </Button>

            <Divider />

            <Button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Blockquote"
            >
                <Icons.Blockquote />
            </Button>
            <Button
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                isActive={editor.isActive('codeBlock')}
                title="Code Block"
            >
                <Icons.Code />
            </Button>
            <Button
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Horizontal Rule"
            >
                <Icons.HorizontalRule />
            </Button>

            <Divider />

            <div className="flex items-center gap-2 group relative">
                <input
                    type="color"
                    onInput={(event: any) => editor.chain().focus().setColor(event.target.value).run()}
                    value={editor.getAttributes('textStyle').color || '#ffffff'}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border border-white/20 p-0.5"
                    title="Text Color"
                />
                <span className="text-[10px] text-white/50 uppercase tracking-wider hidden group-hover:block absolute top-9 left-0 bg-black px-2 py-1 rounded border border-white/20 whitespace-nowrap">Color</span>
            </div>

            <Button
                onClick={() => editor.chain().focus().unsetAllMarks().run()}
                title="Clear Formatting"
            >
                <Icons.ClearFormat />
            </Button>

            <Divider />

            <Button
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                title="Undo (Cmd+Z)"
            >
                <Icons.Undo />
            </Button>
            <Button
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                title="Redo (Cmd+Shift+Z)"
            >
                <Icons.Redo />
            </Button>
        </div>
    );
};


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
        if (JSON.stringify(initialLinks) !== JSON.stringify(productLinks)) {
            setProductLinks(initialLinks);
        }
    }, [initialLinks]);

    const editorContainerRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextStyle,
            Color,
            Underline,
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
        <div className="relative border border-white/10 rounded-sm overflow-hidden" ref={editorContainerRef}>
            <MenuBar editor={editor} />

            {/* Editor */}
            <div
                className="bg-black/30 rounded-none min-h-[500px] relative"
                onPointerUp={handlePointerUp}
            >
                <EditorContent editor={editor} />
            </div>

            <p className="text-white/40 text-xs mt-2 px-6">
                Highlight text to add a product link
            </p>

            {/* Product Links List */}
            {productLinks.length > 0 && (
                <div className="mt-4 bg-black/20 p-4 border-t border-white/5">
                    <h4 className="text-white/80 text-sm font-semibold mb-3 uppercase tracking-wider">
                        Product Links ({productLinks.length})
                    </h4>
                    <div className="space-y-2">
                        {productLinks.map((link, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between bg-black/30 p-2 border border-white/5"
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
                                    <XMarkIcon className="w-4 h-4" />
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
                                    <XMarkIcon className="w-5 h-5" />
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
