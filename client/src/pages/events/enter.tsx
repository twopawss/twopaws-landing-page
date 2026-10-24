import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Timestamp,
  arrayUnion,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Check, ImagePlus, PawPrint, RefreshCw, Trophy } from "lucide-react";
import EventShell from "@/features/events/EventShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import Seo from "@/lib/seo/Seo";
import { getPublicEvent, submitCompetitionEntry } from "@/features/events/api";
import { errorMessage, eventTime } from "@/features/events/format";
import type { PublicEventResponse } from "@/features/events/types";

type OwnedPet = { id: string; name: string; breed: string; species: string; photoUrl: string };
type PetType = { id: string; name: string };
type Breed = { id: string; name: string; size: string };

const GENDERS = ["Male", "Female"];
const todayIso = () => new Date().toISOString().slice(0, 10);
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_PHOTO_EDGE = 1600;

// Mirrors isCompetitionEntryOpen in functions/src/events/shared.ts. The callable is the
// authority; this only decides what the page shows.
const isEntryOpen = (competition: NonNullable<PublicEventResponse["competition"]>, now: number) => {
  if (!["ENTRIES_OPEN", "VOTING_OPEN"].includes(competition.status)) return false;
  const opens = competition.entriesOpenAt ? new Date(competition.entriesOpenAt).getTime() : 0;
  const closes = competition.entriesCloseAt ? new Date(competition.entriesCloseAt).getTime() : 0;
  return (!opens || now >= opens) && (!closes || now < closes);
};

/** Downscale large phone photos before upload so venue Wi-Fi does not choke on 8 MB originals. */
const shrinkImage = async (file: File): Promise<Blob> => {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.86)
  );
};

const firstPhoto = (value: unknown) =>
  Array.isArray(value) ? String(value[0] || "") : typeof value === "string" ? value : "";

