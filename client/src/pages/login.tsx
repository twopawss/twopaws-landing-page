import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FALLBACK_POLICY_HINT,
  PasswordRequirementList,
  usePasswordPolicy,
} from "@/components/account/PasswordRequirements";
import ShopShell from "@/components/shop/ShopShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { FaApple, FaGoogle } from "react-icons/fa";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import Seo from "@/lib/seo/Seo";
import { createMetaEventId, trackMetaEvent } from "@/lib/metaPixel";

// Firebase's own messages read like system errors ("Firebase: ... (auth/...)"), so map the common ones.
function emailAuthErrorMessage(cause: unknown, mode: "signin" | "signup", hasPolicyList: boolean) {
  const code = (cause as { code?: string }).code;
  switch (code) {
    case "auth/password-does-not-meet-requirements":
    case "auth/weak-password":
      return hasPolicyList
        ? "Your password doesn’t meet all the requirements. Check the list under the password field."
        : `Your password isn’t strong enough. ${FALLBACK_POLICY_HINT}`;
    case "auth/email-already-in-use":
      return "An account already exists with this email. Sign in instead, or reset your password if you’ve forgotten it.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact TwoPaws support.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "We couldn’t reach the server. Check your internet connection and try again.";
    default:
      console.error("Email authentication failed", cause);
      return mode === "signup"
        ? "We couldn’t create your account. Please try again."
        : "We couldn’t sign you in. Please try again.";
  }
}

export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle, signInWithApple } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const redirectTo = params.get("redirect") || "/shop/";
  const requestedMode = params.get("mode");
  const initialMode: "signin" | "signup" =
    requestedMode === "signup" ? "signup" : "signin";

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneInput, setPhoneInput] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  // Only new passwords need the policy; signing in with an older, weaker password is still allowed.
  const { requirements, isValid: meetsPolicy } = usePasswordPolicy(password, mode === "signup");

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleSocialSignIn = async (provider: "google" | "apple") => {
    setLoading(true);
    try {
      const result = provider === "google"
        ? await signInWithGoogle()
        : await signInWithApple();
      if (result.isNewUser) {
        trackMetaEvent(
          "CompleteRegistration",
          {
            method: provider,
            source_path: "/login",
          },
          { eventId: createMetaEventId("CompleteRegistration", result.user.uid) }
        );
      }
      navigate(redirectTo);
    } catch (err) {
      toast({
        title: "Authentication failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email || !password) return;
    if (mode === "signup") {
      if (!firstName.trim() || !lastName.trim() || !phoneInput) {
        toast({
          title: "Missing information",
          description: "First name, last name, and phone number are required.",
          variant: "destructive",
        });
        return;
      }
      if (meetsPolicy === false) {
        toast({
          title: "Choose a stronger password",
          description: "Your password doesn’t meet all the requirements yet. Check the list under the password field.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        if (!phoneInput || !isValidPhoneNumber(phoneInput)) {
          toast({
            title: "Invalid phone number",
            description: "Enter a valid phone number.",
            variant: "destructive",
          });
          return;
        }
        const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const newUser = await signUp(email, password, {
          displayName,
          phone: phoneInput,
        });
        trackMetaEvent(
          "CompleteRegistration",
          {
            method: "email",
            source_path: "/login",
          },
          { eventId: createMetaEventId("CompleteRegistration", newUser.uid) }
        );
      }
      navigate(redirectTo);
    } catch (err) {
      toast({
        title: mode === "signup" ? "Couldn’t create your account" : "Couldn’t sign you in",
        description: emailAuthErrorMessage(err, mode, requirements.length > 0),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShopShell>
      <Seo
        title="Sign In | TwoPaws Shop"
        description="Sign in to access your TwoPaws cart, orders, and saved addresses."
        canonicalUrl="/login/"
        noIndex
      />
      <div className="flex justify-center">
        <Card className="w-full max-w-md border-slate-100">
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-slate-900">
                {mode === "signin" ? "Sign in" : "Create account"}
              </h1>
              <p className="text-sm text-slate-500">
                Access your cart, orders, and saved addresses.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center gap-2 border-slate-200"
                onClick={() => handleSocialSignIn("google")}
                disabled={loading}
              >
                <FaGoogle className="h-4 w-4" aria-hidden="true" />
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center gap-2 border-slate-200"
                onClick={() => handleSocialSignIn("apple")}
                disabled={loading}
              >
                <FaApple className="h-4 w-4" aria-hidden="true" />
                Continue with Apple
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">or continue with email</span>
              </div>
            </div>
            {mode === "signup" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>First name</Label>
                    <Input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last name</Label>
                    <Input
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone number</Label>
                  <PhoneInput
                    className="auth-phone-input"
                    defaultCountry="EG"
                    international
                    countryCallingCodeEditable={false}
                    value={phoneInput}
                    onChange={setPhoneInput}
                    placeholder="Enter phone number"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={mode === "signup" && requirements.length > 0 ? "signup-password-requirements" : undefined}
              />
              {mode === "signup" && (
                <PasswordRequirementList id="signup-password-requirements" requirements={requirements} />
              )}
            </div>
            {mode === "signin" && (
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm font-medium text-brand-green-dark underline-offset-4 hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}
            <Button
              className="w-full bg-brand-green-dark text-white"
              onClick={handleSubmit}
              disabled={
                loading ||
                !email ||
                !password ||
                (mode === "signup" &&
                  (!firstName.trim() || !lastName.trim() || !phoneInput))
              }
            >
              {loading
                ? "Please wait..."
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-sm text-slate-500"
              onClick={() =>
                setMode((prev) => (prev === "signin" ? "signup" : "signin"))
              }
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ShopShell>
  );
}
