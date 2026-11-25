import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAal, getUser } from "@/lib/auth";
import { safeNext } from "@/lib/format";
import { LoginMfaForm } from "@/components/login-mfa";

function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `+${digits.slice(0, -4).replace(/\d/g, "•")} ${digits.slice(-4, -2)}•• ${digits.slice(-2)}`;
}

export default async function LoginMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login");

  // Nothing to do if this session does not need (or already passed) the second step
  const aal = await getAal();
  if (!(aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2")) {
    redirect(safeNext(next));
  }

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasTotp = Boolean(factors?.totp?.length);
  const phoneFactor = factors?.phone?.[0] as
    | { phone?: string | null }
    | undefined;
  const maskedPhone = maskPhone(phoneFactor?.phone ?? user.phone);

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Two-step verification</h1>
      <LoginMfaForm
        next={safeNext(next)}
        initialError={error}
        hasTotp={hasTotp}
        maskedPhone={maskedPhone}
      />
    </div>
  );
}
