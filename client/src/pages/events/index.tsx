import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { PawPrint, RefreshCw } from "lucide-react";
import EventShell from "@/features/events/EventShell";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import Seo from "@/lib/seo/Seo";

const toMillis = (value: unknown) =>
  value && typeof (value as { toMillis?: () => number }).toMillis === "function"
    ? (value as { toMillis: () => number }).toMillis()
    : 0;

/**
 * /events: sends the visitor to the newest PUBLISHED event's public page. The header's Events
 * link points here so it never has to hard-code an event slug. `events` is public-read, and a
 * single equality filter needs no composite index; the sort happens client-side.
 */
export default function EventsIndexPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "none" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    getDocs(query(collection(db, "events"), where("status", "==", "PUBLISHED")))
      .then((snap) => {
        if (cancelled) return;
        const newest = snap.docs
          .map((doc) => ({ id: doc.id, slug: doc.get("slug") as string | undefined, startsAt: toMillis(doc.get("startsAt")) }))
          .sort((a, b) => b.startsAt - a.startsAt)[0];
        if (!newest) {
          setState("none");
          return;
        }
        navigate(`/events/${newest.slug || newest.id}`, { replace: true });
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <EventShell>
      <Seo title="Events | TwoPaws" description="TwoPaws community events and Pet of the Event competitions." canonicalUrl="/events" noIndex />
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        {state === "loading" ? (
          <>
            <RefreshCw className="h-10 w-10 animate-spin text-brand-dark" />
            <p className="font-bold text-brand-dark">Finding the next event…</p>
          </>
        ) : (
          <>
            <PawPrint className="h-14 w-14 text-brand-olive" />
            <h1 className="text-3xl text-brand-dark">
              {state === "none" ? "No upcoming events" : "Events are unavailable right now"}
            </h1>
            <p className="max-w-md text-slate-600">
              {state === "none"
                ? "Follow TwoPaws on Instagram to hear about the next one first."
                : "Please try again in a moment."}
            </p>
            <Button asChild className="bg-brand-dark text-white">
              <Link to="/">Back to home</Link>
            </Button>
          </>
        )}
      </div>
    </EventShell>
  );
}
