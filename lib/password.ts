/**
 * Password rules.
 *
 * These MUST mirror the server-side rule set in the Supabase dashboard
 * (Authentication > Policies > Password Requirements). Client-side checks are
 * UX only - a determined caller hits the API directly, so the dashboard
 * setting is the real enforcement. Supabase's preset is
 * "Lowercase, uppercase, digits and symbols" with a minimum length, which is
 * why all four classes are checked here rather than just uppercase + symbol.
 */
export const MIN_LENGTH = 8;

export type Rule = { id: string; label: string; test: (v: string) => boolean };

export const RULES: Rule[] = [
  { id: "len", label: "At least 8 characters", test: (v) => v.length >= MIN_LENGTH },
  { id: "upper", label: "One uppercase letter (A-Z)", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter (a-z)", test: (v) => /[a-z]/.test(v) },
  { id: "digit", label: "One number (0-9)", test: (v) => /[0-9]/.test(v) },
  { id: "symbol", label: "One special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function passwordProblems(v: string) {
  return RULES.filter((r) => !r.test(v)).map((r) => r.label);
}

export const passwordIsValid = (v: string) => passwordProblems(v).length === 0;

/** 0-4, for the strength bar. Length beyond the minimum earns the last point. */
export function passwordScore(v: string) {
  if (!v) return 0;
  let n = RULES.filter((r) => r.test(v)).length;
  if (v.length >= 12) n += 1;
  return Math.min(4, Math.max(0, n - 1));
}
