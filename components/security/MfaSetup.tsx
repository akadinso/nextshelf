"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  confirmMfaEnrollment,
  confirmPhoneMfaEnrollment,
  disableMfa,
  startMfaEnrollment,
  startPhoneMfaEnrollment,
} from "@/app/actions/security";

type MfaSetupProps = {
  enabledTotpFactorId: string | null;
  enabledPhoneFactor: { id: string; phone?: string | null } | null;
  defaultCountryCode?: string;
};

function normalizeCode(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export default function MfaSetup({
  enabledTotpFactorId,
  enabledPhoneFactor,
  defaultCountryCode = "+27",
}: MfaSetupProps) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // TOTP enrollment state
  const [totpSetup, setTotpSetup] = useState<{
    factorId: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [confirmOffFactorId, setConfirmOffFactorId] = useState<string | null>(
    null,
  );

  // SMS enrollment state
  const [smsOpen, setSmsOpen] = useState(false);
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [phone, setPhone] = useState("");
  const [smsChallenge, setSmsChallenge] = useState<{
    factorId: string;
    challengeId: string;
  } | null>(null);
  const [smsCode, setSmsCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const [error, setError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const cleanDigits = phone.replace(/^0+/, "").replace(/\D/g, "");
  const fullPhone = `${countryCode}${cleanDigits}`;
  const phoneValid = cleanDigits.length >= 8;

  function beginTotp() {
    setError("");
    setTotpCode("");
    start(async () => {
      const res = await startMfaEnrollment();
      if (!res.ok) return setError(res.error);
      setTotpSetup({ factorId: res.factorId, qr: res.qr, secret: res.secret });
    });
  }

  function confirmTotp() {
    if (!totpSetup) return;
    setError("");
    start(async () => {
      const res = await confirmMfaEnrollment(totpSetup.factorId, totpCode);
      if (!res.ok) return setError(res.error);
      setTotpSetup(null);
      setTotpCode("");
      router.refresh();
    });
  }

  function sendSmsSetup() {
    if (!phoneValid) return;
    setError("");
    start(async () => {
      const res = await startPhoneMfaEnrollment(fullPhone);
      if (!res.ok) return setError(res.error);
      setSmsChallenge({ factorId: res.factorId, challengeId: res.challengeId });
      setSmsCode("");
      setCooldown(30);
    });
  }

  function confirmSmsSetup() {
    if (!smsChallenge) return;
    setError("");
    start(async () => {
      const res = await confirmPhoneMfaEnrollment(
        smsChallenge.factorId,
        smsChallenge.challengeId,
        smsCode,
      );
      if (!res.ok) return setError(res.error);
      setSmsOpen(false);
      setSmsChallenge(null);
      setPhone("");
      setSmsCode("");
      router.refresh();
    });
  }

  function turnOff(factorId: string) {
    setError("");
    start(async () => {
      const res = await disableMfa(factorId);
      if (!res.ok) return setError(res.error);
      setConfirmOffFactorId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {/* Authenticator App (TOTP) */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Authenticator app</h3>
            <p className="text-xs text-muted-foreground">
              Use Google Authenticator, Microsoft Authenticator, or 1Password.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              enabledTotpFactorId
                ? "bg-green-100 text-green-800"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {enabledTotpFactorId ? "On" : "Off"}
          </span>
        </div>

        {enabledTotpFactorId ? (
          confirmOffFactorId === enabledTotpFactorId ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => turnOff(enabledTotpFactorId)}
                disabled={pending}
              >
                {pending ? "Turning off…" : "Yes, turn it off"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmOffFactorId(null)}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOffFactorId(enabledTotpFactorId)}
            >
              Turn off
            </Button>
          )
        ) : !totpSetup ? (
          <Button size="sm" onClick={beginTotp} disabled={pending}>
            {pending ? "Starting…" : "Set up authenticator app"}
          </Button>
        ) : (
          <div className="space-y-3 pt-1">
            <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Open your authenticator app and add a new account.</li>
              <li>Scan the QR code or enter the setup key below.</li>
              <li>Enter the 6-digit code shown in the app.</li>
            </ol>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={totpSetup.qr}
              alt="QR code to add this account to your authenticator app"
              className="h-40 w-40 rounded-lg border bg-white p-2"
            />
            <p className="break-all rounded-md bg-muted p-2 font-mono text-xs">
              {totpSetup.secret}
            </p>
            <div className="flex flex-wrap gap-2">
              <Input
                value={totpCode}
                onChange={(e) => setTotpCode(normalizeCode(e.target.value))}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  totpCode.length === 6 &&
                  !pending &&
                  confirmTotp()
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                aria-label="6-digit authenticator code"
                className="w-32 font-mono tracking-widest"
              />
              <Button
                size="sm"
                onClick={confirmTotp}
                disabled={pending || totpCode.length !== 6}
              >
                {pending ? "Verifying…" : "Verify and turn on"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTotpSetup(null);
                  setTotpCode("");
                  setError("");
                }}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Text Message (SMS) */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Text message (SMS)</h3>
            <p className="text-xs text-muted-foreground">
              {enabledPhoneFactor?.phone
                ? `Codes sent to ${enabledPhoneFactor.phone}`
                : "Receive a 6-digit sign-in code via SMS."}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              enabledPhoneFactor
                ? "bg-green-100 text-green-800"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {enabledPhoneFactor ? "On" : "Off"}
          </span>
        </div>

        {enabledPhoneFactor ? (
          confirmOffFactorId === enabledPhoneFactor.id ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => turnOff(enabledPhoneFactor.id)}
                disabled={pending}
              >
                {pending ? "Turning off…" : "Yes, turn it off"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmOffFactorId(null)}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOffFactorId(enabledPhoneFactor.id)}
            >
              Turn off
            </Button>
          )
        ) : !smsOpen ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError("");
              setSmsOpen(true);
            }}
          >
            Set up text message
          </Button>
        ) : !smsChallenge ? (
          <div className="space-y-3 pt-1">
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
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={sendSmsSetup}
                disabled={!phoneValid || pending}
              >
                {pending ? "Sending…" : "Send code"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSmsOpen(false);
                  setPhone("");
                  setError("");
                }}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code sent to{" "}
              <span className="font-medium text-foreground">{fullPhone}</span>.
            </p>
            <div className="flex flex-wrap gap-2">
              <Input
                value={smsCode}
                onChange={(e) => setSmsCode(normalizeCode(e.target.value))}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  smsCode.length === 6 &&
                  !pending &&
                  confirmSmsSetup()
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                aria-label="6-digit SMS verification code"
                className="w-32 font-mono tracking-widest"
              />
              <Button
                size="sm"
                onClick={confirmSmsSetup}
                disabled={pending || smsCode.length !== 6}
              >
                {pending ? "Verifying…" : "Verify and turn on"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSmsChallenge(null);
                  setSmsCode("");
                  setError("");
                }}
                disabled={pending}
              >
                Change number
              </Button>
            </div>
            <button
              type="button"
              className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
              disabled={cooldown > 0 || pending}
              onClick={sendSmsSetup}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
