import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TopBar from "@/components/TopBar";
import { aplicarIva, resolverIvaPorcentaje } from "@/lib/iva";
import { tiendaSubcategoriaHref, toSlug } from "@/lib/catalogo";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const IMAGENES_PLACEHOLDER = [
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=280&fit=crop",
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=280&fit=crop",
  "https://images.unsplash.com/photo-1444464666168-49d633b63c69?w=400&h=280&fit=crop",
  "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=400&h=280&fit=crop",
];

export default async function TiendaTipoProductoPage({
  params,
}: {
  params: Promise<{ slug: string; subslug: string; tipoSlug: string }>;
}) {
  const { slug, subslug, tipoSlug } = await params;
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre");

  const categoria = categorias?.find((item) => toSlug(item.nombre) === slug);
  if (!categoria) notFound();

  const { data: subcategorias } = await supabase
    .from("subcategorias")
    .select("id, nombre")
    .eq("categoria_id", categoria.id)
    .order("nombre");

  const subcategoria = subcategorias?.find((item) => toSlug(item.nombre) === subslug);
  if (!subcategoria) notFound();

  const { data: tiposProducto } = await supabase
    .from("tipos_producto")
    .select("id, nombre")
    .eq("subcategoria_id", subcategoria.id)
    .order("nombre");

  const tipoProducto = tiposProducto?.find((item) => toSlug(item.nombre) === tipoSlug);
  if (!tipoProducto) notFound();

  const { data: productos } = await supabase
    .from("productos")
    .select(`
      id,
      nombre,
      precio,
      aplica_iva,
      iva_porcentaje,
      imagen,
      destacado,
      nuevo,
      mas_vendido,
      porcentaje_oferta,
      producto_presentaciones (precio, porcentaje_oferta, orden, aplica_iva, iva_porcentaje)
    `)
    .eq("tipo_producto_id", tipoProducto.id)
    .order("nombre");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffeef7,transparent_42%),#fff7ef] text-slate-800">
      <main className="mx-auto w-full max-w-[1260px] px-3 pb-6 pt-3 sm:px-6">
        <TopBar />

        <Header />

        <section className="mt-6">
          <Link
            href={tiendaSubcategoriaHref(categoria.nombre, subcategoria.nombre)}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ca-purple)] hover:underline"
          >
            <ArrowLeft size={18} />
            Volver a {subcategoria.nombre}
          </Link>

          <div className="overflow-hidden rounded-[24px] border border-[#f3dcff] bg-white shadow-[0_22px_52px_rgba(123,31,162,0.12)]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-[#fef3fb] to-[#fff9f0] px-6 py-6 sm:px-8">
              <h1 className="text-3xl font-black text-[var(--ca-purple)] sm:text-4xl">
                {categoria.nombre} → {subcategoria.nombre} → {tipoProducto.nombre}
              </h1>
              <p className="mt-1 text-slate-600">
                {(productos ?? []).length} producto(s) en este tipo
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {!productos?.length ? (
                <p className="py-12 text-center text-slate-500">
                  No hay productos en este tipo aún.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {productos.map((producto, index) => {
                    const precioBase =
                      typeof producto.precio === "string"
                        ? parseFloat(producto.precio)
                        : Number(producto.precio);
                    const presentaciones = Array.isArray(producto.producto_presentaciones)
                      ? producto.producto_presentaciones
                      : producto.producto_presentaciones
                        ? [producto.producto_presentaciones]
                        : [];
                    const primeraConOferta = [...presentaciones]
                      .sort((a: { orden: number }, b: { orden: number }) => a.orden - b.orden)
                      .find(
                        (presentacion: { porcentaje_oferta?: number | null }) =>
                          presentacion.porcentaje_oferta != null && presentacion.porcentaje_oferta > 0
                      );
                    const ofertaProducto =
                      producto.porcentaje_oferta != null && producto.porcentaje_oferta > 0;
                    const ofertaPorcentaje = Number(
                      primeraConOferta?.porcentaje_oferta ??
                        (ofertaProducto ? producto.porcentaje_oferta : 0) ??
                        0
                    );
                    const precioReferencia =
                      primeraConOferta?.precio != null
                        ? Number(primeraConOferta.precio)
                        : precioBase;
                    const ivaPorcentaje = resolverIvaPorcentaje({
                      ivaPorcentaje: (primeraConOferta as { iva_porcentaje?: number | null })?.iva_porcentaje,
                      aplicaIva: (primeraConOferta as { aplica_iva?: boolean })?.aplica_iva,
                      fallbackPorcentaje: (producto as { iva_porcentaje?: number | null }).iva_porcentaje,
                      fallbackAplicaIva: (producto as { aplica_iva?: boolean }).aplica_iva,
                    });
                    const precioSinIva =
                      ofertaPorcentaje > 0
                        ? precioReferencia * (1 - ofertaPorcentaje / 100)
                        : precioReferencia;
                    const precioFinal = aplicarIva(precioSinIva, ivaPorcentaje);
                    const imagen =
                      producto.imagen ??
                      IMAGENES_PLACEHOLDER[index % IMAGENES_PLACEHOLDER.length];
                    const badge =
                      ofertaPorcentaje > 0
                        ? `${ofertaPorcentaje}% OFF`
                        : producto.mas_vendido
                          ? "Más vendido"
                          : producto.nuevo
                            ? "Nuevo"
                            : producto.destacado
                              ? "Destacado"
                              : null;

                    return (
                      <Link
                        key={producto.id}
                        href={`/producto/${producto.id}`}
                        className="card-lift overflow-hidden rounded-3xl border border-[#ece2ff] bg-white p-3 shadow-[0_10px_26px_rgba(123,31,162,0.12)]"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                          {badge && (
                            <span
                              className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[10px] font-black text-white ${
                                badge.includes("%") ? "bg-[#ff6b35]" : "bg-[#63c132]"
                              }`}
                            >
                              {badge}
                            </span>
                          )}
                          <img
                            src={imagen}
                            alt={producto.nombre}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <h3 className="mt-3 line-clamp-2 text-base font-bold text-slate-800">
                          {producto.nombre}
                        </h3>
                        <div className="mt-1 flex items-center gap-2">
                          {ofertaPorcentaje > 0 && (
                            <span className="text-sm text-slate-500 line-through">
                              ${aplicarIva(precioReferencia, ivaPorcentaje).toLocaleString("es-CO")}
                            </span>
                          )}
                          <p className="text-2xl font-black text-[var(--ca-orange)]">
                            ${precioFinal.toLocaleString("es-CO")}
                          </p>
                        </div>
                        <div className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--ca-orange)] to-[#ff9b23] px-4 py-2 text-sm font-bold text-white transition hover:brightness-105">
                          <ShoppingCart size={15} />
                          Ver producto
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
