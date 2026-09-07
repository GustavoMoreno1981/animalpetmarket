"use server";

import {
  isValidUUID,
  sanitizarTexto,
  validarLongitud,
  validarNumero,
} from "@/lib/validations";
import { IVA_OPCIONES, IVA_POR_DEFECTO } from "@/lib/iva";
import { createAdminClient, createClient, requireAuth } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const BUCKET = "producto-imagenes";
const MAX_NOMBRE = 200;
const MAX_DESCRIPCION = 2000;
const MAX_PRECIO = 999999999;
const MAX_PRESENTACION_NOMBRE = 200;
const MAX_IMAGEN_MB = 5;

export type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number | string;
  imagen: string | null;
  subcategoria_id: string;
  tipo_producto_id: string;
  subcategoria_ids?: string[];
  peso: number | null;
  dimensiones: string | null;
  requiere_refrigeracion: boolean;
  producto_fragil: boolean;
  destacado: boolean;
  nuevo: boolean;
  mas_vendido: boolean;
  recomendado: boolean;
  porcentaje_oferta?: number | null;
  aplica_iva?: boolean | null;
  iva_porcentaje?: number | null;
  secciones_activas: string[];
  datos_medicamento: Record<string, unknown> | null;
  datos_alimento: Record<string, unknown> | null;
  datos_juguete: Record<string, unknown> | null;
  created_at: string;
};

export type ProductoPresentacion = {
  id: string;
  producto_id?: string;
  nombre: string;
  imagen: string | null;
  precio: number | null;
  orden: number;
  porcentaje_oferta?: number | null;
  aplica_iva?: boolean | null;
  iva_porcentaje?: number | null;
};

type PresentacionFormInput = {
  id?: string;
  nombre: string;
  imagen: string | null;
  precio: number | null;
  orden: number;
  porcentaje_oferta: number | null;
  aplica_iva: boolean;
  iva_porcentaje: number;
};

type ProductoPresentacionSnapshot = {
  id: string;
  nombre: string;
  imagen: string | null;
  precio: number | null;
  orden: number;
  porcentaje_oferta: number | null;
  aplica_iva: boolean | null;
  iva_porcentaje: number | null;
  created_at?: string;
};

type ProductoUpdateSnapshot = {
  producto: {
    nombre: string;
    descripcion: string | null;
    precio: number | string;
    aplica_iva: boolean | null;
    iva_porcentaje: number | null;
    imagen: string | null;
    subcategoria_id: string;
    tipo_producto_id: string;
    porcentaje_oferta: number | null;
    peso: number | null;
    dimensiones: string | null;
    requiere_refrigeracion: boolean;
    producto_fragil: boolean;
    destacado: boolean;
    nuevo: boolean;
    mas_vendido: boolean;
    recomendado: boolean;
    secciones_activas: string[] | null;
    datos_medicamento: Record<string, unknown> | null;
    datos_alimento: Record<string, unknown> | null;
    datos_juguete: Record<string, unknown> | null;
  };
  subcategoriaIds: string[];
  presentaciones: ProductoPresentacionSnapshot[];
};

async function subirImagen(
  file: File
): Promise<{ url: string; path: string } | { error: string }> {
  if (!file?.size) return { url: "", path: "" };
  if (file.size > MAX_IMAGEN_MB * 1024 * 1024) return { error: `La imagen no puede superar ${MAX_IMAGEN_MB} MB` };
  const tipos = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!tipos.includes(file.type)) return { error: "Formato de imagen no permitido (JPEG, PNG, WebP, GIF)" };
  if (!process.env.SUPABASE_SECRET_KEY) {
    return { error: "Configura SUPABASE_SECRET_KEY en .env.local para subir im?genes" };
  }
  try {
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
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al subir imagen" };
  }
}

async function eliminarImagenesSubidas(paths: string[]) {
  const pathsValidos = [...new Set(paths.filter(Boolean))];
  if (pathsValidos.length === 0) return;

  try {
    const supabase = createAdminClient();
    await supabase.storage.from(BUCKET).remove(pathsValidos);
  } catch {
    // Si falla la limpieza de storage no bloqueamos la respuesta al usuario.
  }
}

function extraerPathDesdeUrlPublica(url: string | null | undefined) {
  if (!url) return null;
  const marcador = `/${BUCKET}/`;
  const idx = url.indexOf(marcador);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marcador.length));
}

async function revertirCreacionProducto(productoId: string, uploadedImagePaths: string[]) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("productos").delete().eq("id", productoId);
    if (error) {
      return `Adem?s no se pudo revertir el producto creado: ${error.message}`;
    }
    await eliminarImagenesSubidas(uploadedImagePaths);
    return null;
  } catch (e) {
    return `Adem?s no se pudo revertir el producto creado: ${e instanceof Error ? e.message : "error inesperado"}`;
  }
}

