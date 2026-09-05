import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TopBar from "@/components/TopBar";
import { tiendaTipoProductoHref, toSlug } from "@/lib/catalogo";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function TiendaSubcategoriaPage({
  params,
}: {
  params: Promise<{ slug: string; subslug: string }>;
}) {
  const { slug, subslug } = await params;
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre");

  const categoria = categorias?.find((c) => toSlug(c.nombre) === slug);
  if (!categoria) notFound();

  const { data: subcategorias } = await supabase
    .from("subcategorias")
    .select("id, nombre")
    .eq("categoria_id", categoria.id)
    .order("nombre");

  const subcategoria = subcategorias?.find((s) => toSlug(s.nombre) === subslug);
  if (!subcategoria) notFound();

  const { data: tiposProducto } = await supabase
    .from("tipos_producto")
    .select("id, nombre")
    .eq("subcategoria_id", subcategoria.id)
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffeef7,transparent_42%),#fff7ef] text-slate-800">
      <main className="mx-auto w-full max-w-[1260px] px-3 pb-6 pt-3 sm:px-6">
        <TopBar />

        <Header />

        <section className="mt-6">
          <Link
            href={`/tienda/${slug}`}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ca-purple)] hover:underline"
          >
            <ArrowLeft size={18} />
            Volver a {categoria.nombre}
          </Link>

          <div className="overflow-hidden rounded-[24px] border border-[#f3dcff] bg-white shadow-[0_22px_52px_rgba(123,31,162,0.12)]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-[#fef3fb] to-[#fff9f0] px-6 py-6 sm:px-8">
              <h1 className="text-3xl font-black text-[var(--ca-purple)] sm:text-4xl">
                {categoria.nombre} → {subcategoria.nombre}
              </h1>
              <p className="mt-1 text-slate-600">
                Elige un tipo de producto para ver los productos disponibles
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {!tiposProducto?.length ? (
                <p className="py-12 text-center text-slate-500">
                  No hay tipos de producto en esta subcategoría aún.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {tiposProducto.map((tipo) => (
                    <Link
                      key={tipo.id}
                      href={tiendaTipoProductoHref(categoria.nombre, subcategoria.nombre, tipo.nombre)}
                      className="card-lift flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-[var(--ca-purple)]/30 hover:shadow-md"
                    >
                      <div>
                        <span className="font-bold text-slate-800">
                          {tipo.nombre}
                        </span>
                        <p className="mt-1 text-sm text-slate-500">
                          {conteos.get(tipo.id) ?? 0} producto(s)
                        </p>
                      </div>
                      <ChevronRight
                        size={20}
                        className="text-[var(--ca-purple)]"
                      />
                    </Link>
                  ))}
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
