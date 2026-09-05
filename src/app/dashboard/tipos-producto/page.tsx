import { createClient } from "@/lib/supabase/server";
import { TiposProductoClient } from "./TiposProductoClient";

export default async function TiposProductoPage() {
  const supabase = await createClient();

  const { data: tiposProducto } = await supabase
    .from("tipos_producto")
    .select(`
      id,
      nombre,
      subcategoria_id,
      created_at,
      subcategorias (
        nombre,
        categorias (nombre)
      )
    `)
    .order("nombre");

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre");

  const { data: subcategorias } = await supabase
    .from("subcategorias")
    .select(`
      id,
      nombre,
      categoria_id,
      categorias (nombre)
    `)
    .order("nombre");

  const tiposIds = (tiposProducto ?? []).map((tipo) => tipo.id);
  const conteos = new Map<string, number>();

  if (tiposIds.length > 0) {
    const { data: productos } = await supabase
      .from("productos")
      .select("tipo_producto_id")
      .in("tipo_producto_id", tiposIds);

    (productos ?? []).forEach((producto) => {
      const tipoId = producto.tipo_producto_id;
      if (!tipoId) return;
      conteos.set(tipoId, (conteos.get(tipoId) ?? 0) + 1);
    });
  }

  const tiposNormalizados = (tiposProducto ?? []).map((tipo) => {
    const subcategoriaRaw = Array.isArray(tipo.subcategorias)
      ? tipo.subcategorias[0] ?? null
      : tipo.subcategorias;
    const categoriaRaw = subcategoriaRaw?.categorias;

    return {
      ...tipo,
      subcategorias: subcategoriaRaw
        ? {
            ...subcategoriaRaw,
            categorias: Array.isArray(categoriaRaw) ? categoriaRaw[0] ?? null : categoriaRaw ?? null,
          }
        : null,
      productosCount: conteos.get(tipo.id) ?? 0,
    };
  });

  const subcategoriasNormalizadas = (subcategorias ?? []).map((subcategoria) => ({
    ...subcategoria,
    categorias: Array.isArray(subcategoria.categorias)
      ? subcategoria.categorias[0] ?? null
      : subcategoria.categorias,
  }));

  return (
    <TiposProductoClient
      tiposProducto={tiposNormalizados}
      categorias={categorias ?? []}
      subcategorias={subcategoriasNormalizadas}
    />
  );
}