function parseJson(formData: FormData, key: string): Record<string, unknown> | null {
  const val = formData.get(key) as string | null;
  if (!val) return null;
  try {
    return JSON.parse(val) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseSecciones(formData: FormData): string[] {
  const secciones = formData.getAll("secciones_activas") as string[];
  return secciones.filter(Boolean);
}

function parseSubcategoriaIds(
  formData: FormData,
  subcategoriaPrincipalId: string
): { ids: string[] } | { error: string } {
  const idsCrudos = formData.getAll("subcategoria_ids").map((v) => String(v).trim());
  const ids = [...new Set([subcategoriaPrincipalId, ...idsCrudos].filter(Boolean))];

  for (const id of ids) {
    if (!isValidUUID(id)) return { error: "Subcategor?a adicional inv?lida" };
  }

  return { ids };
}

async function validarTipoProductoEnSubcategoria(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tipoProductoId: string,
  subcategoriaId: string
) {
  const { data: tipoProducto, error } = await supabase
    .from("tipos_producto")
    .select("id, subcategoria_id")
    .eq("id", tipoProductoId)
    .maybeSingle();

  if (error) return { error: `Error al validar el tipo de producto: ${error.message}` };
  if (!tipoProducto) return { error: "El tipo de producto seleccionado no existe" };
  if (tipoProducto.subcategoria_id !== subcategoriaId) {
    return { error: "El tipo de producto no pertenece a la subcategor?a seleccionada" };
  }

  return { success: true as const };
}

function parseIvaPorcentaje(
  valor: FormDataEntryValue | null,
  campo: string
): { ivaPorcentaje: number; aplicaIva: boolean } | { error: string } {
  const texto = String(valor ?? "").trim();
  const porcentaje = texto ? parseInt(texto, 10) : IVA_POR_DEFECTO;
  if (!IVA_OPCIONES.includes(porcentaje as (typeof IVA_OPCIONES)[number])) {
    return { error: `${campo}: selecciona un IVA v?lido` };
  }
  return { ivaPorcentaje: porcentaje, aplicaIva: porcentaje > 0 };
}

async function restaurarProductoDesdeSnapshot(
  productoId: string,
  snapshot: ProductoUpdateSnapshot
): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    const { error: errProducto } = await supabase
      .from("productos")
      .update({
        nombre: snapshot.producto.nombre,
        descripcion: snapshot.producto.descripcion,
        precio: snapshot.producto.precio,
        aplica_iva: snapshot.producto.aplica_iva,
        iva_porcentaje: snapshot.producto.iva_porcentaje,
        imagen: snapshot.producto.imagen,
        subcategoria_id: snapshot.producto.subcategoria_id,
        tipo_producto_id: snapshot.producto.tipo_producto_id,
        porcentaje_oferta: snapshot.producto.porcentaje_oferta,
        peso: snapshot.producto.peso,
        dimensiones: snapshot.producto.dimensiones,
        requiere_refrigeracion: snapshot.producto.requiere_refrigeracion,
        producto_fragil: snapshot.producto.producto_fragil,
        destacado: snapshot.producto.destacado,
        nuevo: snapshot.producto.nuevo,
        mas_vendido: snapshot.producto.mas_vendido,
        recomendado: snapshot.producto.recomendado,
        secciones_activas: snapshot.producto.secciones_activas ?? [],
        datos_medicamento: snapshot.producto.datos_medicamento,
        datos_alimento: snapshot.producto.datos_alimento,
        datos_juguete: snapshot.producto.datos_juguete,
      })
      .eq("id", productoId);
    if (errProducto) return `Adem?s no se pudo restaurar el producto: ${errProducto.message}`;

    const { error: errDeleteRel } = await supabase
      .from("producto_subcategorias")
      .delete()
      .eq("producto_id", productoId);
    if (errDeleteRel) {
      return `Adem?s no se pudieron restaurar las subcategor?as del producto: ${errDeleteRel.message}`;
    }

    const subcategoriaIds = [...new Set(snapshot.subcategoriaIds.filter(Boolean))];
    if (subcategoriaIds.length > 0) {
      const { error: errInsertRel } = await supabase.from("producto_subcategorias").insert(
        subcategoriaIds.map((subcategoriaId) => ({
          producto_id: productoId,
          subcategoria_id: subcategoriaId,
        }))
      );
      if (errInsertRel) {
        return `Adem?s no se pudieron restaurar las subcategor?as del producto: ${errInsertRel.message}`;
      }
    }

    const { data: presentacionesActuales, error: errPresentacionesActuales } = await supabase
      .from("producto_presentaciones")
      .select("id")
      .eq("producto_id", productoId);
    if (errPresentacionesActuales) {
      return `Adem?s no se pudieron consultar las presentaciones para restaurar: ${errPresentacionesActuales.message}`;
    }

    const idsSnapshot = new Set(snapshot.presentaciones.map((p) => p.id));
    const idsActuales = (presentacionesActuales ?? []).map((p) => p.id);
    const idsCreados = idsActuales.filter((id) => !idsSnapshot.has(id));
    if (idsCreados.length > 0) {
      const { error: errDeleteCreados } = await supabase
        .from("producto_presentaciones")
        .delete()
        .in("id", idsCreados);
      if (errDeleteCreados) {
        return `Adem?s no se pudieron limpiar presentaciones nuevas: ${errDeleteCreados.message}`;
      }
    }

    const idsRestantes = new Set(idsActuales.filter((id) => idsSnapshot.has(id)));
    for (const presentacion of snapshot.presentaciones) {
      const payload = {
        nombre: presentacion.nombre,
        imagen: presentacion.imagen,
        precio: presentacion.precio,
        orden: presentacion.orden,
        porcentaje_oferta: presentacion.porcentaje_oferta,
        aplica_iva: presentacion.aplica_iva,
        iva_porcentaje: presentacion.iva_porcentaje,
      };

      if (idsRestantes.has(presentacion.id)) {
        const { error: errUpdatePres } = await supabase
          .from("producto_presentaciones")
          .update(payload)
          .eq("id", presentacion.id)
          .eq("producto_id", productoId);
        if (errUpdatePres) {
          return `Adem?s no se pudo restaurar la presentaci?n "${presentacion.nombre}": ${errUpdatePres.message}`;
        }
      } else {
        const { error: errInsertPres } = await supabase.from("producto_presentaciones").insert({
          id: presentacion.id,
          producto_id: productoId,
          ...payload,
        });
        if (errInsertPres) {
          return `Adem?s no se pudo restaurar la presentaci?n "${presentacion.nombre}": ${errInsertPres.message}`;
        }
      }
    }

    return null;
  } catch (e) {
    return `Adem?s no se pudo restaurar el producto: ${e instanceof Error ? e.message : "error inesperado"}`;
  }
}

