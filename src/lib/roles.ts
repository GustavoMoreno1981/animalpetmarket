import { createAdminClient, createClient } from "@/lib/supabase/server";

export type Rol = "admin" | "vendedor" | "domiciliario";

export type Perfil = {
  id: string;
  user_id: string;
  rol: Rol;
  vendedor_id: string | null;
  domiciliario_id: string | null;
};

export type VendedorInfo = {
  id: string;
  nombre: string;
  email: string;
  porcentaje_comision: number;
};

export type DomiciliarioInfo = {
  id: string;
  nombre: string;
  placa: string;
  telefono: string;
};

export type DashboardContext = {
  userId: string;
  rol: Rol;
  vendedorId: string | null;
  vendedorInfo: VendedorInfo | null;
  domiciliarioId: string | null;
  domiciliarioInfo: DomiciliarioInfo | null;
};

/** Obtiene el contexto del dashboard (user, rol, vendedor, domiciliario). Redirige a login si no hay sesión. */
export async function getDashboardContext(): Promise<DashboardContext | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const perfil = await getPerfil(data.user.id);
  if (!perfil) return null;

  const admin = createAdminClient();
  let vendedorInfo: VendedorInfo | null = null;
  let domiciliarioInfo: DomiciliarioInfo | null = null;

  if (perfil.rol === "vendedor" && perfil.vendedor_id) {
    const { data: v } = await admin
      .from("vendedores")
      .select("id, nombre, email, porcentaje_comision")
      .eq("id", perfil.vendedor_id)
      .eq("activo", true)
      .single();
    vendedorInfo = v as VendedorInfo | null;
  }

  if (perfil.rol === "domiciliario" && perfil.domiciliario_id) {
    const { data: d } = await admin
      .from("domiciliarios")
      .select("id, nombre, placa, telefono")
      .eq("id", perfil.domiciliario_id)
      .eq("activo", true)
      .single();
    domiciliarioInfo = d as DomiciliarioInfo | null;
  }

  return {
    userId: data.user.id,
    rol: perfil.rol as Rol,
    vendedorId: perfil.vendedor_id,
    vendedorInfo,
    domiciliarioId: perfil.domiciliario_id,
    domiciliarioInfo,
  };
}

export async function requireDashboardRole(...allowedRoles: Rol[]) {
  const ctx = await getDashboardContext();
  if (!ctx) return { error: "No autorizado. Inicia sesión." };
  if (!allowedRoles.includes(ctx.rol)) {
    return { error: "No autorizado para realizar esta acción." };
  }
  return { ctx };
}

export async function requireAdminDashboard() {
  return requireDashboardRole("admin");
}

/** Obtiene el perfil del usuario. Si no existe, crea admin (primer usuario). */
export async function getPerfil(userId: string): Promise<Perfil | null> {
  const supabase = createAdminClient();

  let { data: perfil } = await supabase
    .from("perfiles")
    .select("id, user_id, rol, vendedor_id, domiciliario_id")
    .eq("user_id", userId)
    .single();

  if (!perfil) {
    const { count } = await supabase
      .from("perfiles")
      .select("*", { count: "exact", head: true });
    const esPrimerUsuario = (count ?? 0) === 0;
    if (esPrimerUsuario) {
      const { data: nuevo } = await supabase
        .from("perfiles")
        .insert({ user_id: userId, rol: "admin" })
        .select("id, user_id, rol, vendedor_id, domiciliario_id")
        .single();
      perfil = nuevo;
    }
  }

  return perfil as Perfil | null;
}

/** Obtiene el vendedor asociado al perfil (si rol=vendedor). */
export async function getVendedorByUserId(userId: string): Promise<VendedorInfo | null> {
  const supabase = createAdminClient();
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("vendedor_id")
    .eq("user_id", userId)
    .eq("rol", "vendedor")
    .single();

  if (!perfil?.vendedor_id) return null;

  const { data: vendedor } = await supabase
    .from("vendedores")
    .select("id, nombre, email, porcentaje_comision")
    .eq("id", perfil.vendedor_id)
    .eq("activo", true)
    .single();

  return vendedor as VendedorInfo | null;
}
