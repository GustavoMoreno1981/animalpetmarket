import { createClient } from "@/lib/supabase/server";
import { InventarioClient } from "./InventarioClient";

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ foco?: string }>;
}) {
  const { foco } = await searchParams;
  const supabase = await createClient();

  const { data: presentacionesRaw } = await supabase
    .from("producto_presentaciones")
    .select(`
      id,
      nombre,
      producto_id,
      productos (id, nombre)
    `)
    .order("nombre");

  type PresentacionRow = { id: string; nombre: string; producto_id: string; productos?: { id: string; nombre: string } | { id: string; nombre: string }[] | null };
  const presentaciones = (presentacionesRaw ?? []).map((p: PresentacionRow) => ({
    id: p.id,
    nombre: p.nombre,
    producto_id: p.producto_id,
    productos: Array.isArray(p.productos) ? p.productos[0] ?? null : p.productos ?? null,
  }));

  const { data: lotesRaw } = await supabase
    .from("inventario_lotes")
    .select(`
      id,
      lote,
      cantidad,
      fecha_vencimiento,
      created_at,
      producto_presentacion_id,
      producto_presentaciones (
        id,
        nombre,
        productos (id, nombre)
      )
    `)
    .order("fecha_vencimiento", { ascending: true });

  type LoteRow = {
    id: string;
    lote: string;
    cantidad: number;
    fecha_vencimiento: string;
    created_at?: string;
    producto_presentacion_id: string;
    producto_presentaciones?: { id: string; nombre: string; productos?: { id: string; nombre: string } | { id: string; nombre: string }[] } | { id: string; nombre: string; productos?: { id: string; nombre: string } | { id: string; nombre: string }[] }[] | null;
  };
  const lotes = (lotesRaw ?? []).map((l: LoteRow) => {
    const pp = Array.isArray(l.producto_presentaciones) ? l.producto_presentaciones[0] : l.producto_presentaciones;
    const prod = pp ? (Array.isArray(pp.productos) ? pp.productos[0] ?? null : pp.productos ?? null) : null;
    return {
      ...l,
      producto_presentaciones: pp ? { id: pp.id, nombre: pp.nombre, productos: prod } : null,
    };
  });

  return (
    <InventarioClient
      presentaciones={presentaciones}
      lotes={lotes}
      focoPresentacionId={foco ?? null}
    />
  );
}
