import Footer from "@/components/Footer";
import Header from "@/components/Header";
import TopBar from "@/components/TopBar";
import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PedidoConfirmacion } from "./PedidoConfirmacion";

export default async function PedidoPage({
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
      estado,
      nombre_cliente,
      telefono,
      direccion,
      notas,
      metodo_pago,
      total,
      created_at,
      token_factura,
      pedido_items (nombre, presentacion, cantidad, precio_unitario, subtotal)
    `
    )
    .eq("id", id)
    .single();

  if (!pedido || pedido.token_factura !== token.trim()) notFound();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffeef7,transparent_42%),#fff7ef] text-slate-800">
      <main className="mx-auto w-full max-w-[1260px] px-3 pb-6 pt-3 sm:px-6">
        <TopBar />
        <Header />
        <PedidoConfirmacion pedido={pedido} />

        <Footer />
      </main>
    </div>
  );
}
