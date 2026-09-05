"use client";

import { createClient } from "@/lib/supabase/client";
import { Bike, Eye, EyeOff, PawPrint } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message === "Invalid login credentials"
        ? "Correo o contraseña incorrectos. Intenta de nuevo."
        : signInError.message);
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
              Acceso al Dashboard
            </h1>
            <p className="mt-1 text-sm text-white/90">
              Ingresa con tu cuenta de administrador
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
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-bold text-slate-700"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@petmarket.com"
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none transition focus:border-[var(--ca-purple)] focus:ring-2 focus:ring-[var(--ca-purple)]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-bold text-slate-700"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-slate-800 outline-none transition focus:border-[var(--ca-purple)] focus:ring-2 focus:ring-[var(--ca-purple)]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 transition hover:text-[var(--ca-purple)]"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                  <PawPrint size={20} />
                  Ingresar
                </>
              )}
            </button>

            <Link
              href="/login-domiciliario"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              <Bike size={18} />
              Acceso domiciliario
            </Link>

            <p className="mt-4 space-y-1 text-center text-sm text-slate-500">
              <Link href="/recuperar-contrasena" className="block font-semibold text-[var(--ca-purple)] hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
              <Link href="/" className="block font-semibold text-[var(--ca-purple)] hover:underline">
                ← Volver al inicio
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
