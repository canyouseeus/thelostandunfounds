import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function BlogGettingStarted() {
  return (
    <>
      <Helmet>
        <title>Contributor Getting Started Guide | THE LOST ARCHIVES BOOK CLUB</title>
        <meta name="description" content="A guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES BOOK CLUB." />
      </Helmet>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-6 tracking-wide uppercase">
            THE LOST ARCHIVES BOOK CLUB
          </h1>
          <h2 className="text-xl md:text-2xl font-bold text-white/80 mb-4 uppercase tracking-wider">
            Contributor Getting Started Guide
          </h2>
          <div className="h-1 w-24 bg-white/20 mx-auto my-6"></div>
        </div>

        {/* Introduction */}
        <div className="mb-12 prose prose-invert prose-lg max-w-none">
          <h3 className="text-2xl font-bold text-white mb-4 border-l-4 border-white/20 pl-4">Introduction</h3>
          <p className="text-white/80 leading-relaxed mb-6">
            Welcome to <strong className="text-white">THE LOST ARCHIVES BOOK CLUB</strong>, a platform designed to help contributors share thoughtful reflections on books, engage readers, and earn as Amazon affiliates. This guide walks you through getting set up, writing high-quality articles, and using AI effectively while maintaining your unique voice by implementing Human-In-The-Loop principles and meeting Google’s standards for human expertise, experience, authority, and trust (E‑E‑A‑T).
          </p>
          <p className="text-white/80 leading-relaxed mb-6">
            THE LOST ARCHIVES BOOK CLUB exists to give contributors the opportunity to share knowledge, express personal insights, and connect with an audience they may not have reached through traditional channels. By contributing, you not only help educate and inspire others but also create a pathway to earn online by leveraging your expertise and experiences in meaningful ways.
          </p>
        </div>

        {/* Why Contribute? */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-white/20 pl-4">Why Contribute?</h3>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-2">Centralized Reach & Community Impact</h4>
              <p className="text-white/70 text-sm">
                Your reviews become part of a trusted, curated platform that attracts readers interested in thoughtful book reflections. Unlike personal blogs or social media, THE LOST ARCHIVES BOOK CLUB drives traffic to all contributor content, giving you more visibility and increasing the potential for affiliate revenue.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-2">Collaborative Credibility</h4>
              <p className="text-white/70 text-sm">
                Multiple contributors reviewing the same books create a rich ecosystem of perspectives. Readers can compare opinions, see how different people are impacted by the same book, and gain deeper insights. Your work gains authority by association with other thoughtful reviews.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-2">Affiliate Opportunities</h4>
              <p className="text-white/70 text-sm">
                Every article includes Amazon affiliate links. By publishing on this platform, your links benefit from more readers, search visibility, and engagement, increasing the chance of purchases and commissions.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-2">Searchable Knowledge Base</h4>
              <p className="text-white/70 text-sm">
                Readers can search by book title or author, surfacing multiple articles about the same book. This allows them to explore different perspectives and click affiliate links to purchase books. Contributors benefit from increased engagement and potential affiliate revenue.
              </p>
            </div>
          </div>
        </div>

        {/* 1. Getting Set Up */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-white/20 pl-4">1. Getting Set Up: Registration & Amazon Affiliate Integration</h3>
          
          <div className="bg-black/40 border border-white/10 p-8 mb-6 rounded-none">
            <h4 className="text-xl font-bold text-white mb-4">Steps</h4>
            <ol className="list-decimal list-inside space-y-4 text-white/80">
              <li>
                <strong className="text-white">Create your contributor account</strong> on THE LOST ARCHIVES BOOK CLUB.
              </li>
              <li>
                <strong className="text-white">Choose a username</strong>; this generates your custom contributor URL.
              </li>
              <li>
                <strong className="text-white">Sign up for the Amazon Affiliate program</strong> if you haven’t already.
                <br />
                <a href="https://affiliate-program.amazon.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline ml-5 text-sm">
                  Use this link: Amazon Associates
                </a>
              </li>
              <li>
                During setup, <strong className="text-white">paste your custom contributor URL</strong> to tie your affiliate links to your account.
              </li>
              <li>
                <strong className="text-white">Obtain your Amazon Store ID</strong> from your Amazon account.
              </li>
              <li>
                Return to our platform and <strong className="text-white">paste your Store ID</strong> to finalize setup.
              </li>
            </ol>
          </div>

          <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6">
            <h5 className="font-bold text-white mb-2">Why this matters</h5>
            <p className="text-white/70 text-sm">
              Correct setup ensures all affiliate links are tracked, so you earn commissions when readers purchase through your articles.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-none">
            <h4 className="text-lg font-bold text-white mb-4">Amazon Affiliate Impact: Make Your Story Compelling</h4>
            <p className="text-white/70 mb-4">
              Amazon will only give you credit when readers click your Amazon link to make a purchase. To maximize earnings:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>Share your personal perspective and experiences.</li>
              <li>Reference specific passages or quotes from the books.</li>
              <li>Tell a story: why the book mattered and how it influenced your thinking.</li>
              <li>Connect themes across the four books in your article.</li>
              <li>Include natural, integrated calls-to-action with your affiliate links.</li>
              <li>Select books that are listed on Amazon. If you want to discuss a book not available on Amazon, you may include it in the discussion, but your article must have four books with Amazon links.</li>
            </ul>
          </div>
        </div>

        {/* 2. Submission Requirements */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-white/20 pl-4">2. Submission Requirements</h3>
          
          <div className="bg-white/5 border border-white/10 p-6 mb-6 rounded-none">
            <p className="text-white/90 font-medium mb-4">
              Each article should feature <span className="text-yellow-400">four books</span> with unique SiteStripe links.
            </p>
            
            <h4 className="text-lg font-bold text-white mb-2">Why four books?</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80 mb-6">
              <li>Validates your insights across multiple perspectives.</li>
              <li>Encourages cross-genre and interdisciplinary thinking.</li>
              <li>Helps synthesize deeper understanding and actionable lessons.</li>
              <li>Builds credibility with Google’s E‑E‑A‑T standards by demonstrating thoughtful analysis.</li>
            </ul>

            <p className="text-white/80">
              Articles should include direct quotes or passages from the books to illustrate key points.
            </p>
          </div>
        </div>

        {/* 3. Writing Standards */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-white/20 pl-4">3. Writing Standards: Google E‑E‑A‑T</h3>
          
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <div className="bg-white/5 border border-white/10 p-4 rounded-none">
              <h4 className="font-bold text-green-400 mb-1">Experience</h4>
              <p className="text-white/70 text-sm">Share personal connection and lessons learned.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-none">
              <h4 className="font-bold text-blue-400 mb-1">Expertise</h4>
              <p className="text-white/70 text-sm">Provide accurate analysis and thoughtful commentary.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-none">
              <h4 className="font-bold text-purple-400 mb-1">Authoritativeness</h4>
              <p className="text-white/70 text-sm">Contribute consistently and maintain high-quality work.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-none">
              <h4 className="font-bold text-yellow-400 mb-1">Trustworthiness</h4>
              <p className="text-white/70 text-sm">Be clear, honest, and transparent in your writing.</p>
            </div>
          </div>

          <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4">
            <h5 className="font-bold text-white mb-2">Why this matters</h5>
            <p className="text-white/70 text-sm">
              Meeting E‑E‑A‑T standards improves search rankings, builds reader trust, and increases engagement and affiliate conversions.
            </p>
          </div>
        </div>

        {/* 4. HITL Review */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-white/20 pl-4">4. Human-in-the-Loop (HITL) Review</h3>
          
          <div className="bg-white/5 border border-white/10 p-6 mb-6 rounded-none">
            <p className="text-white/80 mb-4">AI can draft content, but human review is essential:</p>
            <ul className="list-disc list-inside space-y-2 text-white/80 mb-6">
              <li>Fact-check AI-generated text.</li>
              <li>Refine tone, style, and voice to reflect your perspective.</li>
              <li>Add personal anecdotes, reflections, and direct quotes.</li>
              <li>Verify affiliate links and ensure they are accurate and functional.</li>
            </ul>
          </div>

          <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4">
            <h5 className="font-bold text-white mb-2">Why this matters</h5>
            <p className="text-white/70 text-sm">
              HITL ensures authenticity, originality, and credibility, helping your article outperform generic AI content and meet E‑E‑A‑T standards.
            </p>
          </div>
        </div>

        {/* 5. AI-Assisted Writing Workflow */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-white/20 pl-4">5. AI-Assisted Writing Workflow</h3>
          
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 p-5 rounded-none">
              <h4 className="font-bold text-white mb-2">Step 1: Research & Planning (Human)</h4>
              <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                <li>Gather background info and key themes of your four books.</li>
                <li>Identify direct quotes or passages for use in your article.</li>
                <li>Decide on personal experiences or insights to include.</li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-none">
              <h4 className="font-bold text-white mb-2">Step 2: Define Tone, Perspective, & Audience</h4>
              <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                <li>Decide how your voice should come across: reflective, conversational, analytical, etc.</li>
                <li>Use the pre-crafted AI prompt as a starting point.</li>
                <li>Iteratively refine instructions, working with AI to rewrite sections to match your style.</li>
                <li className="italic text-white/50 mt-2">Example: "This paragraph is too wordy—simplify it." or "Make this reflection sound more like I would say it."</li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-none">
              <h4 className="font-bold text-white mb-2">Step 3: Generate Outline & Draft (AI-Assisted)</h4>
              <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                <li>Use AI to create structure, headings, and first draft paragraphs.</li>
                <li>Focus on flow, clarity, and organization.</li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-none">
              <h4 className="font-bold text-white mb-2">Step 4: Human Editing & Personalization</h4>
              <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                <li>Revise AI text to reflect exactly how you would say it, word-for-word.</li>
                <li>Integrate personal stories, reflections, and quotes.</li>
                <li>Challenge AI to improve phrasing, expand insights, or deepen analysis.</li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-none">
              <h4 className="font-bold text-white mb-2">Step 5: SEO & Readability Optimization</h4>
              <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                <li>Add clear headings and subheadings.</li>
                <li>Use short, focused paragraphs.</li>
                <li>Include natural keywords and internal links.</li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-none">
              <h4 className="font-bold text-white mb-2">Step 6: Final HITL Review</h4>
              <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                <li>Ensure tone, flow, and engagement are polished.</li>
                <li>Confirm formatting, headings, and affiliate link accuracy.</li>
                <li>Verify E‑E‑A‑T and originality standards.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 6. Best Practices */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-white/20 pl-4">6. Best Practices for AI-Assisted Original Content</h3>
          
          <div className="bg-white/5 border border-white/10 p-6 mb-6 rounded-none">
            <ul className="list-disc list-inside space-y-2 text-white/80 mb-6">
              <li>Cross-reference all four books to show how themes relate.</li>
              <li>Inject personal voice: anecdotes, lessons, reflections.</li>
              <li>Use direct quotes/passages for credibility and depth.</li>
              <li>Iterate: revise drafts repeatedly until they express your ideas precisely.</li>
              <li>Challenge AI outputs: ask it to improve phrasing, clarify ideas, or add depth.</li>
              <li>Add actionable insights: show readers how to apply lessons.</li>
              <li>Sometimes, traditional research or reading methods are necessary—don't skip foundational work in favor of AI shortcuts.</li>
            </ul>
          </div>

          <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4">
            <h5 className="font-bold text-white mb-2">Why this matters</h5>
            <p className="text-white/70 text-sm">
              Original, human-refined content ranks better, attracts more readers, and increases affiliate revenue. Thoughtful posts build credibility and trust.
            </p>
          </div>
        </div>

        {/* 7. Final Submission Checklist */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-white/20 pl-4">7. Final Submission Checklist</h3>
          
          <div className="bg-green-900/10 border border-green-500/30 p-6 rounded-none">
            <ul className="space-y-3">
              {[
                "Four books with unique SiteStripe links included",
                "Article reviewed, fact-checked, and personalized",
                "Direct quotes/passages integrated",
                "Affiliate links verified",
                "Headings, SEO, and readability optimized",
                "Tone and voice consistent with personal style",
                "E‑E‑A‑T and HITL standards satisfied"
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-white/80">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 text-center">
              <Link 
                to="/submit-article" 
                className="inline-block px-8 py-3 bg-white text-black font-bold text-sm hover:bg-white/90 transition rounded-none uppercase tracking-wide"
              >
                Submit your completed article
              </Link>
            </div>
          </div>
        </div>

        {/* 8. FAQ */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-white/20 pl-4">8. FAQ</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Do I have to read the entire book?</h4>
              <p className="text-white/70 text-sm mb-2">
                No. You can reference key passages, chapters, or ideas that resonate with you. Sometimes a single passage provides enough insight for reflection.
              </p>
              <p className="text-white/70 text-sm mb-2">
                Yes, deeper reading helps. Reading a book fully—or multiple times—allows stronger analysis and greater authority.
              </p>
              <p className="text-white/70 text-sm">
                Audiobooks are fine. How you consume the material—print, digital, or audio—is up to you.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-bold text-white mb-2">How can I improve affiliate clicks?</h4>
              <ul className="list-disc list-inside text-white/70 text-sm">
                <li>Make your story compelling and relatable.</li>
                <li>Use personal anecdotes and reflections to engage readers.</li>
                <li>Reference direct quotes or passages for credibility.</li>
                <li>Include clear and naturally placed affiliate links.</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold text-white mb-2">Can I submit articles about books I’ve only partially read?</h4>
              <p className="text-white/70 text-sm">
                Yes, as long as you provide meaningful insights and references. Focus on depth and originality rather than completion.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-bold text-white mb-2">Do articles need to be PG or kid-friendly?</h4>
              <p className="text-white/70 text-sm">
                Content should be thoughtful and positive, free from profanity or hateful language. Original ideas are encouraged, but all submissions should promote reflection and constructive discussion.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Conclusion */}
        <div className="border-t border-white/10 pt-8 mt-12 text-center">
          <p className="text-white/60 italic max-w-2xl mx-auto">
            THE LOST ARCHIVES BOOK CLUB is designed to empower contributors to share their knowledge, talents, and insights in ways that reach an engaged audience beyond traditional avenues. By creating thoughtful, reflective, and well-crafted content, you have the opportunity to educate, inspire, and earn online while using your skills in unique and meaningful ways.
          </p>
        </div>
      </div>
    </>
  );
}


