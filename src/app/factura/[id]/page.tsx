import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { FacturaPrint } from "@/components/FacturaPrint";

export default async function FacturaPublicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token?.trim()) notFound();

  const supabase = createAdminClient();

  const { data: pedido } = await supabase
    .from("pedidos")
    .select(
      `
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
      token_factura,
      pedido_items (nombre, presentacion, cantidad, precio_unitario, subtotal, aplica_iva, iva_porcentaje)
    `
    )
    .eq("id", id)
    .single();

  if (!pedido || pedido.token_factura !== token.trim()) notFound();

  const pedidoSinToken = { ...pedido };
  delete (pedidoSinToken as { token_factura?: string }).token_factura;
  return <FacturaPrint pedido={pedidoSinToken} standalone />;
}
