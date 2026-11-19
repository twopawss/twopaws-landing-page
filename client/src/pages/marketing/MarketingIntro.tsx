import {
  ANDROID_STORE_URL,
  INSTAGRAM_URL,
  IOS_STORE_URL,
} from "@/lib/seo/constants";

export default function MarketingIntro() {
  return (
    <section className="clay-card p-7 sm:p-9">
      <h2 className="text-2xl font-semibold text-slate-900">
        TwoPaws - Pet care app in Egypt (Cairo)
      </h2>
      <p className="mt-3 text-slate-700">
        TwoPaws helps pet families across Egypt, starting in Cairo, with vet
        booking and an AI vet, a health tracker for every pet, a supplies shop
        with delivery, pet hotels, adoption, and lost &amp; found.
      </p>
      <p className="mt-4 text-slate-700">
        Download TwoPaws on the{" "}
        <a className="text-slate-900 underline" href={ANDROID_STORE_URL}>
          Google Play Store
        </a>
        {" "}or the{" "}
        <a className="text-slate-900 underline" href={IOS_STORE_URL}>
          Apple App Store
        </a>
        {"."}
      </p>
      <p className="mt-2 text-slate-700">
        Follow the official Instagram at{" "}
        <a className="text-slate-900 underline" href={INSTAGRAM_URL}>
          @twopaws.app
        </a>
        {"."}
      </p>
    </section>
  );
}
