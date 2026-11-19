import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentReference,
} from "firebase/firestore";
import { PawPrint, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/firebase";

type PetEntry = {
  entryId: string;
  status: string;
  competitionTitle: string;
  eventSlug: string;
  voteCount: number;
  finalRank: number | null;
};

type Pet = {
  id: string;
  name: string;
  breed: string;
  species: string;
  photoUrl: string;
  entries: PetEntry[];
};

const firstPhoto = (value: unknown) =>
  Array.isArray(value) ? String(value[0] || "") : typeof value === "string" ? value : "";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Awaiting approval", className: "bg-amber-100 text-amber-900" },
  APPROVED: { label: "Approved · in the running", className: "bg-emerald-100 text-emerald-900" },
  REJECTED: { label: "Not approved", className: "bg-slate-200 text-slate-700" },
  DISQUALIFIED: { label: "Disqualified", className: "bg-red-100 text-red-900" },
};

/**
 * The signed-in user's pets (pets where userId == users/{uid}) with any Pet of the Event
 * entries they have, resolved to the competition title and event slug for the leaderboard link.
 */
export default function MyPets({ uid }: { uid: string }) {
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const userRef = doc(db, "users", uid);
      const [petSnap, entrySnap] = await Promise.all([
        getDocs(query(collection(db, "pets"), where("userId", "==", userRef))),
        getDocs(query(collection(db, "competitionEntries"), where("ownerUid", "==", uid))),
      ]);

      // Resolve each distinct competition and event once.
      const refCache = new Map<string, Promise<Record<string, unknown>>>();
      const resolve = (ref: DocumentReference | undefined) => {
        if (!ref) return Promise.resolve({} as Record<string, unknown>);
        const cached = refCache.get(ref.path);
        if (cached) return cached;
        const promise = getDoc(ref).then((snap) => (snap.exists() ? (snap.data() as Record<string, unknown>) : {}));
        refCache.set(ref.path, promise);
        return promise;
      };

      const entriesByPet = new Map<string, PetEntry[]>();
      await Promise.all(
        entrySnap.docs.map(async (entryDoc) => {
          const petRef = entryDoc.get("petRef") as DocumentReference | undefined;
          if (!petRef) return;
          const [competition, event] = await Promise.all([
            resolve(entryDoc.get("competitionRef") as DocumentReference | undefined),
            resolve(entryDoc.get("eventRef") as DocumentReference | undefined),
          ]);
          const eventRef = entryDoc.get("eventRef") as DocumentReference | undefined;
          const entry: PetEntry = {
            entryId: entryDoc.id,
            status: String(entryDoc.get("status") || "PENDING"),
            competitionTitle: String(competition.title || "Pet of the Event"),
            eventSlug: String(event.slug || eventRef?.id || ""),
            voteCount: Number(entryDoc.get("voteCount") || 0),
            finalRank: typeof entryDoc.get("finalRank") === "number" ? (entryDoc.get("finalRank") as number) : null,
          };
          entriesByPet.set(petRef.id, [...(entriesByPet.get(petRef.id) || []), entry]);
        })
      );

      return petSnap.docs.map((petDoc) => ({
        id: petDoc.id,
        name: String(petDoc.get("name") || "Unnamed pet"),
        breed: String(petDoc.get("breed") || ""),
        species: String(petDoc.get("species") || ""),
        photoUrl: firstPhoto(petDoc.get("photo_url")),
        entries: entriesByPet.get(petDoc.id) || [],
      }));
    };
    load()
      .then((result) => {
        if (!cancelled) setPets(result);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason));
          setPets([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">My pets</h2>
          <p className="text-sm text-slate-500">Your pets and their Pet of the Event entries.</p>
        </div>
        <Button asChild variant="outline" className="border-slate-200">
          <Link to="/events"><Trophy className="mr-2 h-4 w-4" />Current event</Link>
        </Button>
      </div>

      {pets === null && <p className="text-sm text-slate-500">Loading pets...</p>}
      {error && <p className="text-sm text-red-700">Could not load pets: {error}</p>}
      {pets && pets.length === 0 && !error && (
        <Card className="border-slate-100">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">No pets yet</p>
              <p className="text-sm text-slate-500">Add your pet in the TwoPaws app, or add one while entering the current competition.</p>
            </div>
            <Button asChild className="bg-brand-green-dark text-white">
              <Link to="/events">Enter a competition</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {pets && pets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {pets.map((pet) => (
            <Card key={pet.id} className="border-slate-100">
              <CardContent className="flex gap-4 p-4">
                {pet.photoUrl ? (
                  <img src={pet.photoUrl} alt={pet.name} className="h-20 w-20 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <PawPrint className="h-8 w-8 text-brand-olive" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-slate-900">{pet.name}</p>
                  <p className="text-sm text-slate-500">{[pet.species, pet.breed].filter(Boolean).join(" · ") || "Pet"}</p>
                  {pet.entries.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {pet.entries.map((entry) => {
                        const badge = STATUS_LABEL[entry.status] || { label: entry.status, className: "bg-slate-200 text-slate-700" };
                        return (
                          <li key={entry.entryId} className="text-sm">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                            <span className="ml-2 text-slate-700">{entry.competitionTitle}</span>
                            {entry.status === "APPROVED" && (
                              <span className="ml-1 text-slate-500">
                                · {entry.finalRank ? `finished #${entry.finalRank}` : `${entry.voteCount} vote${entry.voteCount === 1 ? "" : "s"}`}
                              </span>
                            )}
                            {entry.eventSlug && (
                              <Link to={`/events/${entry.eventSlug}/leaderboard`} className="ml-2 font-semibold text-brand-green-dark hover:underline">Leaderboard</Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Not entered in a competition.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
