import { createAdminClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

export type ConfigData = {
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

const DEFAULTS: ConfigData = {
  nombre_tienda: "Pet Market Animal",
  telefono: "311 234 5678",
  whatsapp: null,
  email: "info@petmarket.com",
  direccion: "Barrancabermeja, Colombia",
  facebook_url: "https://facebook.com",
  instagram_url: "https://instagram.com",
  valor_domicilio_base: 0,
  domicilio_gratis_activo: false,
};

export async function getConfiguracion(): Promise<ConfigData> {
  try {
    noStore();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("configuracion")
      .select("nombre_tienda, telefono, whatsapp, email, direccion, facebook_url, instagram_url, valor_domicilio_base, domicilio_gratis_activo")
      .eq("id", 1)
      .single();

    if (error || !data) return DEFAULTS;

    return {
      nombre_tienda: data.nombre_tienda ?? DEFAULTS.nombre_tienda,
      telefono: data.telefono ?? DEFAULTS.telefono,
      whatsapp: data.whatsapp ?? DEFAULTS.whatsapp,
      email: data.email ?? DEFAULTS.email,
      direccion: data.direccion ?? DEFAULTS.direccion,
      facebook_url: data.facebook_url ?? DEFAULTS.facebook_url,
      instagram_url: data.instagram_url ?? DEFAULTS.instagram_url,
      valor_domicilio_base:
        data.valor_domicilio_base == null
          ? DEFAULTS.valor_domicilio_base
          : typeof data.valor_domicilio_base === "string"
            ? Number.parseFloat(data.valor_domicilio_base)
            : Number(data.valor_domicilio_base),
      domicilio_gratis_activo: Boolean(data.domicilio_gratis_activo),
    };
  } catch {
    return DEFAULTS;
  }
}

/** Número de WhatsApp a usar: config > env > fallback (solo dígitos para wa.me) */
export function getWhatsappNum(config: ConfigData | null): string {
  const fromConfig = config?.whatsapp?.trim().replace(/\D/g, "");
  if (fromConfig && fromConfig.length >= 10) return fromConfig;
  const fromEnv = process.env.NEXT_PUBLIC_WHATSAPP_NUM;
  if (fromEnv?.trim()) return fromEnv.trim().replace(/\D/g, "") || "573001234567";
  return "573001234567";
}
