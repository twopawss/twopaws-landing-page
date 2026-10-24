import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Expand, Heart, PawPrint, RefreshCw, Trophy } from "lucide-react";
import EventShell from "@/features/events/EventShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  castCompetitionVote,
  getMyCompetitionBallot,
  getPublicLeaderboard,
} from "@/features/events/api";
import { errorMessage, eventTime } from "@/features/events/format";
import type { PublicCompetition, PublicEntry, PublicEvent } from "@/features/events/types";
import Seo from "@/lib/seo/Seo";
import twoPawsEventBarLogo from "../../../../attached_assets/twopaws-event-bar-logo-600.webp";

type LeaderboardData = {
  event: PublicEvent;
  competition: PublicCompetition;
  entries: PublicEntry[];
  generatedAt: string;
};

// Mirrors isCompetitionVotingOpen in functions/src/events/shared.ts; the callable
// is the authority, this only decides whether to show the button.
const isVotingOpen = (competition: PublicCompetition, now: number) => {
  if (!["ENTRIES_OPEN", "ENTRIES_CLOSED", "VOTING_OPEN"].includes(competition.status)) {
    return false;
  }
  const opens = competition.votingStartAt ? new Date(competition.votingStartAt).getTime() : 0;
  const closes = competition.votingEndAt ? new Date(competition.votingEndAt).getTime() : 0;
  return (!opens || now >= opens) && (!closes || now < closes);
};

const useCountdown = (target: string | null) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return useMemo(() => {
    if (!target) return null;
    const remaining = Math.max(0, new Date(target).getTime() - now);
    const hours = Math.floor(remaining / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    const seconds = Math.floor((remaining % 60_000) / 1000);
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }, [now, target]);
};

