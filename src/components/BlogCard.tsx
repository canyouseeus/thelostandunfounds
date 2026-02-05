import React from 'react';
import { Link } from 'react-router-dom';
import {
    Expandable,
    ExpandableCard,
    ExpandableCardHeader,
    ExpandableCardContent,
    ExpandableCardFooter,
    ExpandableContent,
    ExpandableTrigger,
} from './ui/expandable';

export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content?: string | null;
    published_at: string | null;
    created_at: string;
    subdomain?: string | null;
    blog_column?: string | null;
    author_id?: string | null;
}

interface BlogCardProps {
    post: BlogPost;
    /**
     * Optional override for the link URL.
     * If not provided, it will be automatically calculated based on the post's subdomain/column.
     */
    link?: string;
}

export const BlogCard: React.FC<BlogCardProps> = ({ post, link }) => {
    // --- Helper Functions (Extracted from Blog.tsx) ---

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const extractFirstImage = (content?: string | null) => {
        if (!content) return null;
        const markdownMatch = content.match(/!\[[^\]]*?\]\((https?:\/\/[^\s)]+?\.(?:png|jpe?g|gif|webp))\)/i);
        if (markdownMatch) return markdownMatch[1];
        const urlMatch = content.match(/(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp))/i);
        if (urlMatch) return urlMatch[1];
        return null;
    };

    const stripHtml = (html: string) => {
        if (!html) return '';
        const unescaped = html.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        return unescaped.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    };

    const buildPreviewExcerpt = (post: BlogPost) => {
        if (post.excerpt && post.excerpt.trim().length > 0) {
            const preview = stripHtml(post.excerpt);
            return preview.length > 220
                ? preview.substring(0, 220).replace(/\s+\S*$/, '') + '...'
                : preview;
        }

        const source = stripHtml(post.content || '');
        if (!source) return '';
        const sentences = source
            .split(/(?<=[.!?])\s+/)
            .filter(Boolean);
        const candidate = sentences.slice(0, 2).join(' ');
        const preview = candidate || sentences[0] || source;
        return preview.length > 220
            ? preview.substring(0, 220).replace(/\s+\S*$/, '') + '...'
            : preview;
    };

    const buildExpandedIntro = (post: BlogPost) => {
        const source = (post.content || post.excerpt || '').trim();
        if (!source) return '';

        // If it's HTML, we should try to get the first paragraph text
        const firstParagraph = source.split(/\n\n+/)[0] || source.split(/<\/p>/)[0] || '';
        const stripped = stripHtml(firstParagraph);
        return stripped.substring(0, 420);
    };

    // --- Logic ---

    const excerpt = buildPreviewExcerpt(post);
    const imageUrl = extractFirstImage(post.content || post.excerpt || '');
    const expandedIntro = buildExpandedIntro(post);
    const showAdditionalContent = !!expandedIntro;

    let postLink = link;
    if (!postLink) {
        if (post.subdomain) {
            postLink = `/blog/${post.subdomain}/${post.slug}`;
        } else {
            postLink = `/thelostarchives/${post.slug}`;
        }
    }

    return (
        <Expandable
            expandDirection="vertical"
            expandBehavior="replace"
            initialDelay={0}
            transition={{ duration: 0.2, ease: "easeOut" }}
        >
            {({ isExpanded }) => (
                <ExpandableTrigger>
                    <div
                        className="rounded-none"
                        style={{
                            minHeight: isExpanded ? '420px' : '220px',
                            transition: 'min-height 0.2s ease-out',
                        }}
                    >
                        <ExpandableCard
                            className="bg-black rounded-none h-full flex flex-col relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] cursor-pointer"
                            collapsedSize={{ height: 220 }}
                            expandedSize={{ height: 420 }}
                            hoverToExpand={false}
                            expandDelay={0}
                            collapseDelay={0}
                        >
                            <ExpandableCardHeader className="mb-1 pb-1">
                                <h2 className="text-base font-black text-white mb-0 tracking-wide transition whitespace-nowrap overflow-hidden text-ellipsis">
                                    {post.title}
                                </h2>
                                <time className="text-white/60 text-xs font-medium block mt-1">
                                    {formatDate(post.published_at || post.created_at)}
                                </time>
                            </ExpandableCardHeader>

                            <ExpandableCardContent className="flex-1 min-h-0">
                                {excerpt && (
                                    <div className="mb-1">
                                        <p className="text-white/70 text-sm leading-relaxed line-clamp-4 text-left">
                                            {excerpt}
                                        </p>
                                    </div>
                                )}

                                <ExpandableContent
                                    preset="fade"
                                    stagger
                                    staggerChildren={0.1}
                                    keepMounted={false}
                                >
                                    {imageUrl && (
                                        <div className="mb-3">
                                            <img
                                                src={imageUrl}
                                                alt={post.title}
                                                className="w-full h-32 object-cover rounded-none bg-white/5"
                                            />
                                        </div>
                                    )}
                                    {showAdditionalContent && (
                                        <div className="mb-2">
                                            <p className="text-white/60 text-xs leading-relaxed text-left line-clamp-6">
                                                {expandedIntro}
                                            </p>
                                        </div>
                                    )}
                                    <Link
                                        to={postLink!}
                                        className="inline-block mt-2 text-white/80 hover:text-white text-xs font-semibold transition"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Read Full Article →
                                    </Link>
                                </ExpandableContent>
                            </ExpandableCardContent>

                            <ExpandableCardFooter className="mt-auto p-3 pt-2 pb-3">
                                <div className="flex items-center justify-end gap-2 min-w-0 w-full">
                                    {!isExpanded && (
                                        <span className="text-white/90 text-xs font-semibold transition flex-shrink-0 whitespace-nowrap">
                                            Click to expand →
                                        </span>
                                    )}
                                </div>
                            </ExpandableCardFooter>
                        </ExpandableCard>
                    </div>
                </ExpandableTrigger>
            )}
        </Expandable>
    );
};