async function extraerPresentacionesDesdeFormData(
  formData: FormData
): Promise<
  | { presentaciones: PresentacionFormInput[]; uploadedImagePaths: string[] }
  | { error: string; uploadedImagePaths: string[] }
> {
  const presentaciones: PresentacionFormInput[] = [];
  const uploadedImagePaths: string[] = [];

  for (let i = 0; i < 50; i++) {
    const nombreRaw = formData.get(`presentacion_${i}_nombre`);
    if (nombreRaw === null) break;

    const nombrePres = String(nombreRaw).trim();
    if (!nombrePres) continue;

    const errPresNombre = validarLongitud(nombrePres, MAX_PRESENTACION_NOMBRE);
    if (errPresNombre) {
      return { error: `Presentaci?n ${i + 1}: ${errPresNombre}`, uploadedImagePaths };
    }

    const precioVal = formData.get(`presentacion_${i}_precio`) as string;
    const precioPres = precioVal ? parseFloat(precioVal) : null;
    if (precioPres == null || Number.isNaN(precioPres)) {
      return { error: `Presentaci?n "${nombrePres}": el precio es obligatorio`, uploadedImagePaths };
    }
    if (precioPres < 0 || precioPres > MAX_PRECIO) {
      return { error: `Presentaci?n "${nombrePres}": precio inv?lido`, uploadedImagePaths };
    }

    const idRaw = formData.get(`presentacion_${i}_id`) as string | null;
    const id = idRaw?.trim() ? idRaw : undefined;
    if (id && !isValidUUID(id)) {
      return { error: `Presentaci?n "${nombrePres}": ID inv?lido`, uploadedImagePaths };
    }

    const ivaPresResult = parseIvaPorcentaje(
      formData.get(`presentacion_${i}_iva_porcentaje`),
      `Presentaci?n ${i + 1}`
    );
    if ("error" in ivaPresResult) return { ...ivaPresResult, uploadedImagePaths };

    const ofertaPresVal = formData.get(`presentacion_${i}_oferta`) as string;
    const porcentajeOfertaPres = ofertaPresVal ? parseInt(ofertaPresVal, 10) : null;

    const file = formData.get(`presentacion_${i}_imagen`) as File | null;
    let imagen: string | null = null;
    if (file?.size) {
      const res = await subirImagen(file);
      if ("error" in res) return { error: `Presentaci?n ${i + 1} imagen: ${res.error}`, uploadedImagePaths };
      if ("url" in res && res.url) {
        imagen = res.url;
        if (res.path) uploadedImagePaths.push(res.path);
      }
    } else {
      const urlExistente = formData.get(`presentacion_${i}_imagen_url`) as string | null;
      imagen = urlExistente?.trim() ? urlExistente : null;
    }

    presentaciones.push({
      id,
      nombre: sanitizarTexto(nombrePres, MAX_PRESENTACION_NOMBRE),
      imagen,
      precio: precioPres,
      aplica_iva: ivaPresResult.aplicaIva,
      iva_porcentaje: ivaPresResult.ivaPorcentaje,
      porcentaje_oferta:
        porcentajeOfertaPres != null && porcentajeOfertaPres >= 1 && porcentajeOfertaPres <= 99
          ? porcentajeOfertaPres
          : null,
      orden: presentaciones.length,
    });
  }

  return { presentaciones, uploadedImagePaths };
}

