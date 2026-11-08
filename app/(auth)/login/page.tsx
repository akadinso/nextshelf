import Link from 'next/link'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SITE } from '@/lib/site'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>
}) {
  const { error, message, next } = await searchParams

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Log in to your {SITE.name} account.</p>

      {error && <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {message && <p className="mt-4 rounded-md bg-muted p-3 text-sm">{message}</p>}

      <form action={login} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next ?? '/'} />
        <Input name="email" type="email" placeholder="Email" autoComplete="email" required />
        <Input name="password" type="password" placeholder="Password" autoComplete="current-password" required />
        <Button type="submit" className="w-full">
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/signup" className="font-medium text-foreground hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
