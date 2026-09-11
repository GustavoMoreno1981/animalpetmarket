"use server";

import {
  isValidUUID,
  sanitizarTexto,
  validarLongitud,
  validarTelefono,
} from "@/lib/validations";
import { createAdminClient, requireAuth } from "@/lib/supabase/server";
import { getPerfil } from "@/lib/roles";
import { revalidatePath } from "next/cache";

const MAX_NOMBRE = 120;
const MAX_DIRECCION = 300;

export async function crearCliente(nombre: string, telefono: string, direccion: string | null) {
  const auth = await requireAuth();
  if (auth.error) return auth;

  if (!nombre?.trim()) return { error: "El nombre es obligatorio" };
  if (!telefono?.trim()) return { error: "El teléfono es obligatorio" };

  const errNombre = validarLongitud(nombre, MAX_NOMBRE);
  if (errNombre) return { error: `Nombre: ${errNombre}` };
  const errTel = validarTelefono(telefono);
  if (errTel) return { error: errTel };
  if (direccion?.trim()) {
    const errDir = validarLongitud(direccion, MAX_DIRECCION, 0);
    if (errDir) return { error: `Dirección: ${errDir}` };
  }

  const perfil = await getPerfil(auth.user!.id);
  const vendedorId = perfil?.rol === "vendedor" ? perfil.vendedor_id : null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      nombre: sanitizarTexto(nombre, MAX_NOMBRE),
      telefono: sanitizarTexto(telefono, 20),
      direccion: direccion?.trim() ? sanitizarTexto(direccion, MAX_DIRECCION) : null,
      vendedor_id: vendedorId,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Ya existe un cliente con ese teléfono" };
    return { error: error.message };
  }

  revalidatePath("/dashboard/clientes");
  return { success: true, id: data?.id };
}

export async function actualizarCliente(
  id: string,
  nombre: string,
  telefono: string,
  direccion: string | null
) {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (!isValidUUID(id)) return { error: "ID inválido" };

  if (!nombre?.trim()) return { error: "El nombre es obligatorio" };
  if (!telefono?.trim()) return { error: "El teléfono es obligatorio" };

  const errNombre = validarLongitud(nombre, MAX_NOMBRE);
  if (errNombre) return { error: `Nombre: ${errNombre}` };
  const errTel = validarTelefono(telefono);
  if (errTel) return { error: errTel };
  if (direccion?.trim()) {
    const errDir = validarLongitud(direccion, MAX_DIRECCION, 0);
    if (errDir) return { error: `Dirección: ${errDir}` };
  }

  const perfil = await getPerfil(auth.user!.id);
  const supabase = createAdminClient();
  let updateQuery = supabase
    .from("clientes")
    .update({
      nombre: sanitizarTexto(nombre, MAX_NOMBRE),
      telefono: sanitizarTexto(telefono, 20),
      direccion: direccion?.trim() ? sanitizarTexto(direccion, MAX_DIRECCION) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (perfil?.rol === "vendedor" && perfil.vendedor_id) {
    updateQuery = updateQuery.eq("vendedor_id", perfil.vendedor_id);
  }

  const { error } = await updateQuery;
  if (error) {
    if (error.code === "23505") return { error: "Ya existe un cliente con ese teléfono" };
    return { error: error.message };
  }

  revalidatePath("/dashboard/clientes");
  return { success: true };
}

const ESTADOS_BLOQUEAN_ELIMINAR = ["pendiente", "confirmado", "enviado", "despachado", "entregado"];

export async function eliminarCliente(id: string) {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (!isValidUUID(id)) return { error: "ID inválido" };

  const perfil = await getPerfil(auth.user!.id);
  const supabase = createAdminClient();

  let clienteQuery = supabase.from("clientes").select("id").eq("id", id);
  if (perfil?.rol === "vendedor" && perfil.vendedor_id) {
    clienteQuery = clienteQuery.eq("vendedor_id", perfil.vendedor_id);
  }
  const { data: cliente } = await clienteQuery.single();
  if (!cliente) return { error: "Cliente no encontrado o sin permiso" };

  const { data: pedidosActivos } = await supabase
    .from("pedidos")
    .select("id")
    .eq("cliente_id", id)
    .in("estado", ESTADOS_BLOQUEAN_ELIMINAR);

  if (pedidosActivos && pedidosActivos.length > 0) {
    return {
      error: "No se puede eliminar: el cliente tiene pedidos pendientes o despachados. Solo se puede eliminar si todos sus pedidos fueron rechazados o cancelados.",
    };
  }

  let deleteQuery = supabase.from("clientes").delete().eq("id", id);
  if (perfil?.rol === "vendedor" && perfil.vendedor_id) {
    deleteQuery = deleteQuery.eq("vendedor_id", perfil.vendedor_id);
  }
  const { error } = await deleteQuery;

  if (error) return { error: error.message };

  revalidatePath("/dashboard/clientes");
  return { success: true };
}