export async function crearProducto(formData: FormData) {
  const auth = await requireAuth();
  if (auth.error) return auth;

  const nombre = formData.get("nombre") as string;
  const subcategoria_id = formData.get("subcategoria_id") as string;
  const tipo_producto_id = formData.get("tipo_producto_id") as string;

  if (!nombre?.trim()) return { error: "El nombre es obligatorio" };
  if (!subcategoria_id) return { error: "Selecciona una subcategor?a" };
  if (!tipo_producto_id) return { error: "Selecciona un tipo de producto" };
  const errNombre = validarLongitud(nombre, MAX_NOMBRE);
  if (errNombre) return { error: errNombre };
  if (!isValidUUID(subcategoria_id)) return { error: "Subcategor?a inv?lida" };
  if (!isValidUUID(tipo_producto_id)) return { error: "Tipo de producto inv?lido" };
  const subcategoriasResult = parseSubcategoriaIds(formData, subcategoria_id);
  if ("error" in subcategoriasResult) return subcategoriasResult;

  const desc = (formData.get("descripcion") as string) || "";
  if (desc) {
    const errDesc = validarLongitud(desc, MAX_DESCRIPCION, 0);
    if (errDesc) return { error: `Descripci?n: ${errDesc}` };
  }

  const dim = (formData.get("dimensiones") as string) || "";
  if (dim && dim.length > 100) return { error: "Dimensiones: m?ximo 100 caracteres" };

  const uploadedImagePaths: string[] = [];
  const presentacionesResult = await extraerPresentacionesDesdeFormData(formData);
  if ("error" in presentacionesResult) {
    await eliminarImagenesSubidas(presentacionesResult.uploadedImagePaths);
    return { error: presentacionesResult.error };
  }
  if (presentacionesResult.presentaciones.length === 0) {
    await eliminarImagenesSubidas(presentacionesResult.uploadedImagePaths);
    return { error: "Debes agregar al menos una presentaci?n con gramaje y precio" };
  }
  uploadedImagePaths.push(...presentacionesResult.uploadedImagePaths);
  const presentacionBase = presentacionesResult.presentaciones[0];
  const precio = Number(presentacionBase?.precio ?? 0);
  const errPrecio = validarNumero(precio, 0, MAX_PRECIO, "El precio de la primera presentaci?n");
  if (errPrecio) {
    await eliminarImagenesSubidas(uploadedImagePaths);
    return { error: errPrecio };
  }

  const supabase = await createClient();
  const validacionTipo = await validarTipoProductoEnSubcategoria(
    supabase,
    tipo_producto_id,
    subcategoria_id
  );
  if ("error" in validacionTipo) {
    await eliminarImagenesSubidas(uploadedImagePaths);
    return validacionTipo;
  }
  const file = formData.get("imagen") as File | null;
  let imagen: string | null = null;
  if (file?.size) {
    const res = await subirImagen(file);
    if ("error" in res) {
      await eliminarImagenesSubidas(uploadedImagePaths);
      return { error: `Imagen: ${res.error}` };
    }
    imagen = res.url || null;
    if (res.path) uploadedImagePaths.push(res.path);
  }

  const aplicaIva = presentacionBase?.aplica_iva ?? true;
  const ivaPorcentajeProducto = presentacionBase?.iva_porcentaje ?? 19;
  const porcentajeOferta = presentacionBase?.porcentaje_oferta ?? null;
  const insert: Record<string, unknown> = {
    nombre: sanitizarTexto(nombre, MAX_NOMBRE),
    descripcion: desc ? sanitizarTexto(desc, MAX_DESCRIPCION) : null,
    precio,
    aplica_iva: aplicaIva,
    iva_porcentaje: ivaPorcentajeProducto,
    imagen,
    subcategoria_id,
    tipo_producto_id,
    porcentaje_oferta: porcentajeOferta != null && porcentajeOferta >= 1 && porcentajeOferta <= 99 ? porcentajeOferta : null,
    peso: formData.get("peso") ? parseFloat(formData.get("peso") as string) : null,
    dimensiones: dim ? sanitizarTexto(dim, 100) : null,
    requiere_refrigeracion: formData.get("requiere_refrigeracion") === "1",
    producto_fragil: formData.get("producto_fragil") === "1",
    destacado: formData.get("destacado") === "1",
    nuevo: formData.get("nuevo") === "1",
    mas_vendido: formData.get("mas_vendido") === "1",
    recomendado: formData.get("recomendado") === "1",
    secciones_activas: parseSecciones(formData),
    datos_medicamento: parseJson(formData, "datos_medicamento"),
    datos_alimento: parseJson(formData, "datos_alimento"),
    datos_juguete: parseJson(formData, "datos_juguete"),
  };

  const { data: inserted, error } = await supabase
    .from("productos")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    await eliminarImagenesSubidas(uploadedImagePaths);
    return { error: error.message };
  }
  const productoId = inserted?.id;
  if (!productoId) {
    await eliminarImagenesSubidas(uploadedImagePaths);
    return { error: "No se pudo crear el producto" };
  }

  const { error: errRelaciones } = await supabase.from("producto_subcategorias").insert(
    subcategoriasResult.ids.map((subcategoriaId) => ({
      producto_id: productoId,
      subcategoria_id: subcategoriaId,
    }))
  );
  if (errRelaciones) {
    const revertError = await revertirCreacionProducto(productoId, uploadedImagePaths);
    return {
      error: `Error al guardar subcategor?as del producto: ${errRelaciones.message}${revertError ? `. ${revertError}` : ""}`,
    };
  }

  const { error: errPres } = await supabase.from("producto_presentaciones").insert(
    presentacionesResult.presentaciones.map((presentacion) => ({
      producto_id: productoId,
      nombre: presentacion.nombre,
      imagen: presentacion.imagen,
      precio: presentacion.precio,
      aplica_iva: presentacion.aplica_iva,
      iva_porcentaje: presentacion.iva_porcentaje,
      porcentaje_oferta: presentacion.porcentaje_oferta,
      orden: presentacion.orden,
    }))
  );
  if (errPres) {
    const revertError = await revertirCreacionProducto(productoId, uploadedImagePaths);
    return {
      error: `Error al crear presentaciones: ${errPres.message}${revertError ? `. ${revertError}` : ""}`,
    };
  }

  revalidatePath("/dashboard/productos");
  revalidatePath("/");
  revalidatePath("/ofertas");
  revalidatePath("/dashboard/inventario");
  return { success: true };
}

