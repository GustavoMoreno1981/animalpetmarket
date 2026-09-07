import { createAdminClient } from "@/lib/supabase/server";
import { getDashboardContext } from "@/lib/roles";
import { redirect } from "next/navigation";
import { PedidosClient } from "./PedidosClient";

export default async function PedidosPage() {
  const ctx = await getDashboardContext();
  if (!ctx) redirect("/login");

  const supabase = createAdminClient();
  let pedidosQuery = supabase
    .from("pedidos")
    .select(`
      id,
      numero_orden,
      nombre_cliente,
      telefono,
      direccion,
      notas,
      metodo_pago,
      subtotal_productos,
      valor_domicilio_cobrado,
      valor_domicilio_real,
      domicilio_es_gratis,
      descuento_pedido,
      total,
      estado,
      created_at,
      vendedor_id,
      domiciliario_id,
      entrega_foto_url,
      vendedores (nombre),
      domiciliarios (nombre),
      pedido_items (
        producto_id,
        nombre,
        presentacion,
        cantidad,
        precio_unitario,
        subtotal
      )
    `)
    .order("created_at", { ascending: false });

  if (ctx.rol === "vendedor" && ctx.vendedorId) {
    pedidosQuery = pedidosQuery.eq("vendedor_id", ctx.vendedorId);
  }

  const [{ data: pedidos }, { data: ventas }, { data: domiciliarios }] = await Promise.all([
    pedidosQuery,
    supabase.from("ventas").select("pedido_id, fecha_venta"),
    ctx.rol === "admin" ? supabase.from("domiciliarios").select("id, nombre").eq("activo", true).order("nombre") : { data: [] },
  ]);

  const ventasPorPedido = (ventas ?? []).reduce(
    (acc, v) => {
      acc[v.pedido_id] = { fecha_venta: v.fecha_venta };
      return acc;
    },
    {} as Record<string, { fecha_venta: string }>
  );

  const pedidosConVenta = (pedidos ?? []).map((p) => {
    const rawV = p.vendedores as { nombre: string } | { nombre: string }[] | null;
    const rawD = p.domiciliarios as { nombre: string } | { nombre: string }[] | null;
    const v = Array.isArray(rawV) ? rawV[0] : rawV;
    const d = Array.isArray(rawD) ? rawD[0] : rawD;
    const rest = { ...p };
    delete (rest as { vendedores?: unknown }).vendedores;
    delete (rest as { domiciliarios?: unknown }).domiciliarios;
    return {
      ...rest,
      ventas: ventasPorPedido[p.id] ? [ventasPorPedido[p.id]] : null,
      vendedor_nombre: v?.nombre ?? null,
      domiciliario_nombre: d?.nombre ?? null,
    };
  });

  return (
    <PedidosClient
      pedidos={pedidosConVenta}
      domiciliarios={domiciliarios ?? []}
      esAdmin={ctx.rol === "admin"}
    />
  );
}
