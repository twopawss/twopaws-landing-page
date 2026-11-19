import Seo from "@/lib/seo/Seo";
import MarketingIntro from "./MarketingIntro";
import MarketingShell from "./MarketingShell";

const features = [
  {
    title: "AI Vet",
    description:
      "Ask everyday pet health questions in English or Arabic and get quick guidance tailored to your pet's profile. You can add a photo, and chats are saved so you can come back to them. The AI Vet is not a replacement for a real vet visit.",
  },
  {
    title: "Vet booking",
    description:
      "Find clinics near you, choose the services, your pet and a time slot, and pay at the clinic. You get a reminder 24 hours and 2 hours before the visit, and the vet's prescription and notes stay with the appointment.",
  },
  {
    title: "Health tracker and care reminders",
    description:
      "Keep vaccinations, medications and documents for every pet in one place, with reminders before each dose is due. Add daily care tasks like feeding and walks and tick them off from the home screen.",
  },
  {
    title: "Period tracker",
    description:
      "For unspayed female dogs and cats: log heat cycles, see predicted heat and fertile days, and get a reminder before the next one starts.",
  },
  {
    title: "PawShop",
    description:
      "Thousands of food, litter, treat, toy and care products from trusted Egyptian suppliers, delivered in Cairo and Giza. Compare sellers for the best price, track each delivery, and pay cash on delivery or by card.",
  },
  {
    title: "Pet hotels and daycare",
    description:
      "Book boarding or daycare when you travel, see room availability, and pay at the hotel.",
  },
  {
    title: "Adoption",
    description:
      "Browse pets looking for a new home, list your own pet for adoption, and chat with the owner before you decide.",
  },
  {
    title: "PawSwiper",
    description:
      "Looking for a mate for your pet? Swipe through pets, send a request, and chat with the owner when it is accepted.",
  },
  {
    title: "Lost & Found",
    description:
      "Report a lost pet with its last known location, browse missing pets on a map, and contact owners directly when you spot one.",
  },
  {
    title: "Paw Points rewards",
    description:
      "Earn points on shop orders and on vet, grooming and hotel receipts, then redeem them for vouchers. Invite friends to earn more.",
  },
];

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <Seo
        title="TwoPaws Features | Pet care in Egypt"
        description="Explore TwoPaws features for Egypt: AI vet, vet booking, health and period tracking, a pet supplies shop with delivery, pet hotels, adoption, PawSwiper and lost & found."
        canonicalUrl="/features/"
      />
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-slate-900">Features</h1>
        <p className="text-lg text-slate-700">
          Everything pet families in Egypt need to care for their pets with
          confidence.
        </p>
      </header>
      <MarketingIntro />
      <section className="space-y-5">
        {features.map((feature) => (
          <article key={feature.title} className="clay-card clay-rise p-6 sm:p-7">
            <h2 className="text-xl font-semibold text-slate-900">
              {feature.title}
            </h2>
            <p className="mt-2 text-slate-700">{feature.description}</p>
          </article>
        ))}
      </section>
    </MarketingShell>
  );
}