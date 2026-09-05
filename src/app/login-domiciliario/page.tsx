"use client";

import { createClient } from "@/lib/supabase/client";
import { placaToEmail } from "@/lib/domiciliario-auth";
import { Bike, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginDomiciliarioPage() {
  const [placa, setPlaca] = useState("");
  const [telefono, setTelefono] = useState("");
  const [showTelefono, setShowTelefono] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const email = placaToEmail(placa);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: telefono,
    });

    setLoading(false);

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Placa o teléfono incorrectos. Verifica tus datos."
          : signInError.message
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#ffeef7,transparent_42%),#fff7ef] px-4">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-[28px] border border-[#f3dcff] bg-white shadow-[0_22px_52px_rgba(123,31,162,0.12)]">
          <div className="bg-gradient-to-r from-[var(--ca-purple)] to-[#8e24aa] px-8 py-6 text-center">
            <Link href="/" className="inline-block">
              <img
                src="/logo-centro-animal.JPG"
                alt="Pet Market Animal"
                className="mx-auto h-16 w-auto rounded-full border-2 border-white object-cover shadow-lg"
              />
            </Link>
            <h1 className="mt-4 text-2xl font-black text-white">
              Acceso Domiciliarios
            </h1>
            <p className="mt-1 text-sm text-white/90">
              Ingresa con tu placa y teléfono
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="placa"
                  className="mb-1.5 block text-sm font-bold text-slate-700"
                >
                  Placa de la moto
                </label>
                <input
                  id="placa"
                  type="text"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none transition focus:border-[var(--ca-purple)] focus:ring-2 focus:ring-[var(--ca-purple)]/20 uppercase"
                />
              </div>

              <div>
                <label
                  htmlFor="telefono"
                  className="mb-1.5 block text-sm font-bold text-slate-700"
                >
                  Teléfono (contraseña)
                </label>
                <div className="relative">
                  <input
                    id="telefono"
                    type={showTelefono ? "text" : "password"}
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="3001234567"
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-slate-800 outline-none transition focus:border-[var(--ca-purple)] focus:ring-2 focus:ring-[var(--ca-purple)]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTelefono((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 transition hover:text-[var(--ca-purple)]"
                    aria-label={showTelefono ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showTelefono ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--ca-purple)] to-[#8e24aa] font-bold text-white shadow-lg shadow-purple-300/40 transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? (
                <span className="animate-pulse">Ingresando...</span>
              ) : (
                <>
                  <Bike size={20} />
                  Ingresar
                </>
              )}
            </button>

            <p className="mt-4 text-center text-sm text-slate-500">
              <Link href="/login" className="font-semibold text-[var(--ca-purple)] hover:underline">
                ← Volver al login admin
              </Link>
            </p>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Pet Market Animal © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
