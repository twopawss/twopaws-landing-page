import SiteFooter from "@/components/layout/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import SiteHeader from "@/components/layout/SiteHeader";
import facebook from "../../../attached_assets/facebook.svg";
import tiktok from "../../../attached_assets/tiktok.svg";
import Seo from "@/lib/seo/Seo";
import MarketingIntro from "@/pages/marketing/MarketingIntro";

export default function Privacy() {

  return (
    <div className="clay-bg min-h-screen flex flex-col">
      <Seo
        title="Privacy Policy | TwoPaws"
        description="Privacy policy for TwoPaws, the pet care app for Egypt with vet booking, health tracking, a supplies shop, pet hotels and adoption."
        canonicalUrl="/privacy/"
      />
      <SiteHeader />

      <main className="flex-grow px-4 pb-16 pt-10">
        <div className="w-full max-w-4xl mx-auto space-y-8">
          <MarketingIntro />
          <Card className="w-full">
            <CardContent className="prose prose-zinc lg:prose-lg max-w-none pt-6">
              <h1 className="text-3xl font-bold mb-2">TwoPaws Digital Solutions - Privacy Policy (EN)</h1>
              <p className="text-gray-500">Last updated: November 19, 2026</p>

              <h2 className="text-2xl font-bold mt-6">1) Who we are &amp; scope</h2>
              <p>
                This Privacy Policy explains how TwoPaws Digital Solutions LLC ("TwoPaws," "we," "us," "our") collects, uses, shares,
                and protects personal data when you use the TwoPaws mobile app, the twopaws.pet website, and our Services. Contact: <a href="mailto:info@twopaws.pet">info@twopaws.pet</a>
              </p>

              <h2 className="text-2xl font-bold mt-6">2) Data we collect</h2>
              <ul>
                <li><strong>Identity &amp; contact:</strong> name, email, phone number (verified by SMS code), and delivery addresses.</li>
                <li><strong>Sign-in:</strong> if you sign in with Google or Apple, the basic account details they share with us (such as your name and email).</li>
                <li><strong>Account &amp; usage:</strong> profile photo, preferences, device identifiers, push-notification token, app interactions, and diagnostics/crash logs.</li>
                <li><strong>Location:</strong> your device location, only when you allow it, to show nearby vets and hotels, the map, and distances. The map pin you set for a delivery address or a lost-pet report is saved with that address or report.</li>
                <li><strong>Pet &amp; health data:</strong> pet profiles and photos, vaccination, medication and other health records and documents you upload, heat-cycle logs, care tasks, and records added by a vet after an appointment you booked.</li>
                <li><strong>Content you create:</strong> adoption, PawSwiper and lost-pet listings, reviews and feedback, receipts you upload for points, event entries, and messages, photos and videos you send in chats.</li>
                <li><strong>AI Vet:</strong> the questions you ask, any photo you attach, and the pet profile details you choose to share (such as species, breed, age, sex and health notes). Chats are saved to your account so you can return to them.</li>
                <li><strong>Transactions:</strong> shop orders, vet and hotel bookings, event tickets, points and vouchers, payment status, and refunds.</li>
                <li><strong>Payments:</strong> card payments are processed on Paymob&apos;s secure checkout. TwoPaws does not receive or store full card numbers or CVV. If you choose to save a card, it is stored by Paymob, not by TwoPaws. We receive transaction metadata (e.g., success/failure, amount, reference).</li>
              </ul>

              <h2 className="text-2xl font-bold mt-6">3) How we collect data</h2>
              <p>Directly from you (forms, listings, uploads, messages, AI Vet chats); automatically (app and website events, device data, location when permitted, diagnostics/crash reports); from sign-in providers you choose (Google, Apple); from partners you engage (e.g., vets, hotels, suppliers); and from our payment processor (transaction confirmations). The website uses cookies and similar technologies, including the Meta Pixel, to measure visits and advertising.</p>

              <h2 className="text-2xl font-bold mt-6">4) Why we use data (purposes &amp; legal bases)</h2>
              <ul>
                <li>Provide the Services and your account (contract necessity).</li>
                <li>Process orders, bookings and payments, and arrange delivery (contract necessity).</li>
                <li>Send reminders and notifications you rely on, such as appointment, vaccination, medication, heat-cycle and order updates (contract necessity/legitimate interests).</li>
                <li>Answer your AI Vet questions with guidance tailored to your pet (contract necessity). AI guidance can be inaccurate and is not a substitute for a veterinarian.</li>
                <li>Safety, fraud prevention, and moderation, including automated checks that Lost &amp; Found photos show a pet and automated screening of chat messages for abuse or scams (legitimate interests; legal obligations).</li>
                <li>Support &amp; service communications (contract necessity/legitimate interests).</li>
                <li>Rewards: awarding Paw Points, verifying receipts, and referrals (contract necessity).</li>
                <li>Personalization &amp; analytics to improve features and performance (legitimate interests; consent where required).</li>
                <li>Marketing and advertising measurement (with your consent where required; you can opt out at any time).</li>
                <li>Legal/compliance (e.g., tax, accounting, responding to lawful requests).</li>
              </ul>
              <p>We do not use your data for incompatible purposes without your consent.</p>

              <h2 className="text-2xl font-bold mt-6">5) Sharing your data</h2>
              <p>We share personal data only as needed to provide and operate the Services:</p>
              <ul>
                <li><strong>Service providers (processors),</strong> under contracts that restrict their use to performing services for us:
                  <ul>
                    <li>Google Firebase and Google Cloud: hosting and database, sign-in and SMS verification, push notifications, analytics, crash reporting, and performance monitoring.</li>
                    <li>Google Gemini (through Firebase / Vertex AI): to answer AI Vet questions, including any pet details and photo you include.</li>
                    <li>Google Cloud Vision: to check that photos posted in Lost &amp; Found show a pet.</li>
                    <li>Google Maps: maps, location search, and directions.</li>
                    <li>Paymob: card payment processing.</li>
                    <li>Resend: transactional emails (e.g., order, booking, and account emails).</li>
                    <li>Meta: WhatsApp messaging for order handling and customer support; and, for advertising measurement, the Meta SDK in the app and the Meta Pixel on the website. In the app, your email and phone number are hashed before they are sent to Meta, and on iOS this happens only if you allow tracking.</li>
                  </ul>
                </li>
                <li><strong>Partners you choose to engage:</strong> only the details needed to fulfill your request. Suppliers receive your order and delivery name, phone and address; vets receive your booking, your pet&apos;s details and any notes you add; hotels receive your booking details and may contact you, including on WhatsApp, about your pet&apos;s stay.</li>
                <li><strong>Other users:</strong> adoption, PawSwiper and lost-pet listings you post are visible to other users with your profile name, and messages you send are shared with their recipients.</li>
                <li><strong>Legal/compliance:</strong> regulators, law enforcement, or to protect rights, safety, and compliance with law.</li>
              </ul>
              <p>We do not sell or rent your personal information.</p>

              <h2 className="text-2xl font-bold mt-6">6) Data retention</h2>
              <p>We keep personal data only as long as needed for the purposes above and to meet legal requirements. Examples:</p>
              <ul>
                <li><strong>Account data:</strong> while your account is active, then for a limited period for queries/disputes.</li>
                <li><strong>Transaction records:</strong> retained as required by tax/accounting laws.</li>
                <li><strong>Content (listings, chats, AI Vet chats):</strong> while visible to you/recipients or until you delete it; limited backups may persist briefly.</li>
                <li><strong>Payments:</strong> no card numbers or CVV are stored by TwoPaws.</li>
              </ul>

              <h2 className="text-2xl font-bold mt-6">7) International transfers</h2>
              <p>Your personal data may be transferred to, stored, and processed on secure servers outside Egypt. We use contractual and technical safeguards with reputable providers and will comply with applicable cross-border transfer requirements. Where required, we will implement additional measures or obtain approvals.</p>

              <h2 className="text-2xl font-bold mt-6">8) Your rights</h2>
              <p>Subject to applicable law, you can access, correct, delete, restrict or object to processing, and withdraw consent (e.g., for marketing). Use in-app settings where available or email <a href="mailto:info@twopaws.pet">info@twopaws.pet</a>. We may request proof of identity and will respond within applicable timelines.</p>

              <h2 className="text-2xl font-bold mt-6">9) Security</h2>
              <p>We use organizational and technical measures including encryption in transit and at rest, access controls, least-privilege, and monitoring. No system is 100% secure.</p>

              <h2 className="text-2xl font-bold mt-6">10) Children</h2>
              <p>The App is intended for adults (18+). If we learn we collected data from a minor without required guardian consent, we will delete it.</p>

              <h2 className="text-2xl font-bold mt-6">11) Deleting your account</h2>
              <p>You can ask us to delete your account and the personal data linked to it at <a href="/delete-account/">twopaws.pet/delete-account</a> (we email you a confirmation link) or by emailing <a href="mailto:info@twopaws.pet">info@twopaws.pet</a>. If orders, bookings or amounts are pending, deletion may be delayed until resolved. Some records may be retained where the law requires (e.g., fraud prevention, tax).</p>

              <h2 className="text-2xl font-bold mt-6">12) Changes to this Policy</h2>
              <p>We may update this Policy; we&apos;ll change the Last updated date above and, where required, provide in-app or email notice. If changes materially affect your rights, we will seek consent where required.</p>

              <h2 className="text-2xl font-bold mt-6">13) Contact</h2>
              <p>TwoPaws Digital Solutions LLC - Privacy<br />Plus Mall, South Investment, New Cairo, Cairo 11835, Egypt<br />Email: <a href="mailto:info@twopaws.pet">info@twopaws.pet</a></p>
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
