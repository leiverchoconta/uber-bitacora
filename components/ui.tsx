import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control arrives as children
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      <span className="mt-1 block">{children}</span>
      {hint ? (
        <span className="mt-1 block text-[10px] text-ink-soft">{hint}</span>
      ) : null}
    </label>
  );
}

const CONTROL =
  "rounded-sm border border-line bg-white focus:outline-2 focus:outline-offset-1 focus:outline-teal";
/** `text-base` keeps iOS Safari from zooming in on focus. */
const CONTROL_FULL = `${CONTROL} w-full px-3 py-2 text-base`;
const CONTROL_COMPACT = `${CONTROL} px-2 py-1.5 text-base`;

export function Input({
  compact,
  className = "",
  ...props
}: ComponentProps<"input"> & { compact?: boolean }) {
  const base = compact ? CONTROL_COMPACT : CONTROL_FULL;
  return <input {...props} className={`${base} ${className}`} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`${CONTROL_FULL} ${className}`} />;
}

export function Textarea({
  className = "",
  ...props
}: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${CONTROL_FULL} ${className}`} />;
}

const TONES = {
  primary: "bg-teal text-paper hover:bg-teal-soft px-4 py-2.5 text-sm",
  secondary: "bg-gold text-ink hover:brightness-95 px-3 py-1.5 text-xs",
  link: "text-rust underline hover:no-underline text-[11px]",
} as const;

export function Button({
  tone = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { tone?: keyof typeof TONES }) {
  return (
    <button
      {...props}
      className={`cursor-pointer rounded-sm transition ${TONES[tone]} ${className}`}
    />
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn";
}) {
  const color =
    tone === "warn" ? "text-rust" : tone === "ok" ? "text-moss" : "text-ink";
  return (
    <div className="bg-paper px-4 py-3">
      <div className="text-[11px] text-ink-soft">{label}</div>
      <div className={`mt-1 font-display text-xl ${color}`}>{value}</div>
      {sub ? (
        <div className="mt-0.5 text-[11px] text-ink-soft">{sub}</div>
      ) : null}
    </div>
  );
}

/** Hairline grid of stat tiles: the 1px gap is the divider. */
export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-px border border-line bg-line">
      {children}
    </div>
  );
}

export function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-9">
      <h2 className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2 text-lg text-teal">
        {title}
        {aside}
      </h2>
      {children}
    </section>
  );
}

/** Result of the last action, passed through the URL after a redirect. */
export function Banner({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <p
      role="status"
      // Paper ground, not a tinted wash: the colored text only clears
      // WCAG AA (5.06:1 rust, 4.67:1 moss) against paper.
      className={`mb-5 rounded-sm border bg-paper px-4 py-3 text-sm ${
        error ? "border-rust text-rust" : "border-moss text-moss"
      }`}
    >
      {error ?? ok}
    </p>
  );
}

export function NavLink({
  href,
  label,
  title,
  disabled,
}: {
  href: string;
  label: string;
  title: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      // A dead end, not a control: hide it from assistive tech entirely.
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-sm border border-line text-teal opacity-30"
      >
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={title}
      className="flex size-8 items-center justify-center rounded-sm border border-line text-teal hover:bg-teal hover:text-paper"
    >
      {label}
    </Link>
  );
}
