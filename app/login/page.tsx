import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { Button, Field, Input } from "@/components/ui";
import { hasSession } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await hasSession()) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl text-teal">Bitácora de ruta</h1>
      <p className="mt-1 mb-6 text-xs text-ink-soft">
        Esta bitácora es de un solo conductor.
      </p>

      <form action={login} className="border border-line bg-paper p-4">
        <Field label="Clave">
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </Field>
        {error ? (
          <p role="alert" className="mt-2 text-xs text-rust">
            Clave incorrecta.
          </p>
        ) : null}
        <Button type="submit" className="mt-4 w-full">
          Entrar
        </Button>
      </form>
    </main>
  );
}
