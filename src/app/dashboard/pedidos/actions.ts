"use server";

import { isValidUUID } from "@/lib/validations";
import { requireAdminDashboard } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function marcarPendiente(pedidoId: string) {
  const admin = await requireAdminDashboard();
  if (admin.error) return admin;
  if (!isValidUUID(pedidoId)) return { error: "Pedido inválido" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ estado: "pendiente" })
    .eq("id", pedidoId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function marcarDespachado(
  pedidoId: string,
  total: number,
  domiciliarioId?: string | null
) {
  const admin = await requireAdminDashboard();
  if (admin.error) return admin;
  if (!isValidUUID(pedidoId)) return { error: "Pedido inválido" };

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("marcar_despachado_transaccional", {
    p_pedido_id: pedidoId,
    p_total: total,
    p_domiciliario_id: domiciliarioId && isValidUUID(domiciliarioId) ? domiciliarioId : null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard/productos");
  return { success: true };
}

export async function asignarDomiciliario(pedidoId: string, domiciliarioId: string | null) {
  const admin = await requireAdminDashboard();
  if (admin.error) return admin;
  if (!isValidUUID(pedidoId)) return { error: "Pedido inválido" };
  if (domiciliarioId && !isValidUUID(domiciliarioId)) return { error: "Domiciliario inválido" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ domiciliario_id: domiciliarioId || null })
    .eq("id", pedidoId)
    .in("estado", ["despachado", "pendiente", "confirmado", "enviado"]);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rechazarPedido(pedidoId: string) {
  const admin = await requireAdminDashboard();
  if (admin.error) return admin;
  if (!isValidUUID(pedidoId)) return { error: "Pedido inválido" };

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("rechazar_pedido_transaccional", {
    p_pedido_id: pedidoId,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard/productos");
  return { success: true };
}
