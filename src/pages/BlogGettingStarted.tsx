import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function BlogGettingStarted() {
  return (
    <>
      <Helmet>
        <title>Contributor Getting Started Guide | THE LOST ARCHIVES</title>
        <meta name="description" content="A guide for contributors to share thoughtful reflections, engage readers, and earn as Amazon affiliates on THE LOST ARCHIVES." />
      </Helmet>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-6 tracking-wide uppercase">
            THE LOST ARCHIVES
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
            Welcome to <strong className="text-white">THE LOST ARCHIVES</strong>, a platform designed to help contributors share thoughtful reflections, engage readers, and earn as Amazon affiliates. This guide walks you through getting set up, writing high-quality articles, and using AI effectively while maintaining your unique voice by implementing Human-In-The-Loop principles and meeting Google's standards for human expertise, experience, authority, and trust (E‑E‑A‑T).
          </p>
          <p className="text-white/80 leading-relaxed mb-6">
            THE LOST ARCHIVES exists to give contributors the opportunity to share knowledge, express personal insights, and connect with an audience they may not have reached through traditional channels. By contributing, you not only help educate and inspire others but also create a pathway to earn online by leveraging your expertise and experiences in meaningful ways.
          </p>
        </div>

        {/* Available Columns */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-white/20 pl-4">Available Columns</h3>
          <p className="text-white/80 mb-6">
            THE LOST ARCHIVES features multiple columns, each with its own focus and requirements. Choose the column that best matches your content:
          </p>
          
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-2">Main Blog</h4>
              <p className="text-white/70 text-sm mb-2">
                Pure writing and personal expression. Essays, reflections, stories, and philosophical or cultural commentary.
              </p>
              <p className="text-white/50 text-xs">
                <strong>Structure:</strong> 6–8 paragraphs • <strong>Affiliates:</strong> None
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-2">BookClub</h4>
              <p className="text-white/70 text-sm mb-2">
                Curated reading experiences. Share insights on books and how they've shaped your thinking.
              </p>
              <p className="text-white/50 text-xs">
                <strong>Structure:</strong> 4–8 books per post • <strong>Affiliates:</strong> Amazon books required
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-2">GearHeads</h4>
              <p className="text-white/70 text-sm mb-2">
                Explore tools, setups, kits, and combinations that create experiences. Share how items combine for workflows or hobbies.
              </p>
              <p className="text-white/50 text-xs">
                <strong>Structure:</strong> Up to 8 products • <strong>Affiliates:</strong> Amazon products required
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-2">Edge of the Borderlands</h4>
              <p className="text-white/70 text-sm mb-2">
                Travel experiences and practical adventure insights. Stories of journeys, what you brought, and lessons learned.
              </p>
              <p className="text-white/50 text-xs">
                <strong>Structure:</strong> 4–8 items per post • <strong>Affiliates:</strong> Amazon/travel/Bitcoin required
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-2">MAD SCIENTISTS</h4>
              <p className="text-white/70 text-sm mb-2">
                Deep dives into scientific concepts and discoveries. Physics, quantum theory, biology, emerging sciences.
              </p>
              <p className="text-white/50 text-xs">
                <strong>Structure:</strong> 6–8 paragraphs (flexible) • <strong>Affiliates:</strong> None
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-2">NEW THEORY</h4>
              <p className="text-white/70 text-sm mb-2">
                Practical application of technology and systems thinking in everyday life. Nutrition, household systems, habits, DIY experiments.
              </p>
              <p className="text-white/50 text-xs">
                <strong>Structure:</strong> 4–8 items or 6–8 paragraphs • <strong>Affiliates:</strong> Optional (gear/tools)
              </p>
            </div>
          </div>
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
                <strong className="text-white">Create your contributor account</strong> on THE LOST ARCHIVES.
              </li>
              <li>
                <strong className="text-white">Choose a username</strong>; this generates your custom contributor URL (subdomain).
              </li>
              <li className="bg-yellow-900/20 border-l-4 border-yellow-500 pl-4 py-2">
                <strong className="text-white">Amazon Affiliate Setup (Required for some columns):</strong>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-sm">
                  <li>If submitting to <strong>BookClub</strong>, <strong>GearHeads</strong>, or <strong>Edge of the Borderlands</strong>, you must sign up for the Amazon Affiliate program.</li>
                  <li>If submitting to <strong>Main Blog</strong> or <strong>MAD SCIENTISTS</strong>, Amazon affiliates are not required.</li>
                  <li>If submitting to <strong>NEW THEORY</strong>, Amazon affiliates are optional.</li>
                </ul>
                <a href="https://affiliate-program.amazon.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline ml-4 text-sm block mt-2">
                  Sign up: Amazon Associates
                </a>
              </li>
              <li>
                During Amazon setup, <strong className="text-white">paste your custom contributor URL</strong> (your subdomain) to tie your affiliate links to your account.
              </li>
              <li>
                <strong className="text-white">Obtain your Amazon Storefront ID</strong> from your Amazon Associates account.
              </li>
              <li>
                Return to our platform and <strong className="text-white">paste your Storefront ID</strong> to finalize setup (only required for columns that use affiliates).
              </li>
            </ol>
          </div>

          <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6">
            <h5 className="font-bold text-white mb-2">Why this matters</h5>
            <p className="text-white/70 text-sm">
              Correct setup ensures all affiliate links are tracked, so you earn commissions when readers purchase through your articles. Note: Only columns that require affiliate links (BookClub, GearHeads, Edge of the Borderlands) need Amazon setup. Main Blog and MAD SCIENTISTS don't require affiliate accounts.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-none">
            <h4 className="text-lg font-bold text-white mb-4">Amazon Affiliate Impact: Make Your Story Compelling</h4>
            <p className="text-white/70 mb-4">
              <strong className="text-white">For columns that use affiliate links:</strong> Amazon will only give you credit when readers click your Amazon link to make a purchase. To maximize earnings:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>Share your personal perspective and experiences.</li>
              <li>Reference specific passages, quotes, or product details.</li>
              <li>Tell a story: why the item/book mattered and how it influenced your thinking or workflow.</li>
              <li>Connect themes across multiple items in your article.</li>
              <li>Include natural, integrated calls-to-action with your affiliate links.</li>
              <li>Select items that are listed on Amazon (or relevant retailers for travel/adventure items).</li>
            </ul>
            <p className="text-white/60 text-sm mt-4 italic">
              Note: Main Blog and MAD SCIENTISTS don't use affiliate links—focus purely on ideas and knowledge.
            </p>
          </div>
        </div>

        {/* 2. Submission Requirements */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-white/20 pl-4">2. Submission Requirements by Column</h3>
          
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-3">BookClub</h4>
              <p className="text-white/90 font-medium mb-4">
                Each article should feature <span className="text-yellow-400">four books</span> with unique Amazon affiliate links.
              </p>
              <ul className="list-disc list-inside space-y-2 text-white/80 mb-4">
                <li>Validates your insights across multiple perspectives.</li>
                <li>Encourages cross-genre and interdisciplinary thinking.</li>
                <li>Helps synthesize deeper understanding and actionable lessons.</li>
                <li>Builds credibility with Google's E‑E‑A‑T standards by demonstrating thoughtful analysis.</li>
              </ul>
              <p className="text-white/80 text-sm">
                Articles should include direct quotes or passages from the books to illustrate key points.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-3">GearHeads</h4>
              <p className="text-white/90 font-medium mb-4">
                Share <span className="text-yellow-400">1–8 products</span> with Amazon affiliate links, focusing on how items combine to create experiences.
              </p>
              <p className="text-white/80 text-sm">
                Focus on workflows, hobbies, lifestyle practices, and how gear choices influence outcomes.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-3">Edge of the Borderlands</h4>
              <p className="text-white/90 font-medium mb-4">
                Share <span className="text-yellow-400">4–8 items</span> (gear, tools, services) with affiliate links, combined with travel narratives.
              </p>
              <p className="text-white/80 text-sm">
                Blend stories of journeys with practical recommendations for tools, services, or resources used during travel.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-3">Main Blog & MAD SCIENTISTS</h4>
              <p className="text-white/90 font-medium mb-4">
                Pure writing format: <span className="text-yellow-400">6–8 paragraphs</span> of thoughtful content.
              </p>
              <p className="text-white/80 text-sm">
                No affiliate links required. Focus on ideas, insights, and knowledge sharing.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-none">
              <h4 className="text-lg font-bold text-white mb-3">NEW THEORY</h4>
              <p className="text-white/90 font-medium mb-4">
                Flexible format: <span className="text-yellow-400">4–8 items</span> (collection) or <span className="text-yellow-400">6–8 paragraphs</span> (narrative).
              </p>
              <p className="text-white/80 text-sm">
                Affiliate links are optional. Focus on practical applications of science and systems thinking in daily life.
              </p>
            </div>
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
                "Column-appropriate structure (books/products/items or paragraphs)",
                "Article reviewed, fact-checked, and personalized",
                "Direct quotes/passages integrated (where applicable)",
                "Affiliate links verified (if required for your column)",
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
            <div className="mt-8 space-y-4">
              <p className="text-white/80 text-center font-medium mb-4">Ready to submit? Choose your column:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Link 
                  to="/submit/main" 
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white text-xs font-medium transition text-center"
                >
                  Main Blog
                </Link>
                <Link 
                  to="/submit/bookclub" 
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white text-xs font-medium transition text-center"
                >
                  BookClub
                </Link>
                <Link 
                  to="/submit/gearheads" 
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white text-xs font-medium transition text-center"
                >
                  GearHeads
                </Link>
                <Link 
                  to="/submit/borderlands" 
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white text-xs font-medium transition text-center"
                >
                  Borderlands
                </Link>
                <Link 
                  to="/submit/science" 
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white text-xs font-medium transition text-center"
                >
                  MAD SCIENTISTS
                </Link>
                <Link 
                  to="/submit/newtheory" 
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white text-xs font-medium transition text-center"
                >
                  NEW THEORY
                </Link>
              </div>
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
          <p className="text-white/60 italic max-w-lg mx-auto text-justify leading-relaxed">
            THE LOST ARCHIVES is designed to empower contributors to share their knowledge, talents, and insights in ways that reach an engaged audience beyond traditional avenues. By creating thoughtful, reflective, and well-crafted content, you have the opportunity to educate, inspire, and earn online while using your skills in unique and meaningful ways.
          </p>
        </div>
      </div>
    </>
  );
}