export async function actualizarProducto(id: string, formData: FormData) {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (!isValidUUID(id)) return { error: "ID inv?lido" };

  const nombre = formData.get("nombre") as string;
  const subcategoria_id = formData.get("subcategoria_id") as string;
  const tipo_producto_id = formData.get("tipo_producto_id") as string;

  if (!nombre?.trim()) return { error: "El nombre es obligatorio" };
  if (!subcategoria_id) return { error: "Selecciona una subcategor?a" };
  if (!tipo_producto_id) return { error: "Selecciona un tipo de producto" };
  const errNombre = validarLongitud(nombre, MAX_NOMBRE);
  if (errNombre) return { error: errNombre };
  if (!isValidUUID(subcategoria_id)) return { error: "Subcategor?a inv?lida" };
  if (!isValidUUID(tipo_producto_id)) return { error: "Tipo de producto inv?lido" };
  const subcategoriasResult = parseSubcategoriaIds(formData, subcategoria_id);
  if ("error" in subcategoriasResult) return subcategoriasResult;

  const descUpdate = (formData.get("descripcion") as string) || "";
  if (descUpdate && descUpdate.length > MAX_DESCRIPCION) return { error: "Descripci?n: m?ximo 2000 caracteres" };
  const dimUpdate = (formData.get("dimensiones") as string) || "";
  if (dimUpdate && dimUpdate.length > 100) return { error: "Dimensiones: m?ximo 100 caracteres" };

  const uploadedImagePaths: string[] = [];
  const presentacionesResult = await extraerPresentacionesDesdeFormData(formData);
  if ("error" in presentacionesResult) {
    await eliminarImagenesSubidas(presentacionesResult.uploadedImagePaths);
    return { error: presentacionesResult.error };
  }
  if (presentacionesResult.presentaciones.length === 0) {
    await eliminarImagenesSubidas(presentacionesResult.uploadedImagePaths);
    return { error: "Debes conservar al menos una presentaci?n con gramaje y precio" };
  }
  uploadedImagePaths.push(...presentacionesResult.uploadedImagePaths);
  const presentacionBase = presentacionesResult.presentaciones[0];
  const precio = Number(presentacionBase?.precio ?? 0);
  const errPrecio = validarNumero(precio, 0, MAX_PRECIO, "El precio de la primera presentaci?n");
  if (errPrecio) {
    await eliminarImagenesSubidas(uploadedImagePaths);
    return { error: errPrecio };
  }

  const supabase = await createClient();
  const validacionTipo = await validarTipoProductoEnSubcategoria(
    supabase,
    tipo_producto_id,
    subcategoria_id
  );
  if ("error" in validacionTipo) {
    await eliminarImagenesSubidas(uploadedImagePaths);
    return validacionTipo;
  }
  const { data: productoActual, error: errProductoActual } = await supabase
    .from("productos")
    .select(
      "nombre, descripcion, precio, aplica_iva, iva_porcentaje, imagen, subcategoria_id, tipo_producto_id, porcentaje_oferta, peso, dimensiones, requiere_refrigeracion, producto_fragil, destacado, nuevo, mas_vendido, recomendado, secciones_activas, datos_medicamento, datos_alimento, datos_juguete"
    )
    .eq("id", id)
    .maybeSingle();
  if (errProductoActual) {
    await eliminarImagenesSubidas(uploadedImagePaths);
    return { error: `Error al consultar el producto actual: ${errProductoActual.message}` };
  }
  if (!productoActual) {
    await eliminarImagenesSubidas(uploadedImagePaths);
    return { error: "Producto no encontrado" };
  }

  const { data: presentacionesExistentes, error: errPresentacionesExistentes } = await supabase
    .from("producto_presentaciones")
    .select("id, nombre, imagen, precio, orden, porcentaje_oferta, aplica_iva, iva_porcentaje, created_at")
    .eq("producto_id", id);
  if (errPresentacionesExistentes) {
    await eliminarImagenesSubidas(uploadedImagePaths);
    return { error: `Error al consultar presentaciones actuales: ${errPresentacionesExistentes.message}` };
  }

  const { data: relacionesActuales, error: errRelacionesActuales } = await supabase
    .from("producto_subcategorias")
    .select("subcategoria_id")
    .eq("producto_id", id);
  if (errRelacionesActuales) {
    await eliminarImagenesSubidas(uploadedImagePaths);
    return { error: `Error al consultar subcategor?as actuales: ${errRelacionesActuales.message}` };
  }

  const presentacionesActuales = (presentacionesExistentes ?? []) as ProductoPresentacionSnapshot[];
  const presentacionesExistentesMap = new Map(
    presentacionesActuales.map((presentacion) => [presentacion.id, presentacion])
  );
  const idsExistentes = new Set(presentacionesActuales.map((presentacion) => presentacion.id));
  const idsConservadosPrevistos = new Set<string>();
  presentacionesResult.presentaciones.forEach((presentacion) => {
    if (presentacion.id && idsExistentes.has(presentacion.id)) {
      idsConservadosPrevistos.add(presentacion.id);
    }
  });

  const idsAEliminar = [...idsExistentes].filter((presentacionId) => !idsConservadosPrevistos.has(presentacionId));
  if (idsAEliminar.length > 0) {
    const { data: lotesAsociados, error: errLotes } = await supabase
      .from("inventario_lotes")
      .select("producto_presentacion_id")
      .in("producto_presentacion_id", idsAEliminar);
    if (errLotes) {
      await eliminarImagenesSubidas(uploadedImagePaths);
      return { error: `Error al validar inventario de las presentaciones: ${errLotes.message}` };
    }
    if ((lotesAsociados ?? []).length > 0) {
      const idsConInventario = new Set(lotesAsociados?.map((lote) => lote.producto_presentacion_id) ?? []);
      const nombresBloqueados = idsAEliminar
        .filter((presentacionId) => idsConInventario.has(presentacionId))
        .map((presentacionId) => presentacionesExistentesMap.get(presentacionId)?.nombre ?? "Presentaci?n")
        .filter((nombre, index, self) => self.indexOf(nombre) === index);
      await eliminarImagenesSubidas(uploadedImagePaths);
      return {
        error: `No se pueden eliminar presentaciones con inventario asociado (${nombresBloqueados.join(", ")}). Primero traslade o depure esos lotes.`,
      };
    }
  }

  const snapshot: ProductoUpdateSnapshot = {
    producto: {
      nombre: productoActual.nombre,
      descripcion: productoActual.descripcion,
      precio: productoActual.precio,
      aplica_iva: productoActual.aplica_iva,
      iva_porcentaje: productoActual.iva_porcentaje,
      imagen: productoActual.imagen,
      subcategoria_id: productoActual.subcategoria_id,
      tipo_producto_id: productoActual.tipo_producto_id,
      porcentaje_oferta: productoActual.porcentaje_oferta,
      peso: productoActual.peso,
      dimensiones: productoActual.dimensiones,
      requiere_refrigeracion: productoActual.requiere_refrigeracion,
      producto_fragil: productoActual.producto_fragil,
      destacado: productoActual.destacado,
      nuevo: productoActual.nuevo,
      mas_vendido: productoActual.mas_vendido,
      recomendado: productoActual.recomendado,
      secciones_activas: productoActual.secciones_activas,
      datos_medicamento: productoActual.datos_medicamento,
      datos_alimento: productoActual.datos_alimento,
      datos_juguete: productoActual.datos_juguete,
    },
    subcategoriaIds: [
      ...new Set([
        productoActual.subcategoria_id,
        ...(relacionesActuales ?? []).map((relacion) => relacion.subcategoria_id),
      ]),
    ],
    presentaciones: presentacionesActuales.map((presentacion) => ({
      id: presentacion.id,
      nombre: presentacion.nombre,
      imagen: presentacion.imagen,
      precio: presentacion.precio,
      orden: presentacion.orden,
      porcentaje_oferta: presentacion.porcentaje_oferta,
      aplica_iva: presentacion.aplica_iva,
      iva_porcentaje: presentacion.iva_porcentaje,
      created_at: presentacion.created_at,
    })),
  };

  const file = formData.get("imagen") as File | null;
  let imagen: string | undefined;
  if (file?.size) {
    const res = await subirImagen(file);
    if ("error" in res) {
      await eliminarImagenesSubidas(uploadedImagePaths);
      return { error: `Imagen: ${res.error}` };
    }
    if ("url" in res && res.url) imagen = res.url;
    if (res.path) uploadedImagePaths.push(res.path);
  }

  const aplicaIva = presentacionBase?.aplica_iva ?? true;
  const ivaPorcentajeProducto = presentacionBase?.iva_porcentaje ?? 19;
  const porcentajeOferta = presentacionBase?.porcentaje_oferta ?? null;
  const update: Record<string, unknown> = {
    nombre: sanitizarTexto(nombre, MAX_NOMBRE),
    descripcion: descUpdate ? sanitizarTexto(descUpdate, MAX_DESCRIPCION) : null,
    precio,
    aplica_iva: aplicaIva,
    iva_porcentaje: ivaPorcentajeProducto,
    porcentaje_oferta: porcentajeOferta != null && porcentajeOferta >= 1 && porcentajeOferta <= 99 ? porcentajeOferta : null,
    subcategoria_id,
    tipo_producto_id,
    peso: formData.get("peso") ? parseFloat(formData.get("peso") as string) : null,
    dimensiones: dimUpdate ? sanitizarTexto(dimUpdate, 100) : null,
    requiere_refrigeracion: formData.get("requiere_refrigeracion") === "1",
    producto_fragil: formData.get("producto_fragil") === "1",
    destacado: formData.get("destacado") === "1",
    nuevo: formData.get("nuevo") === "1",
    mas_vendido: formData.get("mas_vendido") === "1",
    recomendado: formData.get("recomendado") === "1",
    secciones_activas: parseSecciones(formData),
    datos_medicamento: parseJson(formData, "datos_medicamento"),
    datos_alimento: parseJson(formData, "datos_alimento"),
    datos_juguete: parseJson(formData, "datos_juguete"),
  };
  if (imagen !== undefined) update.imagen = imagen;

  const rollbackAfterPartialUpdate = async (message: string) => {
    const rollbackError = await restaurarProductoDesdeSnapshot(id, snapshot);
    await eliminarImagenesSubidas(uploadedImagePaths);
    return { error: rollbackError ? `${message}. ${rollbackError}` : message };
  };

  const { error } = await supabase.from("productos").update(update).eq("id", id);

  if (error) {
    await eliminarImagenesSubidas(uploadedImagePaths);
    return { error: error.message };
  }

  const { error: errDeleteRelaciones } = await supabase
    .from("producto_subcategorias")
    .delete()
    .eq("producto_id", id);
  if (errDeleteRelaciones) {
    return rollbackAfterPartialUpdate(`Error al actualizar subcategor?as del producto: ${errDeleteRelaciones.message}`);
  }

  const { error: errInsertRelaciones } = await supabase.from("producto_subcategorias").insert(
    subcategoriasResult.ids.map((subcategoriaId) => ({
      producto_id: id,
      subcategoria_id: subcategoriaId,
    }))
  );
  if (errInsertRelaciones) {
    return rollbackAfterPartialUpdate(`Error al guardar subcategor?as del producto: ${errInsertRelaciones.message}`);
  }

  const idsConservados = new Set<string>();
  const imagePathsToDelete: string[] = [];

  const oldProductImagePath = extraerPathDesdeUrlPublica(productoActual?.imagen);
  const newProductImagePath = extraerPathDesdeUrlPublica(imagen);
  if (imagen !== undefined && oldProductImagePath && oldProductImagePath !== newProductImagePath) {
    imagePathsToDelete.push(oldProductImagePath);
  }

  for (const presentacion of presentacionesResult.presentaciones) {
    if (presentacion.id && idsExistentes.has(presentacion.id)) {
      const imagenAnterior = presentacionesExistentesMap.get(presentacion.id)?.imagen ?? null;
      const { error: errPresUpdate } = await supabase
        .from("producto_presentaciones")
        .update({
          nombre: presentacion.nombre,
          imagen: presentacion.imagen,
          precio: presentacion.precio,
          aplica_iva: presentacion.aplica_iva,
          iva_porcentaje: presentacion.iva_porcentaje,
          porcentaje_oferta: presentacion.porcentaje_oferta,
          orden: presentacion.orden,
        })
        .eq("id", presentacion.id)
        .eq("producto_id", id);
      if (errPresUpdate) {
        return rollbackAfterPartialUpdate(`Error al actualizar presentaci?n "${presentacion.nombre}": ${errPresUpdate.message}`);
      }
      const oldImagePath = extraerPathDesdeUrlPublica(imagenAnterior);
      const newImagePath = extraerPathDesdeUrlPublica(presentacion.imagen);
      if (oldImagePath && oldImagePath !== newImagePath) {
        imagePathsToDelete.push(oldImagePath);
      }
      idsConservados.add(presentacion.id);
    } else {
      const { data: presentacionInsertada, error: errPresInsert } = await supabase
        .from("producto_presentaciones")
        .insert({
          producto_id: id,
          nombre: presentacion.nombre,
          imagen: presentacion.imagen,
          precio: presentacion.precio,
          aplica_iva: presentacion.aplica_iva,
          iva_porcentaje: presentacion.iva_porcentaje,
          porcentaje_oferta: presentacion.porcentaje_oferta,
          orden: presentacion.orden,
        })
        .select("id")
        .single();
      if (errPresInsert) {
        return rollbackAfterPartialUpdate(`Error al crear presentaci?n "${presentacion.nombre}": ${errPresInsert.message}`);
      }
      if (presentacionInsertada?.id) idsConservados.add(presentacionInsertada.id);
    }
  }

  idsAEliminar.forEach((presentacionId) => {
    const oldImagePath = extraerPathDesdeUrlPublica(presentacionesExistentesMap.get(presentacionId)?.imagen);
    if (oldImagePath) imagePathsToDelete.push(oldImagePath);
  });
  if (idsAEliminar.length > 0) {
    const { error: errDel } = await supabase.from("producto_presentaciones").delete().in("id", idsAEliminar);
    if (errDel) {
      return rollbackAfterPartialUpdate(`Error al eliminar presentaciones removidas: ${errDel.message}`);
    }
  }

  await eliminarImagenesSubidas(imagePathsToDelete);

  revalidatePath("/dashboard/productos");
  revalidatePath("/");
  revalidatePath("/ofertas");
  revalidatePath("/dashboard/inventario");
  return { success: true };
}

