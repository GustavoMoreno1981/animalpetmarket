import { createAdminClient } from "@/lib/supabase/server";
import { ProductosClient } from "./ProductosClient";

export default async function ProductosPage() {
  const supabase = createAdminClient();

  const { data: productos } = await supabase
    .from("productos")
    .select(`
      id,
      nombre,
      descripcion,
      precio,
      aplica_iva,
      iva_porcentaje,
      imagen,
      subcategoria_id,
      tipo_producto_id,
      peso,
      dimensiones,
      requiere_refrigeracion,
      producto_fragil,
      destacado,
      nuevo,
      mas_vendido,
      recomendado,
      porcentaje_oferta,
      secciones_activas,
      datos_medicamento,
      datos_alimento,
      datos_juguete,
      created_at,
      subcategorias (nombre, categorias (nombre)),
      tipos_producto (id, nombre, subcategoria_id),
      producto_subcategorias (subcategoria_id, subcategorias (nombre, categorias (nombre))),
      producto_presentaciones (id, nombre, imagen, precio, orden, aplica_iva, iva_porcentaje, porcentaje_oferta)
    `)
    .order("nombre");

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre");

  const { data: subcategorias } = await supabase
    .from("subcategorias")
    .select("id, nombre, categoria_id")
    .order("nombre");

  const { data: tiposProducto } = await supabase
    .from("tipos_producto")
    .select("id, nombre, subcategoria_id")
    .order("nombre");

  const ppIds =
    productos?.flatMap((p) => {
      const pps = p.producto_presentaciones;
      const arr = Array.isArray(pps) ? pps : pps ? [pps] : [];
      return arr.map((pp: { id: string }) => pp.id);
    }) ?? [];
  const ppIdsUniq = [...new Set(ppIds)];

  const stockPorProducto: Record<string, number> = {};
  if (ppIdsUniq.length > 0) {
    const { data: lotes } = await supabase
      .from("inventario_lotes")
      .select("producto_presentacion_id, cantidad")
      .in("producto_presentacion_id", ppIdsUniq);

    const ppToProducto: Record<string, string> = {};
    productos?.forEach((p) => {
      const pps = p.producto_presentaciones;
      const arr = Array.isArray(pps) ? pps : pps ? [pps] : [];
      arr.forEach((pp: { id: string }) => {
        ppToProducto[pp.id] = p.id;
      });
    });

    lotes?.forEach((l) => {
      const prodId = ppToProducto[l.producto_presentacion_id];
      if (!prodId) return;
      const cant = typeof l.cantidad === "string" ? parseInt(l.cantidad, 10) : l.cantidad;
      stockPorProducto[prodId] = (stockPorProducto[prodId] ?? 0) + cant;
    });
  }

  const productosConStock = (productos ?? []).map((p) => {
    const relacionadas = Array.isArray(p.producto_subcategorias)
      ? p.producto_subcategorias
      : p.producto_subcategorias
        ? [p.producto_subcategorias]
        : [];
    const subcategoria_ids = [
      p.subcategoria_id,
      ...relacionadas
        .map((rel: { subcategoria_id?: string | null }) => rel.subcategoria_id)
        .filter((id): id is string => Boolean(id)),
    ];
    return {
      ...p,
      subcategoria_ids: [...new Set(subcategoria_ids)],
      stock: stockPorProducto[p.id] ?? 0,
    };
  });

  return (
    <ProductosClient
      productos={productosConStock}
      categorias={categorias ?? []}
      subcategorias={subcategorias ?? []}
      tiposProducto={tiposProducto ?? []}
    />
  );
}
