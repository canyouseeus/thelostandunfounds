/**
 * AI Writing Prompt Page
 * Displays the AI writing prompt for contributors in a styled box with copy functionality
 */

import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import { Copy, Check } from 'lucide-react';

export default function AIWritingPrompt() {
  const { success } = useToast();
  const [promptContent, setPromptContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadPrompt = async () => {
      try {
        const response = await fetch('/prompts/AI_WRITING_PROMPT_FOR_CONTRIBUTORS.md');
        if (response.ok) {
          const text = await response.text();
          setPromptContent(text);
        } else {
          console.error('Failed to load prompt file');
          setPromptContent('Failed to load prompt. Please refresh the page.');
        }
      } catch (error) {
        console.error('Error loading prompt:', error);
        setPromptContent('Error loading prompt. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    loadPrompt();
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(promptContent);
      setCopied(true);
      success('AI Writing Prompt copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          AI Writing Prompt for Contributors
        </h1>
        <p className="text-white/70">
          Copy this prompt to use with your AI assistant when writing articles for THE LOST ARCHIVES BOOK CLUB
        </p>
      </div>

      {/* Prompt Box */}
      {loading ? (
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <p className="text-white/60">Loading prompt...</p>
        </div>
      ) : (
        <div className="bg-black/50 border border-white/10 rounded-none p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">AI Writing Prompt</h2>
              <p className="text-white/60 text-sm mb-2">
                Use this prompt exactly as provided to ensure your article matches our format and style requirements.
              </p>
            </div>
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition flex items-center gap-2 flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Prompt
                </>
              )}
            </button>
          </div>
          <pre className="bg-black/50 border border-white/10 rounded-none p-4 overflow-x-auto text-white/90 text-sm font-mono whitespace-pre-wrap break-words text-left max-h-[600px] overflow-y-auto">
            <code className="text-left">{promptContent}</code>
          </pre>
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-black/30 border border-white/10 rounded-none p-6 mt-6">
        <h3 className="text-lg font-bold text-white mb-4">Important Tips for Contributors</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-semibold mb-2">How Book Linking Works:</h4>
            <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
              <li>Book titles in the text will automatically become clickable links - just mention them naturally where relevant</li>
              <li>Each book should be linked a maximum of 2 times - once in the introduction and once in its dedicated section</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-2">What's Automated:</h4>
            <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
              <li>The Amazon Affiliate Disclosure is automatically added at the end - you don't need to include it in your content</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-2">Formatting Tips:</h4>
            <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
              <li>Use double line breaks (⸻) to separate major sections</li>
              <li>Keep paragraphs focused - one main idea per paragraph</li>
              <li>Write for humans, not algorithms - prioritize genuine insights over keyword stuffing</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-2">Ready to Submit?</h4>
            <p className="text-white/70 text-sm mb-2">
              Once you have your draft, go to <a href="/submit-article" className="text-blue-400 hover:text-blue-300 underline">/submit-article</a> and paste your content. Make sure to:
            </p>
            <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
              <li>Fill in all placeholders with actual information</li>
              <li>Add your Amazon affiliate links in the form</li>
              <li>Review the formatting matches the example post</li>
              <li>Add your personal touches and experiences</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
