"use server";

import { isValidUUID, validarFecha, validarNumero } from "@/lib/validations";
import { resolverIvaPorcentaje } from "@/lib/iva";
import { requireAdminDashboard } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** Crea presentación "Principal" para productos que no tienen ninguna (para que aparezcan en inventario). */
export async function asegurarPresentacionesPrincipales() {
  const supabase = createAdminClient();
  const { data: productos } = await supabase
    .from("productos")
    .select("id, precio, aplica_iva, iva_porcentaje, porcentaje_oferta");
  const { data: presentaciones } = await supabase
    .from("producto_presentaciones")
    .select("producto_id");
  const idsConPresentacion = new Set((presentaciones ?? []).map((p) => p.producto_id));
  const productosSinPresentacion = (productos ?? []).filter((p) => !idsConPresentacion.has(p.id));
  for (const prod of productosSinPresentacion) {
    const precio = typeof prod.precio === "string" ? parseFloat(prod.precio) : Number(prod.precio);
    const ivaPorcentaje = resolverIvaPorcentaje({
      ivaPorcentaje: (prod as { iva_porcentaje?: number | null }).iva_porcentaje,
      aplicaIva: (prod as { aplica_iva?: boolean }).aplica_iva,
    });
    const porcentajeOferta = (prod as { porcentaje_oferta?: number | null }).porcentaje_oferta;
    await supabase.from("producto_presentaciones").insert({
      producto_id: prod.id,
      nombre: "Principal",
      imagen: null,
      precio,
      aplica_iva: ivaPorcentaje > 0,
      iva_porcentaje: ivaPorcentaje,
      porcentaje_oferta: porcentajeOferta != null && porcentajeOferta >= 1 && porcentajeOferta <= 99 ? porcentajeOferta : null,
      orden: 0,
    });
  }
}

const MAX_CANTIDAD = 999999;

export async function darSalidaLote(loteId: string, cantidad: number) {
  const admin = await requireAdminDashboard();
  if (admin.error) return admin;

  if (!isValidUUID(loteId)) return { error: "Lote inválido" };
  const errCant = validarNumero(cantidad, 1, MAX_CANTIDAD, "La cantidad");
  if (errCant) return { error: errCant };

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("dar_salida_lote_transaccional", {
    p_lote_id: loteId,
    p_cantidad: cantidad,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function agregarLote(
  productoPresentacionId: string,
  cantidad: number,
  fechaVencimiento: string
) {
  const admin = await requireAdminDashboard();
  if (admin.error) return admin;

  if (!cantidad || cantidad < 1) return { error: "La cantidad debe ser mayor a 0" };
  if (!fechaVencimiento) return { error: "La fecha de vencimiento es obligatoria" };

  const errCant = validarNumero(cantidad, 1, MAX_CANTIDAD, "La cantidad");
  if (errCant) return { error: errCant };
  const errFecha = validarFecha(fechaVencimiento);
  if (errFecha) return { error: errFecha };
  if (!isValidUUID(productoPresentacionId)) return { error: "Presentación inválida" };

  const supabase = createAdminClient();
  const { data: inserted, error } = await supabase
    .from("inventario_lotes")
    .insert({
      producto_presentacion_id: productoPresentacionId,
      lote: "AUTO",
      cantidad,
      fecha_vencimiento: fechaVencimiento,
    })
    .select("id, lote, created_at")
    .single();
  if (error) return { error: error.message };

  if (inserted?.lote === "AUTO") {
    const fechaIngreso = (inserted.created_at as string).slice(0, 10).replace(/-/g, "");
    const fechaVenc = fechaVencimiento.replace(/-/g, "");
    const suf = Date.now().toString(36).slice(-4).toUpperCase();
    const codigo = `ING-${fechaIngreso}-${cantidad}-VENC-${fechaVenc}-${suf}`;
    const { error: renameError } = await supabase
      .from("inventario_lotes")
      .update({ lote: codigo })
      .eq("id", inserted.id);
    if (renameError) return { error: renameError.message };
  }
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard");
  return { success: true };
}
