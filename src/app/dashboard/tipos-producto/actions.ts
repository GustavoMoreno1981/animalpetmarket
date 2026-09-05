"use server";

import { isValidUUID, sanitizarTexto, validarLongitud } from "@/lib/validations";
import { createClient, requireAuth } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_NOMBRE = 100;

export type TipoProducto = {
  id: string;
  nombre: string;
  subcategoria_id: string;
  created_at: string;
  subcategorias?: {
    nombre: string;
    categorias?: { nombre: string } | null;
  } | null;
  productos?: { count: number }[] | null;
};

async function contarProductosPorTipo(supabase: Awaited<ReturnType<typeof createClient>>, tipoProductoId: string) {
  const { count, error } = await supabase
    .from("productos")
    .select("*", { count: "exact", head: true })
    .eq("tipo_producto_id", tipoProductoId);

  if (error) return { error: error.message };
  return { count: count ?? 0 };
}

export async function crearTipoProducto(formData: FormData) {
  const auth = await requireAuth();
  if (auth.error) return auth;

  const nombre = formData.get("nombre") as string;
  const subcategoria_id = formData.get("subcategoria_id") as string;

  if (!nombre?.trim()) return { error: "El nombre es obligatorio" };
  if (!subcategoria_id) return { error: "Debes seleccionar una subcategoría" };
  const errNombre = validarLongitud(nombre, MAX_NOMBRE);
  if (errNombre) return { error: errNombre };
  if (!isValidUUID(subcategoria_id)) return { error: "Subcategoría inválida" };

  const supabase = await createClient();
  const { error } = await supabase.from("tipos_producto").insert({
    nombre: sanitizarTexto(nombre, MAX_NOMBRE),
    subcategoria_id,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un tipo de producto con ese nombre en esta subcategoría" };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/tipos-producto");
  revalidatePath("/dashboard/productos");
  revalidatePath("/");
  return { success: true };
}

export async function actualizarTipoProducto(id: string, formData: FormData) {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (!isValidUUID(id)) return { error: "ID inválido" };

  const nombre = formData.get("nombre") as string;
  const subcategoria_id = formData.get("subcategoria_id") as string;

  if (!nombre?.trim()) return { error: "El nombre es obligatorio" };
  if (!subcategoria_id) return { error: "Debes seleccionar una subcategoría" };
  const errNombre = validarLongitud(nombre, MAX_NOMBRE);
  if (errNombre) return { error: errNombre };
  if (!isValidUUID(subcategoria_id)) return { error: "Subcategoría inválida" };

  const supabase = await createClient();
  const { data: actual, error: errActual } = await supabase
    .from("tipos_producto")
    .select("subcategoria_id")
    .eq("id", id)
    .maybeSingle();

  if (errActual) return { error: errActual.message };
  if (!actual) return { error: "Tipo de producto no encontrado" };

  if (actual.subcategoria_id !== subcategoria_id) {
    const conteo = await contarProductosPorTipo(supabase, id);
    if ("error" in conteo) return conteo;
    if ((conteo.count ?? 0) > 0) {
      return {
        error:
          "No puedes mover este tipo de producto a otra subcategoría porque ya tiene productos asociados. Reasígnalos primero.",
      };
    }
  }

  const { error } = await supabase
    .from("tipos_producto")
    .update({
      nombre: sanitizarTexto(nombre, MAX_NOMBRE),
      subcategoria_id,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un tipo de producto con ese nombre en esta subcategoría" };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/tipos-producto");
  revalidatePath("/dashboard/productos");
  revalidatePath("/");
  return { success: true };
}

export async function eliminarTipoProducto(id: string) {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (!isValidUUID(id)) return { error: "ID inválido" };

  const supabase = await createClient();
  const { data: tipo, error: errTipo } = await supabase
    .from("tipos_producto")
    .select("id, nombre")
    .eq("id", id)
    .maybeSingle();

  if (errTipo) return { error: errTipo.message };
  if (!tipo) return { error: "Tipo de producto no encontrado" };
  if (tipo.nombre === "General") {
    return { error: "El tipo General no se puede eliminar porque protege la migración del catálogo existente" };
  }

  const conteo = await contarProductosPorTipo(supabase, id);
  if ("error" in conteo) return conteo;
  if ((conteo.count ?? 0) > 0) {
    return { error: "No puedes eliminar un tipo de producto que todavía tiene productos asociados" };
  }

  const { error } = await supabase.from("tipos_producto").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/tipos-producto");
  revalidatePath("/dashboard/productos");
  revalidatePath("/");
  return { success: true };
}
