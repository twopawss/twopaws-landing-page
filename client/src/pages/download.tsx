import { useEffect, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FaApple } from "react-icons/fa";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import { trackMetaCustomEvent } from "@/lib/metaPixel";
import Seo from "@/lib/seo/Seo";
import { ANDROID_STORE_URL, BASE_URL, IOS_STORE_URL } from "@/lib/seo/constants";

/** Scanning this on a phone opens /download there, which forwards to the right store. */
const QR_TARGET = `${BASE_URL}/download/`;

const display = { fontFamily: '"Outfit", "Inter", system-ui, sans-serif' };

type Platform = "ios" | "android" | "web";

function detectPlatform(userAgent: string): Platform {
  const ua = userAgent.toLowerCase();
  const isAndroid = ua.includes("android");
  // iPad on iOS 13+ reports as Mac; check touch points to catch it
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) return "ios";
  if (isAndroid) return "android";
  return "web";
}

function GooglePlayMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M3.6 2.3 13.5 12 3.6 21.7a1.5 1.5 0 0 1-.6-1.2v-17c0-.5.2-.9.6-1.2Z" fill="#32BBFF" />
      <path d="m16.8 8.7-3.3 3.3-9.9-9.7c.5-.4 1.2-.4 1.9 0l11.3 6.4Z" fill="#00F076" />
      <path d="m16.8 15.3-11.3 6.4c-.7.4-1.4.4-1.9 0l9.9-9.7 3.3 3.3Z" fill="#FF3A44" />
      <path d="m20.4 13.3-3.6 2-3.3-3.3 3.3-3.3 3.6 2c1 .6 1 2 0 2.6Z" fill="#FFD500" />
    </svg>
  );
}

const storeButton =
  "inline-flex h-14 items-center gap-3 rounded-full border-[1.5px] border-[#3d1f3a] bg-white px-6 text-[17px] font-medium text-[#1f1320] transition-transform hover:-translate-y-0.5";

/**
 * Phones are sent straight to their app store. Everyone else (desktop, or a phone we cannot identify)
 * gets a real download page: a QR code to scan with their phone plus both store buttons.
 */
export default function DownloadPage() {
  const platform = useMemo<Platform>(() => {
    if (typeof window === "undefined") return "web";
    return detectPlatform(navigator.userAgent || navigator.vendor || (window as any).opera || "");
  }, []);

  const storeUrl = platform === "ios" ? IOS_STORE_URL : platform === "android" ? ANDROID_STORE_URL : null;

  useEffect(() => {
    trackMetaCustomEvent("AppDownloadRedirect", {
      lead_type: "app_download_redirect",
      platform,
      destination: storeUrl ?? "download_page",
      source_path: "/download",
    });
    if (storeUrl) window.location.replace(storeUrl);
  }, [platform, storeUrl]);

  return (
    <div className="clay-bg flex min-h-screen flex-col text-[#3d1f3a]">
      <Seo
        title="Download TwoPaws"
        description="Get the TwoPaws app on the App Store or Google Play."
        canonicalUrl="/download/"
        noIndex
      />
      <SiteHeader />

      <main className="mx-auto grid w-full max-w-[1100px] flex-1 items-center gap-12 px-6 py-14 sm:px-10 md:grid-cols-[1fr_auto] md:py-20">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-[#783F6A]">Free on iOS and Android</p>
          <h1 style={display} className="mt-4 text-[clamp(2.2rem,5vw,3.6rem)] font-normal leading-[1.05] tracking-[-0.02em]">
            {storeUrl ? "Opening the app store…" : "Get TwoPaws on your phone"}
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-[#3d1f3a]/75">
            {storeUrl
              ? "If nothing happens, tap your store below."
              : "Scan the code with your phone's camera, or pick your store. Vets, supplies, pet hotels and your pet's health records, all in one app."}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href={IOS_STORE_URL} target="_blank" rel="noreferrer" style={display} className={storeButton}>
              <FaApple className="h-6 w-6" />
              App Store
            </a>
            <a href={ANDROID_STORE_URL} target="_blank" rel="noreferrer" style={display} className={storeButton}>
              <GooglePlayMark className="h-6 w-6" />
              Google Play
            </a>
          </div>
        </div>

        {storeUrl ? null : (
          <div className="clay-card mx-auto flex flex-col items-center gap-4 p-7 md:mx-0">
            <QRCodeSVG
              value={QR_TARGET}
              size={200}
              fgColor="#3d1f3a"
              bgColor="transparent"
              level="M"
              title="QR code to download the TwoPaws app"
            />
            <p className="text-sm text-[#3d1f3a]/70">Scan with your phone camera</p>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
