import Footer from "@/components/Footer";
import Header from "@/components/Header";
import TopBar from "@/components/TopBar";
import { ProductoDetalle } from "@/components/ProductoDetalle";
import { tiendaSubcategoriaHref, tiendaTipoProductoHref } from "@/lib/catalogo";
import { resolverIvaPorcentaje } from "@/lib/iva";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validations";
import { WhatsAppFloatingButton } from "@/components/WhatsAppFloatingButton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const IMAGEN_PLACEHOLDER =
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=400&fit=crop";

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidUUID(id)) notFound();

  const supabase = await createClient();

  const { data: producto, error } = await supabase
    .from("productos")
    .select(`
      id,
      nombre,
      descripcion,
      precio,
      aplica_iva,
      iva_porcentaje,
      imagen,
      porcentaje_oferta,
      peso,
      dimensiones,
      requiere_refrigeracion,
      producto_fragil,
      destacado,
      nuevo,
      mas_vendido,
      recomendado,
      secciones_activas,
      datos_medicamento,
      datos_alimento,
      datos_juguete,
      subcategorias (nombre, categorias (nombre)),
      tipos_producto (nombre)
    `)
    .eq("id", id)
    .single();

  if (error || !producto) notFound();

  const { data: presentaciones } = await supabase
    .from("producto_presentaciones")
    .select("id, nombre, imagen, precio, orden, porcentaje_oferta, aplica_iva, iva_porcentaje")
    .eq("producto_id", id)
    .order("orden");

  const sub = Array.isArray(producto.subcategorias)
    ? producto.subcategorias[0]
    : producto.subcategorias;
  const tipoProducto = Array.isArray(producto.tipos_producto)
    ? producto.tipos_producto[0]
    : producto.tipos_producto;
  const catRaw = sub?.categorias;
  const cat = (Array.isArray(catRaw) ? catRaw[0] : catRaw) as { nombre: string } | undefined;
  const volverHref =
    cat?.nombre && sub?.nombre && tipoProducto?.nombre
      ? tiendaTipoProductoHref(cat.nombre, sub.nombre, tipoProducto.nombre)
      : cat?.nombre && sub?.nombre
        ? tiendaSubcategoriaHref(cat.nombre, sub.nombre)
        : "/";

  const precioNum =
    typeof producto.precio === "string"
      ? parseFloat(producto.precio)
      : Number(producto.precio);

  const imagenes: { url: string; label?: string }[] = [];
  if (producto.imagen) imagenes.push({ url: producto.imagen, label: "Principal" });
  (presentaciones ?? [])
    .sort((a, b) => a.orden - b.orden)
    .forEach((p) => {
      if (p.imagen) imagenes.push({ url: p.imagen!, label: p.nombre });
    });
  if (imagenes.length === 0) imagenes.push({ url: IMAGEN_PLACEHOLDER });

  const badge = producto.mas_vendido
    ? "Más vendido"
    : producto.nuevo
      ? "Nuevo"
      : producto.destacado
        ? "Destacado"
        : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffeef7,transparent_42%),#fff7ef] text-slate-800">
      <main className="mx-auto w-full max-w-[1260px] overflow-x-hidden px-3 pb-6 pt-3 sm:px-6">
        <TopBar />

        <Header />

        <section className="mt-6">
          <Link
            href={volverHref}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ca-purple)] hover:underline"
          >
            <ArrowLeft size={18} />
            Volver
          </Link>

          <div className="overflow-hidden rounded-[24px] border border-[#f3dcff] bg-white shadow-[0_22px_52px_rgba(123,31,162,0.12)]">
            <div className="p-4 sm:p-6 lg:p-8">
              <ProductoDetalle
                productId={producto.id}
                nombre={producto.nombre}
                precioBase={precioNum}
                ivaPorcentajeBase={resolverIvaPorcentaje({
                  ivaPorcentaje: (producto as { iva_porcentaje?: number | null }).iva_porcentaje,
                  aplicaIva: (producto as { aplica_iva?: boolean }).aplica_iva,
                })}
                descripcion={producto.descripcion}
                imagenes={imagenes}
                presentaciones={(presentaciones ?? []).map((p) => ({
                  ...p,
                  iva_porcentaje: resolverIvaPorcentaje({
                    ivaPorcentaje: p.iva_porcentaje,
                    aplicaIva: p.aplica_iva,
                    fallbackPorcentaje: (producto as { iva_porcentaje?: number | null }).iva_porcentaje,
                    fallbackAplicaIva: (producto as { aplica_iva?: boolean }).aplica_iva,
                  }),
                }))}
                badge={badge}
                porcentajeOfertaBase={producto.porcentaje_oferta != null ? Number(producto.porcentaje_oferta) : null}
                datosMedicamento={
                  producto.datos_medicamento as Record<string, string> | null
                }
                datosAlimento={
                  producto.datos_alimento as Record<string, string> | null
                }
                datosJuguete={
                  producto.datos_juguete as Record<string, string> | null
                }
                peso={producto.peso != null ? Number(producto.peso) : null}
                dimensiones={producto.dimensiones}
              />
            </div>
          </div>
        </section>

        <Footer />

        <WhatsAppFloatingButton />
      </main>
    </div>
  );
}
