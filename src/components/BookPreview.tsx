/**
 * Book Preview Component
 * Displays the 4 books featured in a blog post with their Amazon affiliate links
 */

import { BookOpen, ExternalLink } from 'lucide-react';

interface AffiliateLink {
  book_title: string;
  link: string;
}

interface BookPreviewProps {
  books: AffiliateLink[];
}

export default function BookPreview({ books }: BookPreviewProps) {
  if (!books || books.length === 0) {
    return null;
  }

  return (
    <div className="my-12 border-t border-b border-white py-8">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="w-5 h-5 text-white/70" />
        <h2 className="text-xl font-bold text-white text-left">Books Featured in This Article</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {books.map((book, index) => (
          <a
            key={index}
            href={book.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-black/50 border-2 border-white rounded-none p-4 hover:border-white hover:shadow-lg hover:shadow-white/10 transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <h3 className="text-base font-bold text-white mb-2 tracking-wide group-hover:text-white/90 transition line-clamp-3 text-left">
                  {book.book_title}
                </h3>
              </div>
              <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white/70 transition flex-shrink-0 mt-1" />
            </div>
            <div className="flex items-center gap-2 text-xs text-white/50 mt-3">
              <span>View on Amazon</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
