"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  function switchMethod(nextMethod: "app" | "sms") {
    setMethod(nextMethod);
    setCode("");
    setError("");
    if (nextMethod === "sms" && !smsSent && !pending) {
      triggerSmsSend();
    }
  }

  return (
    <div className="mt-6 space-y-5">
      {showMethodTabs && (
        <div
          role="tablist"
          aria-label="Verification method"
          className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm"
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
              className={`rounded-md py-1.5 font-medium transition ${
                method === id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {method === "app"
          ? "Enter the 6-digit code from your authenticator app to finish signing in."
          : smsSent
            ? `Enter the 6-digit code we sent to ${maskedPhone}.`
            : `We will send a 6-digit code to ${maskedPhone}.`}
      </p>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {method === "sms" && !smsSent ? (
        <Button
          type="button"
          className="w-full"
          disabled={pending}
          onClick={triggerSmsSend}
        >
          {pending ? "Sending code…" : "Send text message code"}
        </Button>
      ) : (
        <form action={verifyLoginMfa} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="method" value={method} />
          {method === "sms" && (
            <input type="hidden" name="challengeId" value={challengeId} />
          )}

          <Input
            name="code"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            className="tracking-widest"
            required
            autoFocus
          />

          <Button
            type="submit"
            className="w-full"
            disabled={code.length !== 6 || pending}
          >
            Verify
          </Button>

          {method === "sms" && (
            <div className="flex justify-end text-xs">
              <button
                type="button"
                className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                disabled={cooldown > 0 || pending}
                onClick={triggerSmsSend}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
