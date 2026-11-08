import Link from 'next/link'
import { signup } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">It only takes a minute.</p>

      {error && <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <form action={signup} className="mt-6 space-y-4">
        <Input name="full_name" placeholder="Full name" autoComplete="name" required />
        <Input name="email" type="email" placeholder="Email" autoComplete="email" required />
        <Input
          name="password"
          type="password"
          placeholder="Password (min 8 characters)"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Button type="submit" className="w-full">
          Sign up
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