export async function eliminarProducto(id: string) {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (!isValidUUID(id)) return { error: "ID inv?lido" };

  const supabase = await createClient();
  const { data: presentaciones, error: presentacionesError } = await supabase
    .from("producto_presentaciones")
    .select("id")
    .eq("producto_id", id);
  if (presentacionesError) return { error: presentacionesError.message };

  const presentacionIds = (presentaciones ?? []).map((presentacion) => presentacion.id);
  if (presentacionIds.length > 0) {
    const { count: inventarioCount, error: inventarioError } = await supabase
      .from("inventario_lotes")
      .select("*", { count: "exact", head: true })
      .in("producto_presentacion_id", presentacionIds);
    if (inventarioError) return { error: inventarioError.message };
    if ((inventarioCount ?? 0) > 0) {
      return { error: "No puedes eliminar un producto que todav?a tiene inventario o historial de presentaciones asociado" };
    }
    return { error: "No puedes eliminar un producto que todav?a conserva presentaciones asociadas" };
  }

  const { count: relacionesCount, error: relacionesError } = await supabase
    .from("producto_subcategorias")
    .select("*", { count: "exact", head: true })
    .eq("producto_id", id);
  if (relacionesError) return { error: relacionesError.message };
  if ((relacionesCount ?? 0) > 0) {
    return { error: "No puedes eliminar un producto que todav?a conserva relaciones de cat?logo asociadas" };
  }

  const { count: pedidosCount, error: pedidosError } = await supabase
    .from("pedido_items")
    .select("*", { count: "exact", head: true })
    .eq("producto_id", id);
  if (pedidosError) return { error: pedidosError.message };
  if ((pedidosCount ?? 0) > 0) {
    return { error: "No puedes eliminar un producto que ya hace parte del historial de pedidos" };
  }

  const { error } = await supabase.from("productos").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/productos");
  revalidatePath("/");
  revalidatePath("/ofertas");
  return { success: true };
}
