/**
 * Photographer & Contributor Terms
 *
 * The terms every photographer agrees to by applying, joining the crew,
 * uploading to a gallery or shooting a job booked through the business.
 * They sit on top of the general Terms of Use (/terms), not in place of them.
 *
 * The date is fixed on purpose: a "last updated" that renders today's date
 * says nothing about when the terms actually changed. Bump it when they do.
 */

import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export const PHOTOGRAPHER_TERMS_UPDATED = 'October 29, 2026';
/**
 * Recorded on photographer applications. Uploads are gated server-side on
 * PHOTOGRAPHER_TERMS_VERSION in lib/api-handlers/_terms.ts — bump both together.
 */
export const PHOTOGRAPHER_TERMS_VERSION = '2026-10-29.3';

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-3">
        {n}. {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc list-outside ml-5 space-y-1">{children}</ul>;
}

const brand = <strong className="font-bold">THE LOST+UNFOUNDS</strong>;

export default function PhotographerTerms() {
  return (
    <div className="text-left">
      <h1 className="text-3xl font-bold text-white uppercase tracking-tight mb-4">
        PHOTOGRAPHER TERMS
      </h1>
      <p className="text-white/60 text-sm mb-8">Last updated: {PHOTOGRAPHER_TERMS_UPDATED}</p>

      <div className="space-y-8 text-white/80 text-left">
        <section className="bg-white/5 p-5" style={{ borderRadius: 0 }}>
          <p>
            These Photographer Terms (the "Terms") govern any photographer, crew member or contributor
            ("you") who applies to, uploads content to, sells through, or shoots work booked by {brand}{' '}
            ("we", "us", "the business"). They apply in addition to our general{' '}
            <Link to="/terms" className="underline hover:text-white">Terms of Use</Link> and{' '}
            <Link to="/privacy" className="underline hover:text-white">Privacy Policy</Link>. Where they
            conflict, these Terms control for photographer content and work. A signed written agreement
            between you and us for a specific job controls over both.
          </p>
          <p className="mt-3">
            By submitting a photographer application, accepting a job, creating or uploading to a gallery,
            or connecting a payout account, you agree to these Terms.
          </p>
        </section>

        <Section n={1} title="Who These Terms Cover">
          <List>
            <li>Crew photographers assigned to shoots booked through the business</li>
            <li>Photographers who own or upload to a gallery on the site, including live event galleries</li>
            <li>Anyone uploading photos, video or other media to the platform through a photographer upload link</li>
            <li>Applicants who submit a photographer application</li>
          </List>
        </Section>

        <Section n={2} title="Independent Contractor">
          <p>
            You work with us as an independent contractor, not an employee, partner or agent. You choose
            whether to accept a job, supply and maintain your own equipment, and are responsible for your
            own taxes, insurance, licenses and business expenses. Nothing in these Terms guarantees you any
            minimum amount of work. You may not sign contracts, make promises or quote prices on behalf of
            the business unless we authorize it in writing.
          </p>
        </Section>

        <Section n={3} title="Ownership of Your Photos">
          <p>
            Unless a written agreement for a specific job says otherwise, you keep the copyright in the
            original photos you take. These Terms do not transfer your copyright to us. What they do is give
            us the rights below so the business can run the galleries, deliver to clients, and sell and
            promote the work.
          </p>
        </Section>

        <Section n={4} title="License You Grant Us">
          <p>
            For everything you upload to the platform, and everything you shoot on a job booked through the
            business, you grant {brand} a worldwide, royalty-free, non-exclusive, transferable and
            sublicensable license to:
          </p>
          <List>
            <li>Host, store, copy, back up and display the content on our website, galleries, apps and systems</li>
            <li>Sell digital downloads and prints of the content through our galleries and shop</li>
            <li>Deliver the content to the clients who booked or purchased it</li>
            <li>
              Resize, crop, compress, color-correct, watermark, convert, caption and add metadata to the
              content, and generate previews and thumbnails
            </li>
            <li>
              Use the content to promote the business: on our website, social media, newsletter, ads,
              portfolio, proposals and printed materials
            </li>
            <li>Let our service providers (hosting, storage, payments, email) handle the content to do the above</li>
          </List>
          <p>
            This license is <strong className="font-bold text-white">perpetual and irrevocable</strong> for
            content shot on jobs booked through the business, for content already sold or delivered to a
            client, and for content already used in published marketing. For other uploads it lasts until
            the content is removed from the platform, plus a reasonable period for removal from backups and
            caches. Licenses we have already granted to buyers and clients survive in every case.
          </p>
          <p>
            We may credit you by name or handle when we publish your work, but we are not required to, and
            leaving off a credit is not a breach of these Terms.
          </p>
        </Section>

        <Section n={5} title="Our Right to Review, Edit, Hide and Delete">
          <p>
            The platform is ours to operate. To protect the business, our clients and the people in the
            photos, <strong className="font-bold text-white">we may, at any time, for any reason or no reason,
            and without notice:</strong>
          </p>
          <List>
            <li>Review, approve or reject any upload before or after it goes live</li>
            <li>Hide, unpublish, archive or permanently delete any photo, gallery, caption or other content</li>
            <li>Change a gallery's name, cover, pricing, visibility or access settings</li>
            <li>Close, merge or take down any gallery, including a live gallery during an event</li>
            <li>
              Remove content when a person in the photo, a venue, a client or a rights holder asks us to, or
              when we believe it violates these Terms or the law
            </li>
            <li>Suspend or remove your upload access, dashboard access or account</li>
          </List>
          <p>
            We are not required to explain a removal, to give you a copy before deleting, or to restore
            anything we removed. We have no obligation to host any content for any period of time.
          </p>
        </Section>

        <Section n={6} title="Keep Your Own Backups">
          <p>
            The platform is not an archive or a backup service. Keep your own originals. We are not liable
            for any content that is lost, corrupted, compressed, deleted or made unavailable, whether by us,
            by a service provider, or by a technical failure. For jobs booked through the business, you must
            keep your original files for at least 90 days after delivery so a client order can be re-sent.
          </p>
        </Section>

        <Section n={7} title="Prohibited Content and Adult Nudity">
          <p>
            Everything uploaded to {brand} can end up on a public website. You must never upload, send,
            link to or store on the platform any of the following:
          </p>
          <List>
            <li>
              <strong className="font-bold text-white">Any nudity or sexual content involving anyone under 18</strong>,
              or any image of a minor that is sexualized, exploitative or abusive — real, drawn, edited or AI-generated
            </li>
            <li>
              Pornography or sexually explicit content of anyone: sex acts, real or simulated, or images whose
              focus is on someone's genitals
            </li>
            <li>Nudity of any adult that does not meet every condition below</li>
            <li>
              Intimate or private images of anyone shared without their consent, images taken in a private
              place (restrooms, changing rooms, bedrooms), upskirt or hidden-camera images, or anything taken
              without the subject's knowledge where they would expect privacy
            </li>
            <li>Content showing or promoting abuse, assault, self-harm, animal cruelty, gore or graphic violence</li>
            <li>Harassment, bullying, threats, doxxing, or content meant to humiliate or target a person</li>
            <li>Hate speech or content attacking people for their race, ethnicity, religion, sex, gender, sexual orientation, disability or national origin</li>
            <li>Illegal drug use or sales, weapons used to threaten, or any other criminal activity</li>
            <li>Images of people who are visibly incapacitated, in a medical emergency, or being arrested, used to mock or embarrass them</li>
            <li>Deepfakes or edits that put a real person in a situation that did not happen</li>
            <li>Anything that infringes someone else's copyright, trademark, privacy or publicity rights</li>
            <li>Malware, spam, or files disguised as something they are not</li>
          </List>
          <p className="font-bold text-white">Adult nudity is allowed only when all of these are true:</p>
          <List>
            <li>Every nude person was 18 or older when photographed, and you checked a government-issued photo ID</li>
            <li>
              Every nude person knew they were being photographed and gave you signed, written consent to be
              photographed nude and to the photos being published, shared and sold through the platform
            </li>
            <li>It is artistic, editorial, fashion, body-art or event photography, and not sexually explicit</li>
            <li>It was taken somewhere the person chose to be photographed, never in a private place without their knowledge</li>
            <li>
              You mark it 18+ when you upload it (tick "These photos contain nudity"), or tell us so we can mark it.
              18+ photos are blurred on public galleries until the viewer confirms they are 18 or older
            </li>
          </List>
          <p>
            You must keep each person's ID check and signed consent for at least 7 years and send them to us within
            48 hours of our asking. If a person withdraws consent, tell us right away and we will take the photos down.
            We may place nude content behind an age or content warning, make it private, or remove it at any time —
            and anything where age or consent is in doubt is removed.
          </p>
          <p>
            <strong className="font-bold text-white">Candid photos are fine.</strong> Photographing people in
            public places and at events — without asking each person first — is normal event and street
            photography and is allowed. The consent rules above are about nudity, sexual content and private
            places, not about ordinary candid shots. Anyone who appears in a photo can still ask us to take it
            down (section 10).
          </p>
          <p>
            If you are not sure whether something is allowed, do not upload it. We decide what is
            allowed, and our decision is final.
          </p>
        </Section>

        <Section n={8} title="What Happens If You Break These Rules">
          <List>
            <li>The content is removed immediately, without notice</li>
            <li>Your upload access, galleries and account are suspended or permanently terminated</li>
            <li>Nude content is removed if you cannot produce the age and consent records for it when asked</li>
            <li>Any unpaid payouts connected to the content may be withheld</li>
            <li>
              Content that appears to involve the sexual exploitation of a minor is reported to the National
              Center for Missing &amp; Exploited Children (NCMEC) and law enforcement, as federal law requires
            </li>
            <li>
              Other illegal content is reported to law enforcement. We preserve the content, your account
              details, IP address, upload records and your agreement to these Terms, and we hand them over in
              response to valid legal process or where we believe someone is at risk
            </li>
            <li>We may take legal action to recover any loss, fine or cost the business suffers because of it</li>
          </List>
        </Section>

        <Section n={9} title="You Are Responsible for What You Upload">
          <p>
            You alone are legally responsible for the content you upload and for how you obtained it. {brand}{' '}
            hosts content that photographers provide; we do not create it, and we do not review every upload
            before it appears. Our right to remove content is not a promise that we will catch everything, and
            our failure to remove something does not make us responsible for it or mean we approve of it.
          </p>
          <p>Every time you upload or deliver content, you promise that:</p>
          <List>
            <li>You took it yourself, or you have every right needed to grant the license above</li>
            <li>None of it falls under section 7</li>
            <li>
              It was taken in public, at an event, or somewhere photography was allowed — candid shots are fine —
              never secretly in a place where people expect privacy, and any minor in it is fully clothed
            </li>
            <li>Every nude person meets all of the conditions in section 7, and you hold the records to prove it</li>
            <li>
              You have any releases or permissions the law or the venue requires for the people, property and
              locations in it, and you will give us a copy if we ask
            </li>
            <li>It has not been edited in a way that misrepresents a person or event</li>
          </List>
          <p>
            If a client, subject, venue, rights holder or authority makes a claim about your content, you will
            cooperate with us to resolve it, and section 16 applies.
          </p>
        </Section>

        <Section n={10} title="Removal Requests From People in Photos">
          <p>
            Anyone who appears in a photo on the site may ask us to take it down by contacting us. We decide
            whether to remove it. You agree not to republish elsewhere, in connection with the business, a
            photo we removed at a subject's request.
          </p>
        </Section>

        <Section n={11} title="Pay and Payouts">
          <p>
            We pay through Stripe Connect. To be paid you must complete Stripe's onboarding and keep your payout
            details current. Current rates are shown on your Photographer Dashboard:
          </p>
          <List>
            <li>
              <strong className="font-bold text-white">Shoots booked through the business:</strong> you receive
              80% of the job price; the business keeps 20% for booking it. Your share is released in proportion
              to what the client has actually paid — a deposit releases your share of the deposit.
            </li>
            <li>
              <strong className="font-bold text-white">Sales from your own gallery:</strong> you receive 97% of
              each sale, less your share of Stripe's processing fee; the business keeps 3%. Galleries owned by
              the business are not covered by this split.
            </li>
          </List>
          <p>Also:</p>
          <List>
            <li>Payouts are made only after the client's or buyer's payment has settled</li>
            <li>
              If a sale is refunded, reversed or charged back, the matching payout is reversed or deducted from
              your future payouts
            </li>
            <li>We may hold a payout while a dispute, chargeback, rights claim or suspected fraud is investigated</li>
            <li>
              You are responsible for your own taxes. You agree to provide any tax information we or Stripe
              request, and we may report payments to tax authorities as the law requires
            </li>
            <li>
              We may change rates for future work with notice on your dashboard or by email. A job you already
              accepted keeps the rate it was accepted at
            </li>
          </List>
        </Section>

        <Section n={12} title="Working Jobs Booked Through Us">
          <List>
            <li>Show up on time, prepared, and represent the business professionally</li>
            <li>Follow the client's brief, the venue's rules and any reasonable instructions from us</li>
            <li>Tell us as early as possible if you cannot make a shoot you accepted</li>
            <li>
              Deliver the files by the deadline we give you, uploaded to the gallery or location we specify
            </li>
            <li>
              Keep client names, contact details, pricing and event information confidential, and use them only
              to do the job
            </li>
          </List>
        </Section>

        <Section n={13} title="Clients We Bring You">
          <p>
            Clients who come to you through the business are the business's clients. For 12 months after the
            last job you shot for a client through us, you agree not to solicit or accept paid photography work
            from that client directly, or through anyone else, without our written permission. If a client
            approaches you directly, refer them to us — we can book it through{' '}
            <strong className="font-bold">Direct Booking</strong> so you are still paid your share.
          </p>
        </Section>

        <Section n={14} title="Your Portfolio and Our Brand">
          <p>
            You may show photos you took on our jobs in your personal portfolio and social media, unless the
            client's agreement or our instructions say otherwise, and as long as you do not use a photo we
            removed at a subject's request. You may not use the {brand} name, logo or branding in a way that
            suggests you are the business or speak for it, and you may not sell images from jobs booked
            through us to anyone other than through our galleries without our written permission.
          </p>
        </Section>

        <Section n={15} title="Ending the Relationship">
          <p>
            Either of us may stop working together at any time. When that happens we may remove your access,
            and we may unpublish or delete your galleries and uploads. We will still pay you any share you
            earned on payments that settled before the end date, subject to sections 8 and 11. Sections 3
            through 11 and 13 through 18 continue after the relationship ends, as does every license already granted to us,
            our clients and our buyers.
          </p>
        </Section>

        <Section n={16} title="Responsibility and Liability">
          <p>
            You agree to defend, indemnify and hold harmless {brand}, its owner and its contractors from any
            claim, demand, investigation, fine, loss or expense (including reasonable legal fees) arising from
            content you uploaded, your conduct at a shoot, or your breach of these Terms. This includes claims
            by people who appear in your photos, by venues and clients, and by any government authority.
          </p>
          <p>
            We are not responsible for content uploaded by photographers or other users, and we are not
            liable for any harm it causes. Any claim about such content is between the person making it and
            the person who uploaded it.
          </p>
          <p>
            The platform is provided "as is". To the fullest extent the law allows, our total liability to you
            under these Terms is limited to the payouts you earned through us in the 3 months before the claim,
            and we are not liable for lost content, lost profits or indirect damages.
          </p>
        </Section>

        <Section n={17} title="Changes to These Terms">
          <p>
            We may update these Terms. When we do, we will change the date at the top of this page, and for
            material changes we will also let you know by email or on your dashboard. Continuing to upload,
            accept jobs or receive payouts after a change means you accept the updated Terms.
          </p>
        </Section>

        <Section n={18} title="Governing Law">
          <p>
            These Terms are governed by the laws of the State of Texas, without regard to its conflict-of-law
            rules. Any dispute will be brought in the state or federal courts located in Travis County, Texas.
            If any part of these Terms is found unenforceable, the rest stays in effect.
          </p>
        </Section>

        <Section n={19} title="Contact">
          <p>
            Questions about these Terms, removal requests and rights claims go to{' '}
            <a href="mailto:media@thelostandunfounds.com" className="underline hover:text-white">
              media@thelostandunfounds.com
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
