"use server";

import { isValidUUID, sanitizarTexto, validarLongitud } from "@/lib/validations";
import { requireAdminDashboard } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_NOMBRE = 100;
const MAX_IMAGEN_MB = 2;

export type Categoria = {
  id: string;
  nombre: string;
  imagen: string | null;
  created_at: string;
};

const BUCKET = "categoria-imagenes";

async function subirImagen(file: File): Promise<{ url: string; path: string } | { error: string }> {
  if (!file?.size) return { url: "", path: "" };
  if (file.size > MAX_IMAGEN_MB * 1024 * 1024) return { error: `La imagen no puede superar ${MAX_IMAGEN_MB} MB` };
  const tipos = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!tipos.includes(file.type)) return { error: "Formato de imagen no permitido (JPEG, PNG, WebP, GIF)" };
  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

function extraerPathDesdeUrlPublica(url: string | null | undefined) {
  if (!url) return null;
  const marcador = `/${BUCKET}/`;
  const idx = url.indexOf(marcador);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marcador.length));
}

async function eliminarImagenesSubidas(paths: string[]) {
  const pathsValidos = [...new Set(paths.filter(Boolean))];
  if (pathsValidos.length === 0) return;
  try {
    const supabase = createAdminClient();
    await supabase.storage.from(BUCKET).remove(pathsValidos);
  } catch {
    // No bloqueamos la respuesta si falla la limpieza del storage.
  }
}

export async function crearCategoria(formData: FormData) {
  const admin = await requireAdminDashboard();
  if (admin.error) return admin;

  const nombre = formData.get("nombre") as string;
  if (!nombre?.trim()) return { error: "El nombre es obligatorio" };
  const errNombre = validarLongitud(nombre, MAX_NOMBRE);
  if (errNombre) return { error: errNombre };

  const supabase = createAdminClient();
  const file = formData.get("imagen") as File | null;
  const uploadedImagePaths: string[] = [];
  let imagen: string | null = null;
  if (file?.size) {
    const res = await subirImagen(file);
    if ("error" in res) return { error: res.error };
    imagen = res.url || null;
    if (res.path) uploadedImagePaths.push(res.path);
  }

  const { error } = await supabase.from("categorias").insert({
    nombre: sanitizarTexto(nombre, MAX_NOMBRE),
    imagen,
  });

  if (error) {
    await eliminarImagenesSubidas(uploadedImagePaths);
    if (error.code === "23505") return { error: "Ya existe una categoría con ese nombre" };
    return { error: error.message };
  }

  revalidatePath("/dashboard/categorias");
  revalidatePath("/");
  return { success: true };
}

export async function actualizarCategoria(id: string, formData: FormData) {
  const admin = await requireAdminDashboard();
  if (admin.error) return admin;
  if (!isValidUUID(id)) return { error: "ID inválido" };

  const nombre = formData.get("nombre") as string;
  if (!nombre?.trim()) return { error: "El nombre es obligatorio" };
  const errNombre = validarLongitud(nombre, MAX_NOMBRE);
  if (errNombre) return { error: errNombre };

  const supabase = createAdminClient();
  const { data: categoriaActual, error: categoriaActualError } = await supabase
    .from("categorias")
    .select("imagen")
    .eq("id", id)
    .maybeSingle();
  if (categoriaActualError) return { error: categoriaActualError.message };

  const file = formData.get("imagen") as File | null;
  const quitarFoto = formData.get("quitar_foto") === "1";
  const uploadedImagePaths: string[] = [];
  let imagen: string | null | undefined;
  if (quitarFoto) {
    imagen = null;
  } else if (file?.size) {
    const res = await subirImagen(file);
    if ("error" in res) return { error: res.error };
    imagen = res.url;
    if (res.path) uploadedImagePaths.push(res.path);
  }

  const update: { nombre: string; imagen?: string | null } = { nombre: sanitizarTexto(nombre, MAX_NOMBRE) };
  if (imagen !== undefined) update.imagen = imagen;

  const { error } = await supabase
    .from("categorias")
    .update(update)
    .eq("id", id);

  if (error) {
    await eliminarImagenesSubidas(uploadedImagePaths);
    if (error.code === "23505") return { error: "Ya existe una categoría con ese nombre" };
    return { error: error.message };
  }

  const oldImagePath = extraerPathDesdeUrlPublica(categoriaActual?.imagen);
  const newImagePath = extraerPathDesdeUrlPublica(imagen);
  if (imagen !== undefined && oldImagePath && oldImagePath !== newImagePath) {
    await eliminarImagenesSubidas([oldImagePath]);
  }

  revalidatePath("/dashboard/categorias");
  revalidatePath("/");
  return { success: true };
}

export async function eliminarCategoria(id: string) {
  const admin = await requireAdminDashboard();
  if (admin.error) return admin;
  if (!isValidUUID(id)) return { error: "ID inválido" };

  const supabase = createAdminClient();
  const { count: subcategoriasCount, error: subcategoriasError } = await supabase
    .from("subcategorias")
    .select("*", { count: "exact", head: true })
    .eq("categoria_id", id);
  if (subcategoriasError) return { error: subcategoriasError.message };
  if ((subcategoriasCount ?? 0) > 0) {
    return { error: "No puedes eliminar una categoría que todavía tiene subcategorías asociadas" };
  }

  const { error } = await supabase.from("categorias").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/categorias");
  revalidatePath("/");
  return { success: true };
}