export default function PublicLeaderboardPage() {
  const { eventSlug = "" } = useParams();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const countdown = useCountdown(data?.competition.votingEndAt || null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [votedEntryIds, setVotedEntryIds] = useState<string[] | null>(null);
  const [votingEntryId, setVotingEntryId] = useState<string | null>(null);
  const competitionId = data?.competition.id || null;

  useEffect(() => {
    if (!user || !competitionId) {
      setVotedEntryIds(null);
      return;
    }
    let cancelled = false;
    getMyCompetitionBallot(competitionId, user.uid)
      .then((ids) => {
        if (!cancelled) setVotedEntryIds(ids);
      })
      .catch(() => {
        if (!cancelled) setVotedEntryIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, competitionId]);

  const vote = async (entry: PublicEntry) => {
    if (!data) return;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/events/${eventSlug}/leaderboard`)}`);
      return;
    }
    setVotingEntryId(entry.id);
    try {
      const result = await castCompetitionVote(data.competition.id, entry.id);
      setVotedEntryIds((current) => [...(current || []), entry.id]);
      toast({
        title: `Your vote for ${entry.petName} is in`,
        description:
          result.maxVotes > 1
            ? `${result.votesUsed} of ${result.maxVotes} votes used.`
            : undefined,
      });
      void load(true);
    } catch (reason) {
      toast({ title: "Vote not counted", description: errorMessage(reason), variant: "destructive" });
    } finally {
      setVotingEntryId(null);
    }
  };

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setData(await getPublicLeaderboard(eventSlug));
      setError("");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => void load(true), 5000);
    return () => {
      window.clearInterval(poll);
    };
  }, [eventSlug]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const fullscreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-brand-cream text-brand-dark">
        <RefreshCw className="h-12 w-12 animate-spin" />
        <p className="mt-5 text-xl font-bold">Fetching the latest results…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-5 text-center">
        <PawPrint className="h-16 w-16 text-brand-olive" />
        <h1 className="text-4xl">Leaderboard unavailable</h1>
        <p className="max-w-lg text-slate-600">{error}</p>
        <Button onClick={() => void load()} className="bg-brand-dark text-white">Try again</Button>
      </div>
    );
  }

  const top = data.entries.slice(0, 3);
  const rest = data.entries.slice(3);
  const published = data.competition.status === "RESULTS_PUBLISHED";
  const votingOpen = isVotingOpen(data.competition, Date.now());
  const maxVotes = Math.max(1, Math.min(10, data.competition.maxVotesPerUser || 1));
  const votesUsed = votedEntryIds?.length || 0;
  const showVoting = votingOpen && !isFullscreen;

  const renderVoteButton = (entry: PublicEntry, compact = false) => {
    if (!showVoting) return null;
    const voted = Boolean(votedEntryIds?.includes(entry.id));
    const exhausted = Boolean(user) && !voted && votesUsed >= maxVotes;
    const busy = votingEntryId === entry.id;
    const size = compact ? "sm" : "default";
    if (voted) {
      return (
        <Button size={size} disabled className="bg-brand-dark text-white disabled:opacity-100" aria-label={`You voted for ${entry.petName}`}>
          <Check className="mr-2 h-4 w-4" />Voted
        </Button>
      );
    }
    return (
      <Button
        size={size}
        onClick={() => void vote(entry)}
        disabled={busy || exhausted || authLoading || (Boolean(user) && votedEntryIds === null)}
        className="bg-brand-olive text-brand-dark hover:bg-brand-olive/90"
        aria-label={user ? `Vote for ${entry.petName}` : `Sign in to vote for ${entry.petName}`}
      >
        {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Heart className="mr-2 h-4 w-4" />}
        {!user ? "Sign in to vote" : exhausted ? "No votes left" : "Vote"}
      </Button>
    );
  };

  return (
    <EventShell fullWidth hideHeader={isFullscreen}>
      <Seo title={`${data.competition.title} Leaderboard | ${data.event.title}`} description="Live Pet of the Event results. Sign in to vote for your favourite pet." canonicalUrl={`/events/${eventSlug}/leaderboard`} noIndex />
      <div className={`${isFullscreen ? "min-h-screen" : "min-h-[calc(100vh-72px)]"} bg-brand-cream/55`}>
        <header className="flex flex-wrap items-center justify-between gap-4 bg-brand-dark px-5 py-4 text-white sm:px-8">
          <div className="flex items-center gap-4">
            {isFullscreen ? (
              <img src={twoPawsEventBarLogo} alt="TwoPaws" width={600} height={137} className="h-12 w-auto object-contain sm:h-14" />
            ) : (
              <PawPrint className="h-8 w-8 text-brand-olive" />
            )}
            <Link to={`/events/${eventSlug}`} className="text-lg font-bold">{data.event.title}</Link>
          </div>
          <div className="flex items-center gap-3">
            {!isFullscreen && !published && (
              <Button asChild className="bg-brand-olive text-brand-dark hover:bg-brand-olive/90"><Link to={`/events/${eventSlug}/enter`}><PawPrint className="mr-2 h-4 w-4" />Enter your pet</Link></Button>
            )}
            <Button variant="outline" onClick={() => void fullscreen()} className="border-white bg-transparent text-white hover:bg-white/10 hover:text-white"><Expand className="mr-2 h-4 w-4" />{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</Button>
          </div>
        </header>

        <section className="px-4 pb-12 pt-10 text-center sm:px-8">
          <h1 className="text-5xl text-brand-dark sm:text-7xl">{data.competition.title}</h1>
          <p className="mt-3 text-xl font-bold text-brand-dark">
            {published ? "Final results" : `Voting closes at ${eventTime(data.competition.votingEndAt)}`}
          </p>
          {!published && countdown && <p className="mt-2 font-mono text-5xl font-black tracking-wider text-brand-dark sm:text-7xl">{countdown}</p>}
          {showVoting && (
            <p className="mx-auto mt-4 max-w-xl text-slate-600">
              {!user
                ? "Sign in with your TwoPaws account to vote for your favourite pet."
                : maxVotes > 1
                  ? `You have ${Math.max(0, maxVotes - votesUsed)} of ${maxVotes} votes left.`
                  : votesUsed
                    ? "Thanks for voting! One vote per person."
                    : "Pick your favourite pet below. One vote per person."}
            </p>
          )}
          {!top.length ? (
            <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-brand-olive bg-white p-10">
              <PawPrint className="mx-auto h-14 w-14 text-brand-olive" />
              <h2 className="mt-4 text-3xl">No approved entries yet</h2>
              <p className="mt-2 text-slate-600">Check back when the organizer approves competition entries.</p>
            </div>
          ) : (
            <>
              <div className="mx-auto mt-10 grid max-w-5xl items-end gap-5 md:grid-cols-3">
                {[top[1], top[0], top[2]].map((entry, visualIndex) => {
                  if (!entry) return <div key={visualIndex} />;
                  const rank = visualIndex === 0 ? 2 : visualIndex === 1 ? 1 : 3;
                  return (
                    <article key={entry.id} className={rank === 1 ? "md:order-2" : rank === 2 ? "md:order-1" : "md:order-3"}>
                      <img src={entry.petImageUrl} alt={entry.petName} className={`mx-auto rounded-full border-[6px] object-cover shadow-xl ${rank === 1 ? "h-52 w-52 border-brand-olive sm:h-64 sm:w-64" : "h-44 w-44 border-white sm:h-52 sm:w-52"}`} />
                      <div className={`relative -mt-4 rounded-t-3xl px-5 pb-6 pt-9 ${rank === 1 ? "bg-brand-olive text-brand-dark" : rank === 2 ? "bg-slate-200 text-slate-900" : "bg-[#d89a5b] text-slate-950"}`}>
                        <span className="absolute left-1/2 top-0 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-brand-dark text-xl font-black text-white">{rank}</span>
                        {rank === 1 && <Trophy className="mx-auto mb-2 h-7 w-7" />}
                        <h2 className="text-3xl">{entry.petName}</h2>
                        <p>{entry.petBreed || entry.petSpecies}</p>
                        {showVoting && <div className="mt-4">{renderVoteButton(entry)}</div>}
                      </div>
                    </article>
                  );
                })}
              </div>
              {!!rest.length && (
                <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm">
                  {rest.map((entry, index) => (
                    <div key={entry.id} className={`grid items-center gap-3 border-b border-slate-200 px-4 py-3 last:border-0 sm:px-6 ${showVoting ? "grid-cols-[48px_56px_1fr_auto] sm:grid-cols-[64px_64px_1fr_auto]" : "grid-cols-[48px_56px_1fr] sm:grid-cols-[64px_64px_1fr]"}`}>
                      <span className="text-center text-2xl font-black text-brand-dark">{index + 4}</span>
                      <img src={entry.petImageUrl} alt="" className="h-12 w-12 rounded-full object-cover sm:h-14 sm:w-14" />
                      <div><p className="text-lg font-bold sm:text-xl">{entry.petName}</p><p className="text-sm text-slate-500">{entry.petBreed || entry.petSpecies}</p></div>
                      {showVoting && renderVoteButton(entry, true)}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {error && <p className="mx-auto mt-6 max-w-lg rounded-lg bg-red-50 p-3 text-sm text-red-700">Live update delayed: {error}</p>}
        </section>
      </div>
    </EventShell>
  );
}
