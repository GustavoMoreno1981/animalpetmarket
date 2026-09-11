"use server";

import { isValidUUID } from "@/lib/validations";
import { requireAdminDashboard } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generarCodigo6(): string {
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => CARACTERES[b % CARACTERES.length]).join("");
}

export async function crearCupon(porcentaje: number, validoHasta: string | null) {
  const admin = await requireAdminDashboard();
  if (admin.error) return admin;

  if (porcentaje < 1 || porcentaje > 99) {
    return { error: "El porcentaje debe estar entre 1 y 99" };
  }

  const supabase = createAdminClient();

  let codigo = generarCodigo6();
  let intentos = 0;
  const maxIntentos = 10;
  while (intentos < maxIntentos) {
    const { data: existente } = await supabase
      .from("cupones")
      .select("id")
      .eq("codigo", codigo)
      .single();
    if (!existente) break;
    codigo = generarCodigo6();
    intentos++;
  }
  if (intentos >= maxIntentos) {
    return { error: "No se pudo generar un código único. Intenta de nuevo." };
  }

  const insert: { codigo: string; porcentaje: number; valido_hasta?: string | null } = {
    codigo,
    porcentaje,
  };
  if (validoHasta?.trim()) {
    const match = validoHasta.trim().match(/^\d{4}-\d{2}-\d{2}$/);
    if (match) insert.valido_hasta = validoHasta.trim();
  }

  const { data, error } = await supabase
    .from("cupones")
    .insert(insert)
    .select("id, codigo, porcentaje, valido_hasta")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/cupones");
  return { success: true, cupon: data };
}

export async function eliminarCupon(id: string) {
  const admin = await requireAdminDashboard();
  if (admin.error) return admin;
  if (!isValidUUID(id)) return { error: "ID de cupón inválido" };

  const supabase = createAdminClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data: cupon, error: errorConsulta } = await supabase
    .from("cupones")
    .select("id, usado, valido_hasta")
    .eq("id", id)
    .maybeSingle();

  if (errorConsulta) return { error: errorConsulta.message };
  if (!cupon) return { error: "Cupón no encontrado" };

  const expirado = Boolean(cupon.valido_hasta && cupon.valido_hasta < hoy);
  const disponible = !cupon.usado && !expirado;
  if (disponible) {
    return { error: "Solo se pueden eliminar cupones no disponibles" };
  }

  const { error } = await supabase.from("cupones").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/cupones");
  return { success: true };
}