export default function EventEntryPage() {
  const { eventSlug = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<PublicEventResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [ownedPets, setOwnedPets] = useState<OwnedPet[] | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | "new">("new");
  const [petName, setPetName] = useState("");
  const [petTypes, setPetTypes] = useState<PetType[] | null>(null);
  const [typeId, setTypeId] = useState("dog");
  const [breeds, setBreeds] = useState<Breed[] | null>(null);
  const [breedId, setBreedId] = useState("");
  const [gender, setGender] = useState("");
  const [birthday, setBirthday] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [about, setAbout] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: string; existing: boolean; petName: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicEvent(eventSlug)
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((reason) => {
        if (!cancelled) setLoadError(errorMessage(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [eventSlug]);

  useEffect(() => {
    if (!user) {
      setOwnedPets(null);
      return;
    }
    let cancelled = false;
    getDocs(query(collection(db, "pets"), where("userId", "==", doc(db, "users", user.uid))))
      .then((snap) => {
        if (cancelled) return;
        const pets = snap.docs.map((petDoc) => ({
          id: petDoc.id,
          name: String(petDoc.get("name") || "Unnamed pet"),
          breed: String(petDoc.get("breed") || ""),
          species: String(petDoc.get("species") || ""),
          photoUrl: firstPhoto(petDoc.get("photo_url")),
        }));
        setOwnedPets(pets);
        if (pets.length) setSelectedPetId(pets[0].id);
      })
      .catch(() => {
        if (!cancelled) setOwnedPets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Species and breeds come from petTypes/{type} and petTypes/{type}/petBreed, the same
  // catalogue the app's Add Pet page reads, so web-created pets carry the same values.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDocs(query(collection(db, "petTypes"), orderBy("name")))
      .then((snap) => {
        if (cancelled) return;
        const types = snap.docs.map((typeDoc) => ({ id: typeDoc.id, name: String(typeDoc.get("name") || typeDoc.id) }));
        setPetTypes(types);
        setTypeId((current) => (types.some((type) => type.id === current) ? current : types[0]?.id || ""));
      })
      .catch(() => {
        if (!cancelled) setPetTypes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !typeId) return;
    let cancelled = false;
    setBreeds(null);
    setBreedId("");
    getDocs(query(collection(db, "petTypes", typeId, "petBreed"), orderBy("name")))
      .then((snap) => {
        if (cancelled) return;
        setBreeds(
          snap.docs.map((breedDoc) => ({
            id: breedDoc.id,
            name: String(breedDoc.get("name") || ""),
            size: String(breedDoc.get("size") || "").trim(),
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setBreeds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, typeId]);

  const photoPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : ""), [photo]);
  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const competition = data?.competition || null;
  const entryOpen = competition ? isEntryOpen(competition, Date.now()) : false;
  const enterPath = `/events/${eventSlug}/enter`;

  const onPhotoChange = (file: File | null) => {
    if (file && file.size > MAX_PHOTO_BYTES) {
      toast({ title: "Photo too large", description: "Please choose a photo under 10 MB.", variant: "destructive" });
      return;
    }
    setPhoto(file);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !competition) return;
    const creatingPet = selectedPetId === "new";
    const type = petTypes?.find((item) => item.id === typeId);
    const breed = breeds?.find((item) => item.id === breedId);
    if (creatingPet) {
      const missing = !petName.trim()
        ? "a pet name"
        : !type
          ? "a pet type"
          : !breed
            ? "a breed"
            : !GENDERS.includes(gender)
              ? "a gender"
              : !birthday
                ? "a birthday"
                : !photo
                  ? "a photo"
                  : "";
      if (missing) {
        toast({ title: "Almost there", description: `Please add ${missing}.`, variant: "destructive" });
        return;
      }
      if (new Date(birthday).getTime() > Date.now()) {
        toast({ title: "Check the birthday", description: "Birthday cannot be in the future.", variant: "destructive" });
        return;
      }
    }
    setSubmitting(true);
    try {
      let petId = selectedPetId;
      let enteredName = ownedPets?.find((pet) => pet.id === selectedPetId)?.name || petName.trim();
      if (creatingPet && photo) {
        const blob = await shrinkImage(photo);
        const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60) || "photo.jpg";
        const photoRef = ref(storage, `users/${user.uid}/competitionEntries/${Date.now()}-${safeName}`);
        await uploadBytes(photoRef, blob, { contentType: blob.type || photo.type });
        const photoUrl = await getDownloadURL(photoRef);
        const petRef = doc(collection(db, "pets"));
        // Mirrors the app's createOnboardingPet action field for field (species and breed names
        // from petTypes, size from the breed or "variable", petId self-reference) and appends the
        // pet to users/{uid}.petIds in the same batch, exactly as the app does.
        const batch = writeBatch(db);
        batch.set(petRef, {
          name: petName.trim().slice(0, 100),
          species: type!.name,
          breed: breed!.name,
          gender,
          birthday: Timestamp.fromDate(new Date(`${birthday}T12:00:00`)),
          availableForAdoption: false,
          created_time: serverTimestamp(),
          availableForMarriage: false,
          isLost: false,
          userId: doc(db, "users", user.uid),
          photo_url: [photoUrl],
          notes: "",
          spayed: false,
          vaccinated: false,
          size: breed!.size || "variable",
          noMarried: 0,
          petId: petRef,
        });
        batch.update(doc(db, "users", user.uid), { petIds: arrayUnion(petRef) });
        await batch.commit();
        petId = petRef.id;
        enteredName = petName.trim();
      }
      const response = await submitCompetitionEntry(competition.id, petId, about.trim());
      setResult({ status: response.status, existing: response.existing, petName: enteredName });
    } catch (reason) {
      toast({ title: "Entry not submitted", description: errorMessage(reason), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const title = data ? `Enter ${competition?.title || "the competition"} | ${data.event.title}` : "Enter the competition | TwoPaws";

  let body: JSX.Element;
  if (loadError) {
    body = (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <PawPrint className="h-14 w-14 text-brand-olive" />
        <h1 className="text-3xl text-brand-dark">Event not found</h1>
        <p className="max-w-md text-slate-600">{loadError}</p>
        <Button asChild className="bg-brand-dark text-white"><Link to="/events">See events</Link></Button>
      </div>
    );
  } else if (!data || authLoading) {
    body = (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-brand-dark">
        <RefreshCw className="h-10 w-10 animate-spin" />
        <p className="font-bold">Loading…</p>
      </div>
    );
  } else if (!competition) {
    body = (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <PawPrint className="h-14 w-14 text-brand-olive" />
        <h1 className="text-3xl text-brand-dark">No competition at this event</h1>
        <Button asChild variant="outline" className="border-brand-dark text-brand-dark"><Link to={`/events/${eventSlug}`}>Back to the event</Link></Button>
      </div>
    );
  } else if (result) {
    body = (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-brand-olive bg-brand-cream p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-dark text-white"><Check className="h-7 w-7" /></span>
        <h1 className="text-3xl text-brand-dark">
          {result.existing ? `${result.petName} is already entered` : `${result.petName} is in!`}
        </h1>
        <p className="text-slate-700">
          {result.status === "APPROVED"
            ? "The entry is approved and can receive votes on the leaderboard."
            : result.status === "PENDING"
              ? "The organiser will review the entry shortly. Once approved, it appears on the leaderboard and can receive votes."
              : `Entry status: ${result.status}.`}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild className="bg-brand-dark text-white"><Link to={`/events/${eventSlug}/leaderboard`}><Trophy className="mr-2 h-4 w-4" />Go to the leaderboard</Link></Button>
          <Button asChild variant="outline" className="border-brand-dark text-brand-dark"><Link to={`/events/${eventSlug}`}>Back to the event</Link></Button>
        </div>
      </div>
    );
  } else if (!entryOpen) {
    body = (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <PawPrint className="h-14 w-14 text-brand-olive" />
        <h1 className="text-3xl text-brand-dark">Entries are closed</h1>
        <p className="max-w-md text-slate-600">
          {competition.entriesCloseAt && new Date(competition.entriesCloseAt).getTime() > Date.now()
            ? `Entries open at ${eventTime(competition.entriesOpenAt)}.`
            : "The entry window for this competition has ended. You can still vote on the leaderboard."}
        </p>
        <Button asChild className="bg-brand-dark text-white"><Link to={`/events/${eventSlug}/leaderboard`}><Trophy className="mr-2 h-4 w-4" />View the leaderboard</Link></Button>
      </div>
    );
  } else if (!user) {
    body = (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-brand-olive bg-brand-cream p-8 text-center">
        <PawPrint className="h-14 w-14 text-brand-olive" />
        <h1 className="text-3xl text-brand-dark">Enter {competition.title}</h1>
        <p className="text-slate-700">Sign in with your TwoPaws account to enter your pet. It takes a minute, and you can use the same account to vote.</p>
        <Button className="bg-brand-dark text-white" onClick={() => navigate(`/login?redirect=${encodeURIComponent(enterPath)}`)}>
          Sign in to enter
        </Button>
      </div>
    );
  } else {
    const creatingPet = selectedPetId === "new";
    body = (
      <form onSubmit={(event) => void submit(event)} className="mx-auto grid max-w-3xl gap-8">
        <div className="text-center">
          <h1 className="text-4xl text-brand-dark sm:text-5xl">Enter {competition.title}</h1>
          <p className="mt-3 text-slate-600">
            {data.event.title}
            {competition.entriesCloseAt ? ` · entries close at ${eventTime(competition.entriesCloseAt)}` : ""}
          </p>
        </div>

        {ownedPets === null ? (
          <p className="text-center text-sm text-slate-500">Checking your pets…</p>
        ) : ownedPets.length > 0 ? (
          <fieldset className="grid gap-3">
            <legend className="mb-2 font-bold text-brand-dark">Which pet is entering?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {ownedPets.map((pet) => (
                <label
                  key={pet.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${selectedPetId === pet.id ? "border-brand-dark bg-brand-cream" : "border-slate-200 bg-white"}`}
                >
                  <input type="radio" name="pet" className="sr-only" checked={selectedPetId === pet.id} onChange={() => setSelectedPetId(pet.id)} />
                  {pet.photoUrl ? (
                    <img src={pet.photoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100"><PawPrint className="h-6 w-6 text-brand-olive" /></span>
                  )}
                  <span>
                    <span className="block font-bold text-brand-dark">{pet.name}</span>
                    <span className="block text-sm text-slate-500">{pet.breed || pet.species}</span>
                  </span>
                </label>
              ))}
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${creatingPet ? "border-brand-dark bg-brand-cream" : "border-slate-200 bg-white"}`}>
                <input type="radio" name="pet" className="sr-only" checked={creatingPet} onChange={() => setSelectedPetId("new")} />
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100"><ImagePlus className="h-6 w-6 text-brand-olive" /></span>
                <span className="font-bold text-brand-dark">Add a new pet</span>
              </label>
            </div>
          </fieldset>
        ) : null}

        {creatingPet && (
          <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="grid gap-2">
              <Label htmlFor="pet-name">Pet name</Label>
              <Input id="pet-name" value={petName} onChange={(event) => setPetName(event.target.value)} maxLength={100} required placeholder="e.g. Luna" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="pet-type">Pet type</Label>
                <select
                  id="pet-type"
                  value={typeId}
                  onChange={(event) => setTypeId(event.target.value)}
                  disabled={!petTypes}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {(petTypes || []).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pet-breed">Breed</Label>
                <select
                  id="pet-breed"
                  value={breedId}
                  onChange={(event) => setBreedId(event.target.value)}
                  disabled={!breeds}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{breeds ? (breeds.length ? "Choose a breed" : "No breeds listed") : "Loading breeds…"}</option>
                  {(breeds || []).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="pet-gender">Gender</Label>
                <select
                  id="pet-gender"
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choose</option>
                  {GENDERS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pet-birthday">Birthday</Label>
                <Input id="pet-birthday" type="date" value={birthday} max={todayIso()} onChange={(event) => setBirthday(event.target.value)} required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pet-photo">Photo</Label>
              <label htmlFor="pet-photo" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-brand-dark">
                {photoPreview ? (
                  <img src={photoPreview} alt="Selected pet" className="h-40 w-40 rounded-full object-cover" />
                ) : (
                  <ImagePlus className="h-10 w-10 text-brand-olive" />
                )}
                <span className="text-sm text-slate-600">{photo ? photo.name : "Tap to choose a photo"}</span>
              </label>
              <input
                id="pet-photo"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => onPhotoChange(event.target.files?.[0] || null)}
              />
            </div>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="about">Tell us about your pet (optional)</Label>
          <Textarea id="about" value={about} onChange={(event) => setAbout(event.target.value)} maxLength={1000} rows={3} placeholder="Anything the judges and voters should know." />
        </div>

        {!!competition.rules.length && (
          <ul className="space-y-1 text-sm text-slate-600">
            {competition.rules.map((rule) => <li key={rule} className="flex gap-2"><PawPrint className="mt-0.5 h-4 w-4 shrink-0 text-brand-olive" />{rule}</li>)}
          </ul>
        )}

        <Button type="submit" disabled={submitting} className="h-12 bg-brand-dark text-base text-white">
          {submitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <PawPrint className="mr-2 h-4 w-4" />}
          {submitting ? "Submitting…" : "Submit entry"}
        </Button>
      </form>
    );
  }

  return (
    <EventShell>
      <Seo title={title} description="Enter your pet in the TwoPaws Pet of the Event competition." canonicalUrl={enterPath} noIndex />
      <div className="py-10 sm:py-14">{body}</div>
    </EventShell>
  );
}
