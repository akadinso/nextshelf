"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  confirmMfaEnrollment,
  disableMfa,
  startMfaEnrollment,
} from "@/app/actions/security";

type VerifyPayload = {
  method: "app" | "sms";
  code: string;
  phone?: string;
  factorId?: string;
};

type MfaManagerProps = {
  enabledFactorId: string | null;
  defaultCountryCode?: string;
  onSendSms?: (phone: string) => Promise<{ ok: boolean; error?: string }>;
  onVerifyChallenge?: (
    payload: VerifyPayload,
  ) => Promise<{ ok: boolean; error?: string }>;
};

function normalizeCode(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export default function MfaManager({
  enabledFactorId,
  defaultCountryCode = "+27",
  onSendSms,
  onVerifyChallenge,
}: MfaManagerProps) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // Enrollment state (TOTP)
  const [setup, setSetup] = useState<{
    factorId: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);

  // Challenge / SMS state
  const [method, setMethod] = useState<"app" | "sms">("app");
  const [smsStep, setSmsStep] = useState<"phone" | "code">("phone");
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [phone, setPhone] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Shared form state
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const cleanDigits = phone.replace(/^0+/, "").replace(/\D/g, "");
  const fullPhone = `${countryCode}${cleanDigits}`;
  const phoneValid = cleanDigits.length >= 8;

  function beginEnrollment() {
    setError("");
    setCode("");
    start(async () => {
      const res = await startMfaEnrollment();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSetup({ factorId: res.factorId, qr: res.qr, secret: res.secret });
    });
  }

  function confirmEnrollment() {
    if (!setup) return;
    setError("");
    start(async () => {
      const res = await confirmMfaEnrollment(setup.factorId, code);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSetup(null);
      setCode("");
      router.refresh();
    });
  }

  function handleDisable() {
    if (!enabledFactorId) return;
    setError("");
    start(async () => {
      const res = await disableMfa(enabledFactorId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConfirmOff(false);
      router.refresh();
    });
  }

  function handleSendSms() {
    if (!onSendSms || !phoneValid) return;
    setError("");
    start(async () => {
      const res = await onSendSms(fullPhone);
      if (!res.ok) {
        setError(
          res.error ??
            "We could not send the code. Check the number and try again.",
        );
        return;
      }
      setSmsStep("code");
      setCode("");
      setCooldown(30);
    });
  }

  function handleChallengeVerify() {
    if (!onVerifyChallenge) return;
    setError("");
    start(async () => {
      const res = await onVerifyChallenge({
        method,
        code,
        phone: method === "sms" ? fullPhone : undefined,
        factorId: method === "app" ? (enabledFactorId ?? undefined) : undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "That code is not right. Try again.");
        return;
      }
      setCode("");
      router.refresh();
    });
  }

  // 1. Already enrolled: show status + disable flow (or challenge if onVerifyChallenge is provided)
  if (enabledFactorId && !onVerifyChallenge) {
    return (
      <div className="space-y-3">
        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
          On
        </span>
        <p className="text-sm text-muted-foreground">
          You need a code from your authenticator app each time you sign in.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {confirmOff ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisable}
              disabled={pending}
            >
              {pending ? "Turning off…" : "Yes, turn it off"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmOff(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmOff(true)}
          >
            Turn off
          </Button>
        )}
      </div>
    );
  }

  // 2. Challenge / sign-in verification mode (App or SMS)
  if (onVerifyChallenge) {
    const showCodeInput = method === "app" || smsStep === "code";

    return (
      <div className="space-y-4">
        {onSendSms && (
          <div
            role="tablist"
            aria-label="Verification method"
            className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm"
          >
            {(["app", "sms"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={method === tab}
                onClick={() => {
                  setMethod(tab);
                  setSmsStep("phone");
                  setCode("");
                  setError("");
                }}
                className={`rounded-md py-1.5 font-medium transition ${
                  method === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {tab === "app" ? "Authenticator app" : "Text message"}
              </button>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {method === "app"
            ? "Enter the 6-digit code from your authenticator app to finish signing in."
            : smsStep === "phone"
              ? "Enter your phone number and we will text you a 6-digit code."
              : `Enter the 6-digit code we sent to ${fullPhone}.`}
        </p>

        {method === "sms" && smsStep === "phone" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                aria-label="Country code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="h-9 rounded-md border bg-background px-2.5 text-sm"
              >
                <option value="+27">+27 ZA</option>
                <option value="+1">+1 US/CA</option>
                <option value="+44">+44 UK</option>
                <option value="+61">+61 AU</option>
                <option value="+264">+264 NA</option>
                <option value="+267">+267 BW</option>
                <option value="+263">+263 ZW</option>
              </select>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="82 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSendSms}
              disabled={!phoneValid || pending}
              className="w-full"
            >
              {pending ? "Sending…" : "Send code"}
            </Button>
          </div>
        )}

        {showCodeInput && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(normalizeCode(e.target.value))}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  code.length === 6 &&
                  !pending &&
                  handleChallengeVerify()
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                aria-label="6-digit verification code"
                className="w-36 font-mono tracking-widest"
              />
              <Button
                onClick={handleChallengeVerify}
                disabled={code.length !== 6 || pending}
              >
                {pending ? "Verifying…" : "Verify"}
              </Button>
            </div>

            {method === "sms" && smsStep === "code" && (
              <div className="flex justify-between text-xs">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    setSmsStep("phone");
                    setCode("");
                    setError("");
                  }}
                >
                  Change number
                </button>
                <button
                  type="button"
                  className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                  disabled={cooldown > 0 || pending}
                  onClick={handleSendSms}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  // 3. Initial enrollment prompt
  if (!setup) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Add a second step to your sign-in using an authenticator app such as
          Google Authenticator, Microsoft Authenticator or Authy. It protects
          your account even if your password is stolen.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={beginEnrollment} disabled={pending}>
          {pending ? "Starting…" : "Set up two-step verification"}
        </Button>
      </div>
    );
  }

  // 4. QR + secret confirmation step
  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Open your authenticator app and add a new account.</li>
        <li>Scan this QR code (or type the key below).</li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={setup.qr}
        alt="QR code to add this account to your authenticator app"
        className="h-44 w-44 rounded-lg border bg-white p-2"
      />
      <p className="break-all rounded-md bg-muted p-2 font-mono text-xs">
        {setup.secret}
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(normalizeCode(e.target.value))}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            code.length === 6 &&
            !pending &&
            confirmEnrollment()
          }
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          aria-label="6-digit authenticator code"
          className="w-32 font-mono tracking-widest"
        />
        <Button
          onClick={confirmEnrollment}
          disabled={pending || code.length !== 6}
        >
          {pending ? "Verifying…" : "Verify and turn on"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setSetup(null);
            setCode("");
            setError("");
          }}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
