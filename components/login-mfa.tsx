"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendLoginSmsCode, verifyLoginMfa } from "@/app/actions/security";

type LoginMfaFormProps = {
  next: string;
  initialError?: string;
  hasTotp: boolean;
  maskedPhone: string | null;
};

export function LoginMfaForm({
  next,
  initialError,
  hasTotp,
  maskedPhone,
}: LoginMfaFormProps) {
  const canUseSms = Boolean(maskedPhone);
  const showMethodTabs = hasTotp && canUseSms;

  const [method, setMethod] = useState<"app" | "sms">(hasTotp ? "app" : "sms");
  const [challengeId, setChallengeId] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [cooldown, setCooldown] = useState(0);
  const [pending, startTransition] = useTransition();
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function triggerSmsSend() {
    setError("");
    startTransition(async () => {
      const res = await sendLoginSmsCode();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setChallengeId(res.challengeId);
      setSmsSent(true);
      setCode("");
      setCooldown(30);
    });
  }

  useEffect(() => {
    if (!hasTotp && canUseSms && !autoSentRef.current) {
      autoSentRef.current = true;
      triggerSmsSend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTotp, canUseSms]);

  function switchMethod(nextMethod: "app" | "sms") {
    setMethod(nextMethod);
    setCode("");
    setError("");
    if (nextMethod === "sms" && !smsSent && !pending) {
      triggerSmsSend();
    }
  }

  const input =
    "w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";
  const primary =
    "w-full rounded-full bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="mt-5">
      <p className="text-sm text-gray-500">
        {method === "app"
          ? "Enter the 6-digit code from your authenticator app to finish signing in."
          : smsSent
            ? `Enter the 6-digit code we sent to ${maskedPhone}.`
            : `We will send a 6-digit code to ${maskedPhone}.`}
      </p>

      {showMethodTabs && (
        <div
          role="tablist"
          aria-label="Verification method"
          className="mt-5 grid grid-cols-2 rounded-full bg-gray-100 p-1 text-sm"
        >
          {(
            [
              ["app", "Authenticator app"],
              ["sms", "Text message"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={method === id}
              onClick={() => switchMethod(id)}
              className={`rounded-full py-1.5 font-medium transition ${
                method === id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {method === "sms" && !smsSent ? (
          <button
            type="button"
            className={primary}
            disabled={pending}
            onClick={triggerSmsSend}
          >
            {pending ? "Sending…" : "Send code"}
          </button>
        ) : (
          <form action={verifyLoginMfa} className="space-y-3">
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="method" value={method} />
            {method === "sms" && (
              <input type="hidden" name="challengeId" value={challengeId} />
            )}

            <input
              type="text"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className={`${input} tracking-widest`}
              aria-label="6-digit verification code"
              required
              autoFocus
            />

            <button
              type="submit"
              className={primary}
              disabled={code.length !== 6 || pending}
            >
              Verify
            </button>
          </form>
        )}

        {method === "sms" && smsSent && (
          <div className="flex justify-end text-sm">
            <button
              type="button"
              className="text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
              disabled={cooldown > 0 || pending}
              onClick={triggerSmsSend}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
