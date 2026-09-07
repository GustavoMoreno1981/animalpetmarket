"use client";

import { guardarConfiguracion } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Mail, Settings } from "lucide-react";
import { useState } from "react";

type ConfigData = {
  nombre_tienda: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  direccion: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  valor_domicilio_base: number | null;
  domicilio_gratis_activo: boolean;
};

const EMPTY_CONFIG: ConfigData = {
  nombre_tienda: null,
  telefono: null,
  whatsapp: null,
  email: null,
  direccion: null,
  facebook_url: null,
  instagram_url: null,
  valor_domicilio_base: 0,
  domicilio_gratis_activo: false,
};

export function ConfigClient({
  config,
  userEmail,
}: {
  config: ConfigData | null;
  userEmail: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [recuperarEmail, setRecuperarEmail] = useState(userEmail ?? "");
  const [recuperarLoading, setRecuperarLoading] = useState(false);
  const [recuperarError, setRecuperarError] = useState<string | null>(null);
  const [recuperarEnviado, setRecuperarEnviado] = useState(false);

  const c = config ?? EMPTY_CONFIG;

  async function handleRecuperarContrasena(e: React.FormEvent) {
    e.preventDefault();
    setRecuperarError(null);
    setRecuperarEnviado(false);
    if (!recuperarEmail.trim()) {
      setRecuperarError("Ingresa tu correo electrónico");
      return;
    }
    setRecuperarLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      recuperarEmail.trim(),
      { redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password` }
    );
    setRecuperarLoading(false);
    if (resetError) {
      setRecuperarError(resetError.message);
      return;
    }
    setRecuperarEnviado(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await guardarConfiguracion(formData);
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setSuccess(true);
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-black text-[var(--ca-purple)]">
          <Settings size={28} />
          Configuración
        </h1>
      </div>
      <p className="mb-6 text-slate-600">
        Ajusta los datos de contacto, redes sociales y el valor base del domicilio. Estos datos se usarán en la tienda y en los pedidos.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            Configuración guardada correctamente.
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="nombre_tienda" className="mb-1 block text-sm font-medium text-slate-700">
              Nombre de la tienda
            </label>
            <input
              id="nombre_tienda"
              name="nombre_tienda"
              type="text"
              defaultValue={c.nombre_tienda ?? ""}
              placeholder="Pet Market Animal"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--ca-purple)] focus:outline-none focus:ring-1 focus:ring-[var(--ca-purple)]"
            />
          </div>

          <div>
            <label htmlFor="telefono" className="mb-1 block text-sm font-medium text-slate-700">
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              type="text"
              defaultValue={c.telefono ?? ""}
              placeholder="311 234 5678"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--ca-purple)] focus:outline-none focus:ring-1 focus:ring-[var(--ca-purple)]"
            />
          </div>

          <div>
            <label htmlFor="whatsapp" className="mb-1 block text-sm font-medium text-slate-700">
              WhatsApp (número con código país, ej: 573001234567)
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="text"
              defaultValue={c.whatsapp ?? ""}
              placeholder="573001234567"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--ca-purple)] focus:outline-none focus:ring-1 focus:ring-[var(--ca-purple)]"
            />
            <p className="mt-1 text-xs text-slate-500">
              Si está vacío, se usará NEXT_PUBLIC_WHATSAPP_NUM del .env
            </p>
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={c.email ?? ""}
              placeholder="info@petmarket.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--ca-purple)] focus:outline-none focus:ring-1 focus:ring-[var(--ca-purple)]"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="direccion" className="mb-1 block text-sm font-medium text-slate-700">
              Dirección
            </label>
            <input
              id="direccion"
              name="direccion"
              type="text"
              defaultValue={c.direccion ?? ""}
              placeholder="Barrancabermeja, Colombia"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--ca-purple)] focus:outline-none focus:ring-1 focus:ring-[var(--ca-purple)]"
            />
          </div>

          <div>
            <label htmlFor="valor_domicilio_base" className="mb-1 block text-sm font-medium text-slate-700">
              Valor base del domicilio
            </label>
            <input
              id="valor_domicilio_base"
              name="valor_domicilio_base"
              type="number"
              min="0"
              step="100"
              defaultValue={c.valor_domicilio_base ?? 0}
              placeholder="0"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--ca-purple)] focus:outline-none focus:ring-1 focus:ring-[var(--ca-purple)]"
            />
            <p className="mt-1 text-xs text-slate-500">
              Este es el costo real que quedará guardado en cada pedido nuevo.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
            <input
              id="domicilio_gratis_activo"
              name="domicilio_gratis_activo"
              type="checkbox"
              defaultChecked={Boolean(c.domicilio_gratis_activo)}
              className="h-4 w-4 rounded border-slate-300 text-[var(--ca-purple)] focus:ring-[var(--ca-purple)]"
            />
            <div>
              <label htmlFor="domicilio_gratis_activo" className="block text-sm font-medium text-slate-700">
                Domicilio gratis por defecto para el cliente
              </label>
              <p className="text-xs text-slate-500">
                Si está activo, el cliente verá “Gratis”, pero el pedido guardará el costo interno real del domicilio.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="facebook_url" className="mb-1 block text-sm font-medium text-slate-700">
              Facebook (URL)
            </label>
            <input
              id="facebook_url"
              name="facebook_url"
              type="url"
              defaultValue={c.facebook_url ?? ""}
              placeholder="https://facebook.com/tu-pagina"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--ca-purple)] focus:outline-none focus:ring-1 focus:ring-[var(--ca-purple)]"
            />
          </div>

          <div>
            <label htmlFor="instagram_url" className="mb-1 block text-sm font-medium text-slate-700">
              Instagram (URL)
            </label>
            <input
              id="instagram_url"
              name="instagram_url"
              type="url"
              defaultValue={c.instagram_url ?? ""}
              placeholder="https://instagram.com/tu-cuenta"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--ca-purple)] focus:outline-none focus:ring-1 focus:ring-[var(--ca-purple)]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[var(--ca-purple)] px-6 py-3 font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Guardando…" : "Guardar configuración"}
          </button>
        </div>
      </form>

      <hr className="my-10 border-slate-200" />

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-[var(--ca-purple)]">
          <KeyRound size={22} />
          Recuperación de contraseña
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Si olvidaste tu contraseña, te enviaremos un enlace a tu correo para restablecerla.
        </p>
        <form onSubmit={handleRecuperarContrasena} className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="recuperar_email" className="mb-1 block text-sm font-medium text-slate-700">
              Correo electrónico
            </label>
            <input
              id="recuperar_email"
              type="email"
              value={recuperarEmail}
              onChange={(e) => setRecuperarEmail(e.target.value)}
              placeholder="admin@petmarket.com"
              className="flex w-full items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--ca-purple)] focus:outline-none focus:ring-1 focus:ring-[var(--ca-purple)]"
            />
          </div>
          <button
            type="submit"
            disabled={recuperarLoading}
            className="flex items-center gap-2 rounded-xl border-2 border-[var(--ca-purple)] bg-[var(--ca-purple)]/10 px-6 py-2.5 font-bold text-[var(--ca-purple)] transition hover:bg-[var(--ca-purple)]/20 disabled:opacity-60"
          >
            <Mail size={18} />
            {recuperarLoading ? "Enviando…" : "Enviar enlace de recuperación"}
          </button>
        </form>
        {recuperarError && (
          <p className="mt-2 text-sm text-red-600">{recuperarError}</p>
        )}
        {recuperarEnviado && (
          <p className="mt-2 text-sm font-medium text-green-600">
            Revisa tu correo. Te enviamos un enlace para restablecer tu contraseña.
          </p>
        )}
      </section>
    </div>
  );
}
