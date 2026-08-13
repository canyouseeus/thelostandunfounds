/**
 * Submissions Closed
 *
 * Article submissions are not open right now. Every /submit-article and
 * /submit/* route renders this instead of the submission form.
 *
 * The form used to write straight to the `blog_submissions` table through the
 * anon key, so hiding the form alone would not have closed anything. The public
 * INSERT policy on that table was dropped in the
 * `close_public_blog_submissions` migration, which is what actually closes it.
 * Reopening means restoring that policy as well as restoring these routes;
 * the migration carries the exact SQL to put it back.
 */

import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

export default function SubmissionsClosed() {
  return (
    <>
      <SEOHead
        title="Submissions Closed"
        description="Article submissions to THE LOST+UNFOUNDS are closed at this time."
        canonicalPath="/submit-article"
        noIndex={true}
      />
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full">
          <h1 className="text-3xl font-bold uppercase tracking-widest text-white mb-6">
            Submissions Closed
          </h1>
          <p className="text-white/70 text-left leading-relaxed mb-4">
            We are not taking article submissions right now.
          </p>
          <p className="text-white/70 text-left leading-relaxed mb-8">
            Nothing you sent before is lost. If submissions open back up, it will
            go out on the newsletter first.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/thelostarchives"
              className="px-6 py-3 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition text-center"
            >
              Read The Lost Archives
            </Link>
            <Link
              to="/"
              className="px-6 py-3 bg-white/10 rounded-none text-white font-semibold hover:bg-white/20 transition text-center"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
