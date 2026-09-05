import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { aplicarIva, resolverIvaPorcentaje } from "@/lib/iva";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const IMAGENES_PLACEHOLDER = [
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=280&fit=crop",
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=280&fit=crop",
  "https://images.unsplash.com/photo-1444464666168-49d633b63c69?w=400&h=280&fit=crop",
  "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=400&h=280&fit=crop",
];

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (!query) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffeef7,transparent_42%),#fff7ef] text-slate-800">
        <main className="mx-auto w-full max-w-[1260px] px-3 pb-6 pt-3 sm:px-6">
          <Header />
          <section className="mt-6 overflow-hidden rounded-[24px] border border-[#f3dcff] bg-white p-8 shadow-[0_22px_52px_rgba(123,31,162,0.12)]">
            <h1 className="text-2xl font-black text-[var(--ca-purple)]">Buscar productos</h1>
            <p className="mt-2 text-slate-600">Ingresa un término en la barra de búsqueda para ver resultados.</p>
          </section>
        </main>
      </div>
    );
  }

  const supabase = await createClient();
  const term = `%${query}%`;
  const { data: tiposCoincidentes } = await supabase
    .from("tipos_producto")
    .select(`
      id,
      nombre,
      subcategorias (
        nombre,
        categorias (nombre)
      )
    `)
    .ilike("nombre", term)
    .order("nombre");

  const { data: productosPorTexto } = await supabase
    .from("productos")
    .select(`
      id,
      nombre,
      precio,
      imagen,
      aplica_iva,
      iva_porcentaje,
      porcentaje_oferta,
      producto_presentaciones (precio, porcentaje_oferta, orden, aplica_iva, iva_porcentaje),
      subcategorias (nombre, categorias (nombre)),
      tipos_producto (nombre)
    `)
    .or(`nombre.ilike.${term},descripcion.ilike.${term}`)
    .order("nombre");

  const tipoIds = (tiposCoincidentes ?? []).map((tipo) => tipo.id);
  let productosPorTipo: typeof productosPorTexto = [];
  if (tipoIds.length > 0) {
    const { data } = await supabase
      .from("productos")
      .select(`
        id,
        nombre,
        precio,
        imagen,
        aplica_iva,
        iva_porcentaje,
        porcentaje_oferta,
        producto_presentaciones (precio, porcentaje_oferta, orden, aplica_iva, iva_porcentaje),
        subcategorias (nombre, categorias (nombre)),
        tipos_producto (nombre)
      `)
      .in("tipo_producto_id", tipoIds)
      .order("nombre");
    productosPorTipo = data ?? [];
  }

  const items = [...(productosPorTexto ?? []), ...(productosPorTipo ?? [])].filter(
    (producto, index, arr) => arr.findIndex((item) => item.id === producto.id) === index
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffeef7,transparent_42%),#fff7ef] text-slate-800">
      <main className="mx-auto w-full max-w-[1260px] px-3 pb-6 pt-3 sm:px-6">
        <Header />

        <section className="mt-6 overflow-hidden rounded-[24px] border border-[#f3dcff] bg-white shadow-[0_22px_52px_rgba(123,31,162,0.12)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-[#fef3fb] to-[#fff9f0] px-6 py-8 sm:px-8">
            <h1 className="text-3xl font-black text-[var(--ca-purple)] sm:text-4xl">
              Resultados para &quot;{query}&quot;
            </h1>
            <p className="mt-1 text-slate-600">
              {items.length} {items.length === 1 ? "producto encontrado" : "productos encontrados"}
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {items.length === 0 ? (
              <p className="py-12 text-center text-slate-500">
                No encontramos productos que coincidan con tu búsqueda.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {items.map((p, i) => {
                  const pps = Array.isArray(p.producto_presentaciones) ? p.producto_presentaciones : p.producto_presentaciones ? [p.producto_presentaciones] : [];
                  const ordenados = [...pps].sort((a, b) => (a?.orden ?? 0) - (b?.orden ?? 0));
                  const pres = ordenados[0];
                  const subcategoria = (
                    Array.isArray(p.subcategorias) ? p.subcategorias[0] : p.subcategorias
                  ) as
                    | { nombre: string; categorias?: { nombre: string } | { nombre: string }[] | null }
                    | null
                    | undefined;
                  const categoria = subcategoria?.categorias as
                    | { nombre: string }
                    | { nombre: string }[]
                    | null
                    | undefined;
                  const categoriaNombre = Array.isArray(categoria)
                    ? categoria[0]?.nombre
                    : categoria?.nombre;
                  const tipoProducto = (
                    Array.isArray(p.tipos_producto) ? p.tipos_producto[0] : p.tipos_producto
                  ) as { nombre: string } | null | undefined;
                  const precio = pres?.precio != null ? Number(pres.precio) : Number(p.precio);
                  const oferta = pres?.porcentaje_oferta ?? p.porcentaje_oferta;
                  const precioBase = oferta && oferta > 0 ? precio * (1 - oferta / 100) : precio;
                  const ivaPorcentaje = resolverIvaPorcentaje({
                    ivaPorcentaje: pres?.iva_porcentaje,
                    aplicaIva: pres?.aplica_iva,
                    fallbackPorcentaje: p.iva_porcentaje,
                    fallbackAplicaIva: p.aplica_iva,
                  });
                  const precioFinal = aplicarIva(precioBase, ivaPorcentaje);
                  const precioOriginal = aplicarIva(precio, ivaPorcentaje);
                  const href = `/producto/${p.id}`;
                  return (
                    <Link
                      key={p.id}
                      href={href}
                      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-[var(--ca-orange)]/50 hover:shadow-lg"
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={p.imagen ?? IMAGENES_PLACEHOLDER[i % IMAGENES_PLACEHOLDER.length]}
                          alt={p.nombre}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        {oferta && oferta > 0 && (
                          <span className="absolute right-2 top-2 rounded-full bg-[var(--ca-orange)] px-2 py-0.5 text-xs font-bold text-white">
                            -{oferta}%
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-800">{p.nombre}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {[categoriaNombre, subcategoria?.nombre, tipoProducto?.nombre].filter(Boolean).join(" → ")}
                        </p>
                        <p className="mt-1 text-lg font-black text-[var(--ca-orange)]">
                          ${precioFinal.toLocaleString("es-CO")}
                          {oferta && oferta > 0 && (
                            <span className="ml-1 text-xs font-normal text-slate-400 line-through">
                              ${precioOriginal.toLocaleString("es-CO")}
                            </span>
                          )}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
