import SiteFooter from "@/components/layout/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import SiteHeader from "@/components/layout/SiteHeader";
import facebook from "../../../attached_assets/facebook.svg";
import tiktok from "../../../attached_assets/tiktok.svg";

import Seo from "@/lib/seo/Seo";
import MarketingIntro from "@/pages/marketing/MarketingIntro";

export default function Terms() {

  return (
    <div className="clay-bg min-h-screen flex flex-col">
      <Seo
        title="Terms & Conditions | TwoPaws"
        description="Terms and conditions for TwoPaws, the pet care app for Egypt with vets, clinics, community features, and delivery."
        canonicalUrl="/terms/"
      />
      <SiteHeader />

      <main className="flex-grow px-4 pb-16 pt-10">
        <div className="w-full max-w-4xl mx-auto space-y-8">
          <MarketingIntro />
          <Card className="w-full">
            <CardContent className="prose prose-zinc lg:prose-lg max-w-none pt-6">
              <h1 className="text-3xl font-bold mb-2">TwoPaws Digital Solutions - Terms &amp; Conditions</h1>
              <p className="text-gray-500">Last updated: August 23, 2025</p>

              <h2 className="text-2xl font-bold mt-6">1) Who we are</h2>
              <p>
                These Terms &amp; Conditions ("Terms") govern your use of the TwoPaws mobile application and related services (the
                "App" or "Services"), operated by TwoPaws Digital Solutions LLC ("TwoPaws," "we," "us," or "our"). By creating an
                account or using the Services, you agree to these Terms.
              </p>

              <h2 className="text-2xl font-bold mt-6">2) What TwoPaws is (and isnt)</h2>
              <p>
                TwoPaws is a platform that connects pet owners with third-party partners (e.g., vets, stores, shelters) and offers
                features such as marketplace listings, adoption listings, pet matchmaking (mating) tools, health tracking, and
                bookings. Unless we clearly state otherwise, we do not sell third-party goods or provide third-party services
                ourselves, and we do not provide veterinary or emergency care.
              </p>

              <h2 className="text-2xl font-bold mt-6">3) Eligibility</h2>
              <p>
                You must be at least 18 years old (or the age of majority in your jurisdiction). If you use the Services for a
                business, you confirm you have authority to bind that business.
              </p>

              <h2 className="text-2xl font-bold mt-6">4) Your account &amp; security</h2>
              <p>
                Keep your login credentials confidential; youre responsible for activity under your account. Provide accurate
                information and update it when it changes. Contact <a href="mailto:info@twopaws.pet">info@twopaws.pet</a> if you suspect
                unauthorized access.
              </p>

              <h2 className="text-2xl font-bold mt-6">5) Acceptable use</h2>
              <p>You agree not to:</p>
              <ul>
                <li>(a) break the law or violate animal-welfare rules;</li>
                <li>(b) post illegal, misleading, harmful, hateful, pornographic, or exploitative content;</li>
                <li>(c) misrepresent pet ownership, health status, pedigree, or adoption eligibility;</li>
                <li>(d) sell or traffic prohibited/endangered species, or falsify medical records;</li>
                <li>(e) harass users;</li>
                <li>(f) scrape, reverse engineer, bypass security, or interfere with the Services.</li>
              </ul>
              <h2 className="text-2xl font-bold mt-6">6) User content &amp; license</h2>
              <p>
                You retain ownership of content you upload (e.g., photos, listings, reviews, messages, pet profiles). You grant TwoPaws a
                worldwide, non-exclusive, royalty-free license to host, store, display, reproduce, modify, and distribute that content solely
                to operate, improve, and promote the Services. You warrant you have all necessary rights and permissions (including from
                people appearing in images), and that your content is accurate and lawful.
              </p>

              <h2 className="text-2xl font-bold mt-6">7) Listings &amp; categories</h2>
              <ul>
                <li>
                  <strong>Marketplace:</strong> Partners set prices, fulfill orders, and handle returns under their policies and applicable law. We may assist
                  with support but are not responsible for partner inventory, quality, safety, or warranties unless we expressly say otherwise. We may refuse
                  or cancel orders (e.g., suspected fraud, errors, unavailability).
                </li>
                <li>
                  <strong>Adoption:</strong> List only pets you legally own or are authorized to list (e.g., shelters). Provide accurate vaccination/health
                  information and fees.
                </li>
                <li>
                  <strong>Mating/Matchmaking:</strong> Follow applicable animal-welfare and local regulations. You are solely responsible for breeding decisions
                  and outcomes. We may remove content that appears irresponsible or harmful.
                </li>
              </ul>

              <h2 className="text-2xl font-bold mt-6">8) Orders, delivery &amp; cancellations</h2>
              <p>
                Delivery/collection windows are estimates and may vary (e.g., traffic, weather, partner readiness). If an order is wrong, missing, defective, or
                significantly delayed, contact support promptly so we can coordinate a resolution consistent with partner policies and the law.
              </p>

              <h2 className="text-2xl font-bold mt-6">9) Pricing, taxes &amp; fees</h2>
              <p>Prices, taxes, and any delivery/service fees are shown at checkout. Obvious pricing errors may be corrected; affected orders may be cancelled and refunded.</p>

              <h2 className="text-2xl font-bold mt-6">10) Payments</h2>
              <p>
                Checkout is completed through a secure, hosted payment flow provided by a third-party payment processor. We do not store full card numbers, CVV, or
                saved-card tokens. Refund timing depends on the relevant partner, payment processor, and issuing bank.
              </p>

              <h2 className="text-2xl font-bold mt-6">11) Service changes</h2>
              <p>We may add, modify, or remove features and may suspend the Services for maintenance, security, or legal reasons.</p>

              <h2 className="text-2xl font-bold mt-6">12) Intellectual property</h2>
              <p>The App, including software, design, and trademarks, is owned by TwoPaws or our licensors. You may not copy, modify, or create derivative works except as permitted by these Terms or applicable law.</p>

              <h2 className="text-2xl font-bold mt-6">13) Third-party services</h2>
              <p>The App may link to or integrate third-party services (e.g., maps, analytics, payments). Those services are governed by their own terms and privacy policies.</p>

              <h2 className="text-2xl font-bold mt-6">14) Warranties &amp; disclaimers</h2>
              <p>The Services are provided as is and as available. We do not warrant uninterrupted or error-free operation or the quality/safety/compliance of third-party goods/services.</p>

              <h2 className="text-2xl font-bold mt-6">15) Limitation of liability</h2>
              <p>To the maximum extent permitted by law, TwoPaws will not be liable for indirect, incidental, special, consequential, or punitive damages, lost profits, or data loss. Our aggregate liability for any claim is limited to the greater of EGP 2,000 or the amounts you paid to us for TwoPaws Services in the six (6) months before the event giving rise to the claim.</p>

              <h2 className="text-2xl font-bold mt-6">16) Indemnity</h2>
              <p>You agree to indemnify and hold TwoPaws harmless from claims arising out of your misuse of the Services, your content, your breach of these Terms, or your violation of law or third-party rights.</p>

              <h2 className="text-2xl font-bold mt-6">17) Suspension &amp; termination</h2>
              <p>We may suspend or terminate access for policy breaches or for security/legal reasons. You may delete your account at any time in the App or by emailing <a href="mailto:info@twopaws.pet">info@twopaws.pet</a>. If there are pending transactions or amounts due, account deletion may be delayed until resolution.</p>

              <h2 className="text-2xl font-bold mt-6">18) Changes to these Terms</h2>
              <p>We may update these Terms; well update the Last updated date above and, where required, provide in-app or email notice. Continued use after changes means you accept the updated Terms.</p>

              <h2 className="text-2xl font-bold mt-6">19) Contact</h2>
              <p>TwoPaws Digital Solutions LLC - Legal<br />Plus Mall, South Investment, New Cairo, Cairo 11835, Egypt<br />Email: <a href="mailto:info@twopaws.pet">info@twopaws.pet</a></p>
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />

    </div>
  );
}
