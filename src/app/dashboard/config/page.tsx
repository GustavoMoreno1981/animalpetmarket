import { createAdminClient, createClient } from "@/lib/supabase/server";
import { ConfigClient } from "./ConfigClient";

export default async function ConfigPage() {
  const [config, userEmail] = await Promise.all([
    (async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("configuracion")
        .select("nombre_tienda, telefono, whatsapp, email, direccion, facebook_url, instagram_url, valor_domicilio_base, domicilio_gratis_activo")
        .eq("id", 1)
        .maybeSingle();
      return data;
    })(),
    (async () => {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      return data.user?.email ?? null;
    })(),
  ]);

  return <ConfigClient config={config} userEmail={userEmail} />;
}
