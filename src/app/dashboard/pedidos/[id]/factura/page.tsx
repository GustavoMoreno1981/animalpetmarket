import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { FacturaPrint } from "@/components/FacturaPrint";

export default async function FacturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

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
      total,
      estado,
      created_at,
      pedido_items (nombre, presentacion, cantidad, precio_unitario, subtotal, aplica_iva, iva_porcentaje)
    `
    )
    .eq("id", id)
    .single();

  if (!pedido) notFound();

  return <FacturaPrint pedido={pedido} />;
}
