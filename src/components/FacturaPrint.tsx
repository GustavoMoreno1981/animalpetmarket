"use client";

import { tieneIva } from "@/lib/iva";
import { etiquetaMetodoPago } from "@/lib/pedidos";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export type PedidoItem = {
  nombre: string;
  presentacion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  aplica_iva?: boolean;
  iva_porcentaje?: number | null;
};

export type PedidoFactura = {
  numero_orden: number | null;
  nombre_cliente: string;
  telefono: string;
  direccion: string;
  notas: string | null;
  metodo_pago?: string | null;
  total: number;
  estado: string;
  created_at: string;
  pedido_items: PedidoItem[] | PedidoItem | null;
};

export function FacturaPrint({
  pedido,
  standalone = false,
}: {
  pedido: PedidoFactura;
  standalone?: boolean;
}) {
  const router = useRouter();

  const items = (() => {
    const i = pedido.pedido_items;
    return Array.isArray(i) ? i : i ? [i] : [];
  })();

  const total =
    typeof pedido.total === "string" ? parseFloat(pedido.total) : Number(pedido.total);
  const numeroOrden =
    pedido.numero_orden != null
      ? `ORD-${String(pedido.numero_orden).padStart(4, "0")}`
      : "-";
  const fecha = new Date(pedido.created_at).toLocaleString("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  });

  useEffect(() => {
    if (!standalone) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [standalone]);

  return (
    <div className="min-h-screen bg-white p-6 print:p-4">
      <div className="mb-6 flex gap-2 print:hidden">
        {standalone ? (
          <button
            onClick={() => window.close()}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
          >
            Cerrar
          </button>
        ) : (
          <button
            onClick={() => router.back()}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
          >
            Volver
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-[var(--ca-purple)] px-4 py-2 text-sm font-bold text-white"
        >
          Imprimir
        </button>
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="border-b-2 border-[var(--ca-purple)] pb-4 text-center">
          <h1 className="text-2xl font-black text-[var(--ca-purple)]">
            Pet Market Animal
          </h1>
          <p className="mt-1 text-slate-500">
            Factura de venta · Pago contra entrega
          </p>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4">
            <h3 className="text-xs font-bold uppercase text-slate-500">Cliente</h3>
            <p className="mt-2 font-semibold">{pedido.nombre_cliente}</p>
            <p className="text-sm">Tel: {pedido.telefono}</p>
            <p className="text-sm">{pedido.direccion}</p>
            {pedido.notas && (
              <p className="mt-2 text-sm italic text-slate-600">
                Notas: {pedido.notas}
              </p>
            )}
            <p className="mt-2 text-sm text-slate-600">
              Método de pago: {etiquetaMetodoPago(pedido.metodo_pago)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <h3 className="text-xs font-bold uppercase text-slate-500">Factura</h3>
            <p className="mt-2 font-bold">Nº {numeroOrden}</p>
            <p className="text-sm">Fecha: {fecha}</p>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${
                pedido.estado === "despachado"
                  ? "bg-green-100 text-green-800"
                  : pedido.estado === "pendiente"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-700"
              }`}
            >
              {pedido.estado}
            </span>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-500">
                Producto
              </th>
              <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-500">
                Cant.
              </th>
              <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-500">
                Precio unit.
              </th>
              <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-500">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const subtotal =
                typeof item.subtotal === "string"
                  ? parseFloat(item.subtotal)
                  : item.subtotal;
              const precio =
                typeof item.precio_unitario === "string"
                  ? parseFloat(item.precio_unitario)
                  : item.precio_unitario;
              return (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-3 py-2">
                    {item.nombre} ({item.presentacion})
                  </td>
                  <td className="px-3 py-2 text-right">{item.cantidad}</td>
                  <td className="px-3 py-2 text-right">
                    ${precio.toLocaleString("es-CO")}
                  </td>
                  <td className="px-3 py-2 text-right">
                    ${subtotal.toLocaleString("es-CO")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(() => {
          const totalesPorIva = items.reduce((acc, it) => {
            const subtotalItem =
              typeof it.subtotal === "string" ? parseFloat(it.subtotal) : it.subtotal;
            const porcentaje = typeof it.iva_porcentaje === "number"
              ? it.iva_porcentaje
              : (it.aplica_iva ? 19 : 0);
            if (!tieneIva(porcentaje)) return acc;
            const ivaItem = subtotalItem - subtotalItem / (1 + porcentaje / 100);
            acc[porcentaje] = (acc[porcentaje] ?? 0) + ivaItem;
            return acc;
          }, {} as Record<number, number>);
          const totalIva = Object.values(totalesPorIva).reduce((sum, valor) => sum + valor, 0);
          const subtotalSinIva = total - totalIva;
          const tasasIva = Object.entries(totalesPorIva)
            .filter(([, valor]) => valor > 0.01)
            .sort((a, b) => Number(b[0]) - Number(a[0]));
          return tasasIva.length > 0 ? (
            <div className="mt-4 space-y-1 text-right text-sm">
              <p>Subtotal (sin IVA): ${subtotalSinIva.toLocaleString("es-CO")}</p>
              {tasasIva.map(([porcentaje, valor]) => (
                <p key={porcentaje}>
                  IVA {porcentaje}%: ${valor.toLocaleString("es-CO")}
                </p>
              ))}
              <p className="text-lg font-black text-[var(--ca-orange)]">
                Total: ${total.toLocaleString("es-CO")}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-right text-lg font-black text-[var(--ca-orange)]">
              Total: ${total.toLocaleString("es-CO")}
            </p>
          );
        })()}

        <p className="mt-8 border-t border-slate-200 pt-4 text-center text-sm text-slate-500">
          Gracias por su compra. Pago contra entrega.
        </p>
      </div>
    </div>
  );
}
