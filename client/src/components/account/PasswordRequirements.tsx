import { useEffect, useMemo, useState } from "react";
import { validatePassword, type PasswordValidationStatus } from "firebase/auth";
import { Check, Circle } from "lucide-react";
import { auth } from "@/lib/firebase";

export type PasswordRequirement = { label: string; met: boolean };

// Used only if the project's password policy can't be fetched; mirrors the policy enforced in Firebase Auth.
export const FALLBACK_POLICY_HINT =
  "Use at least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.";

// The policy is enforced server-side by Firebase Auth (Authentication > Settings > Password policy).
// validatePassword fetches it, so the list follows the console instead of hard-coded rules.
function passwordRequirements(status: PasswordValidationStatus | null): PasswordRequirement[] {
  if (!status) return [];
  const options = status.passwordPolicy.customStrengthOptions;
  const rules: Array<[boolean | undefined, string]> = [
    [status.meetsMinPasswordLength, `At least ${options.minPasswordLength ?? 6} characters`],
    [status.containsUppercaseLetter, "An uppercase letter (A–Z)"],
    [status.containsLowercaseLetter, "A lowercase letter (a–z)"],
    [status.containsNumericCharacter, "A number (0–9)"],
    [status.containsNonAlphanumericCharacter, "A symbol, such as ! @ # $ %"],
  ];
  const requirements = rules
    .filter((rule): rule is [boolean, string] => rule[0] !== undefined)
    .map(([met, label]) => ({ label, met }));
  // The maximum is thousands of characters, so only mention it when someone actually exceeds it.
  if (status.meetsMaxPasswordLength === false) {
    requirements.push({ label: `No more than ${options.maxPasswordLength} characters`, met: false });
  }
  return requirements;
}

/**
 * Checks a new password against the project's password policy as it is typed.
 * `isValid` is null while the policy is unknown (not fetched yet, or the fetch failed); callers should then
 * let the server decide rather than block the form.
 */
export function usePasswordPolicy(password: string, enabled = true) {
  const [status, setStatus] = useState<PasswordValidationStatus | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    validatePassword(auth, password)
      .then((result) => { if (active) setStatus(result); })
      .catch(() => { if (active) setStatus(null); });
    return () => { active = false; };
  }, [enabled, password]);

  const requirements = useMemo(() => passwordRequirements(enabled ? status : null), [enabled, status]);
  return {
    requirements,
    isValid: enabled && status ? status.isValid : null,
    minLength: status?.passwordPolicy.customStrengthOptions.minPasswordLength ?? 6,
  };
}

export function PasswordRequirementList({ id, requirements }: { id: string; requirements: PasswordRequirement[] }) {
  if (requirements.length === 0) return null;
  return (
    <ul id={id} className="space-y-1.5 text-sm" aria-label="Password requirements">
      {requirements.map((requirement) => (
        <li
          key={requirement.label}
          className={`flex items-center gap-2 ${requirement.met ? "text-emerald-700" : "text-slate-600"}`}
        >
          {requirement.met ? (
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
          )}
          <span>{requirement.label}</span>
          <span className="sr-only">{requirement.met ? "(done)" : "(missing)"}</span>
        </li>
      ))}
    </ul>
  );
}
