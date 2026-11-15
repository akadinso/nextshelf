# Security notes

How this shop maps to the NSA's guidance, and what you still have to switch on.
Sources: NSA, "NSA's Top Ten Cybersecurity Mitigation Strategies" (2018) and the NSA/CISA cloud identity and access management and log management guidance (2024).
This is not a compliance certificate. Those documents are written for large organisations, so only the parts that apply to a web shop are used here, and a few are handled by your hosting provider.

## What the code does

| NSA mitigation | In this shop |
|---|---|
| Update and upgrade software immediately | `.github/dependabot.yml` opens weekly pull requests for outdated or vulnerable packages. Run `npm audit` before each release. |
| Defend privileges and accounts | Row Level Security on every table. A customer cannot change their own role. Every admin page and admin action re-checks the admin role on the server. Admins must turn on two-step verification (`requireAdminMfa` in `lib/site.ts`). Changing the email or password needs the current password. After 5 wrong attempts in 15 minutes these changes are blocked for a while. Changing the password signs out all other devices. |
| Multi-factor authentication | Authenticator-app (TOTP) two-step verification for any customer. It is enforced on every protected page, every server action, and the checkout API once enabled. |
| Exploit protection | Security headers (CSP, anti-framing, no content sniffing, referrer and permissions policies, HSTS) in `next.config.ts`. Inputs are validated on the server with length limits. The checkout API only accepts requests from our own site (CSRF defence). The `next` redirect check now blocks the `/\evil.com` trick. |
| Continuously hunt for intrusions (and cloud log management) | `security_events` records sign-ins, password and email changes, two-step changes and failed re-authentication. Customers can see their own trail under Account, then Security. Only the server can write to it, so a thief cannot erase their tracks. |
| Actively manage systems and configurations | Secrets live in environment variables. The service-role key is server-only (`server-only` import). See the Supabase checklist below. |

Not applicable at code level: signed software execution, modern hardware security features, network segmentation and threat reputation services. Your hosting providers (Vercel and Supabase) handle those layers.

## Supabase settings you must check (Dashboard, Authentication)

- [ ] **Confirm email** is ON (Sign In / Providers, Email). If it is off, every account counts as verified.
- [ ] **Secure email change** is ON, so both the old and new inbox must confirm.
- [ ] **Secure password change** is ON (requires a recent sign-in to change the password).
- [ ] **Multi-factor authentication (TOTP)** is enabled.
- [ ] **Leaked password protection** is ON (Supabase Pro plan). It rejects passwords found in known breaches.
- [ ] **Session time-box and inactivity timeout** set to something sensible (Supabase Pro plan).
- [ ] **CAPTCHA protection** for sign-up and sign-in, if you see bot sign-ups.
- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY` out of any `NEXT_PUBLIC_` variable and out of git.

## Before launch

- Add `CSP_MODE=report-only` for your first deploy if you want to see whether the CSP blocks anything, then remove it.
- Run `006_security.sql`. Optionally enable `pg_cron` and schedule the 180-day clean-up at the bottom of that file.
- The security log stores each sign-in's IP address and browser for 180 days. Mention this in your privacy policy (POPIA).
- Back up your database (Supabase backups) and test restoring one.
