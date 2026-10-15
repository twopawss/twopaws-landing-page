import { useEffect, useMemo, useState, type FormEvent } from "react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { Link, useLocation } from "react-router-dom";
import ShopShell from "@/components/shop/ShopShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Seo from "@/lib/seo/Seo";
import { auth, functions } from "@/lib/firebase";

const requestPasswordResetEmail = httpsCallable<{ email: string }, { success: boolean }>(
  functions,
  "requestPasswordResetEmail"
);

type ResetState = "checking" | "ready" | "saving" | "success" | "invalid";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [invalidEmail, setInvalidEmail] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setInvalidEmail(true);
      return;
    }
    setInvalidEmail(false);
    setStatus("sending");
    try {
      await requestPasswordResetEmail({ email: normalizedEmail });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <ShopShell>
      <Seo title="Reset Your Password | TwoPaws" description="Request a secure TwoPaws password reset link." canonicalUrl="/forgot-password/" noIndex />
      <div className="flex min-h-[55vh] items-center justify-center py-8">
        <Card className="w-full max-w-md border-slate-100 shadow-sm">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-green-dark">Account security</p>
              <h1 className="text-2xl font-semibold text-slate-900">Forgot your password?</h1>
              <p className="text-sm leading-6 text-slate-600">Enter your TwoPaws account email and we’ll send a secure reset link if an account matches.</p>
            </div>
            {status === "sent" ? (
              <div className="space-y-4" role="status" aria-live="polite">
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">If an account uses that email, we’ve sent a reset link. Check your inbox and spam folder.</p>
                <Button asChild variant="outline" className="w-full"><Link to="/login">Back to sign in</Link></Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="reset-request-email">Email</Label>
                  <Input id="reset-request-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setInvalidEmail(false); }} placeholder="you@example.com" />
                </div>
                {invalidEmail && <p className="text-sm text-destructive" role="alert">Enter a valid email address.</p>}
                {status === "error" && <p className="text-sm text-destructive" role="alert">We couldn’t send the email right now. Please wait a moment and try again.</p>}
                <Button type="submit" className="w-full bg-brand-green-dark text-white" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send reset link"}</Button>
                <p className="text-center text-sm text-slate-600">Remembered it? <Link to="/login" className="font-medium text-brand-green-dark hover:underline">Sign in</Link></p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </ShopShell>
  );
}

export function ResetPasswordPage() {
  const location = useLocation();
  const { mode, actionCode } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return { mode: params.get("mode"), actionCode: params.get("oobCode") };
  }, [location.search]);
  const [state, setState] = useState<ResetState>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Reset action codes are bearer credentials: keep them in memory, not history or analytics.
    if (window.location.search || window.location.hash) {
      window.history.replaceState(window.history.state, document.title, location.pathname);
    }
    if (mode !== "resetPassword" || !actionCode) {
      setState("invalid");
      return;
    }
    let active = true;
    void verifyPasswordResetCode(auth, actionCode)
      .then(() => { if (active) setState("ready"); })
      .catch(() => { if (active) setState("invalid"); });
    return () => { active = false; };
  }, [actionCode, location.pathname, mode]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmation) {
      setError("The passwords don’t match.");
      return;
    }
    if (!actionCode) {
      setState("invalid");
      return;
    }
    setError("");
    setState("saving");
    try {
      await confirmPasswordReset(auth, actionCode, password);
      setState("success");
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      if (code === "auth/weak-password") {
        setError("Choose a stronger password and try again.");
        setState("ready");
      } else if (code === "auth/expired-action-code" || code === "auth/invalid-action-code") {
        setState("invalid");
      } else {
        setError("We couldn’t update your password. Check your connection and try again.");
        setState("ready");
      }
    }
  };

  return (
    <ShopShell>
      <Seo title="Choose a New Password | TwoPaws" description="Securely choose a new password for your TwoPaws account." canonicalUrl="/reset-password/" noIndex />
      <div className="flex min-h-[55vh] items-center justify-center py-8">
        <Card className="w-full max-w-md border-slate-100 shadow-sm">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-green-dark">Account security</p>
              <h1 className="text-2xl font-semibold text-slate-900">{state === "success" ? "Password updated" : "Choose a new password"}</h1>
              <p className="text-sm leading-6 text-slate-600">{state === "success" ? "Your TwoPaws password has been changed. You can now sign in with your new password." : "Use a new password you haven’t used for this account before."}</p>
            </div>
            {state === "checking" && <p role="status" className="text-sm text-slate-600">Checking your secure link…</p>}
            {state === "invalid" && (
              <div className="space-y-4" role="alert">
                <p className="text-sm leading-6 text-slate-600">This reset link is invalid or has expired. Request a new link to continue.</p>
                <Button asChild className="w-full bg-brand-green-dark text-white"><Link to="/forgot-password">Request a new link</Link></Button>
              </div>
            )}
            {(state === "ready" || state === "saving") && (
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></div>
                <div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" autoComplete="new-password" required minLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Enter it again" /></div>
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <Button type="submit" className="w-full bg-brand-green-dark text-white" disabled={state === "saving"}>{state === "saving" ? "Updating…" : "Update password"}</Button>
              </form>
            )}
            {state === "success" && <Button asChild className="w-full bg-brand-green-dark text-white"><Link to="/login">Continue to sign in</Link></Button>}
          </CardContent>
        </Card>
      </div>
    </ShopShell>
  );
}