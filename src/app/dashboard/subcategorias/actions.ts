"use server";

import { isValidUUID, sanitizarTexto, validarLongitud } from "@/lib/validations";
import { createClient, requireAuth } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_NOMBRE = 100;

export type Subcategoria = {
  id: string;
  nombre: string;
  categoria_id: string;
  created_at: string;
  categorias?: { nombre: string } | null;
};

export async function crearSubcategoria(formData: FormData) {
  const auth = await requireAuth();
  if (auth.error) return auth;

  const nombre = formData.get("nombre") as string;
  const categoria_id = formData.get("categoria_id") as string;
  if (!nombre?.trim()) return { error: "El nombre es obligatorio" };
  if (!categoria_id) return { error: "Debes seleccionar una categoría" };
  const errNombre = validarLongitud(nombre, MAX_NOMBRE);
  if (errNombre) return { error: errNombre };
  if (!isValidUUID(categoria_id)) return { error: "Categoría inválida" };

  const supabase = await createClient();
  const { error } = await supabase.from("subcategorias").insert({
    nombre: sanitizarTexto(nombre, MAX_NOMBRE),
    categoria_id,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "Ya existe una subcategoría con ese nombre en esta categoría" };
    return { error: error.message };
  }

  revalidatePath("/dashboard/subcategorias");
  revalidatePath("/");
  return { success: true };
}

export async function actualizarSubcategoria(id: string, formData: FormData) {
  const auth = await requireAuth();
  if (auth.error) return auth;

  const nombre = formData.get("nombre") as string;
  const categoria_id = formData.get("categoria_id") as string;
  if (!nombre?.trim()) return { error: "El nombre es obligatorio" };
  if (!categoria_id) return { error: "Debes seleccionar una categoría" };
  const errNombre = validarLongitud(nombre, MAX_NOMBRE);
  if (errNombre) return { error: errNombre };
  if (!isValidUUID(categoria_id)) return { error: "Categoría inválida" };
  if (!isValidUUID(id)) return { error: "ID inválido" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("subcategorias")
    .update({ nombre: sanitizarTexto(nombre, MAX_NOMBRE), categoria_id })
    .eq("id", id);

  if (error) {
    if (error.code === "23505")
      return { error: "Ya existe una subcategoría con ese nombre en esta categoría" };
    return { error: error.message };
  }

  revalidatePath("/dashboard/subcategorias");
  revalidatePath("/");
  return { success: true };
}

export async function eliminarSubcategoria(id: string) {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (!isValidUUID(id)) return { error: "ID inválido" };

  const supabase = await createClient();
  const { count: productosCount, error: productosError } = await supabase
    .from("productos")
    .select("*", { count: "exact", head: true })
    .eq("subcategoria_id", id);
  if (productosError) return { error: productosError.message };
  if ((productosCount ?? 0) > 0) {
    return { error: "No puedes eliminar una subcategoría que todavía tiene productos asociados" };
  }

  const { error } = await supabase.from("subcategorias").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/subcategorias");
  revalidatePath("/");
  return { success: true };
}
