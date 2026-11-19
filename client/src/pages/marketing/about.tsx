import Seo from "@/lib/seo/Seo";
import MarketingIntro from "./MarketingIntro";
import MarketingShell from "./MarketingShell";

export default function AboutPage() {
  return (
    <MarketingShell>
      <Seo
        title="About TwoPaws | Pet care app in Egypt"
        description="Learn how TwoPaws supports pet families in Egypt with vet booking, health tracking, supplies delivery, pet hotels and adoption."
        canonicalUrl="/about/"
      />
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-slate-900">About TwoPaws</h1>
        <p className="text-lg text-slate-700">
          TwoPaws is built in Egypt for pet parents who want reliable care,
          a caring community, and fast access to supplies.
        </p>
      </header>
      <MarketingIntro />
      <section className="space-y-4 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Why we exist</h2>
        <p>
          We created TwoPaws to make pet care in Cairo and across Egypt easier to
          navigate. Instead of juggling multiple apps, phone calls, and social
          groups, pet families can manage everything in one place.
        </p>
        <p>
          TwoPaws brings together vet booking and an AI vet for quick answers,
          health and care tracking for every pet, a growing marketplace for pet
          supplies, pet hotels, and community tools for adoption, finding a match
          and reuniting lost pets with their families.
        </p>
      </section>
    </MarketingShell>
  );
}