"use client";

import { obtenerPedidoPorId, type PedidoResumen } from "@/app/checkout/actions";
import { etiquetaMetodoPago } from "@/lib/pedidos";
import { Check, Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function PedidoConfirmacion({ pedido }: { pedido: PedidoResumen }) {
  const [pedidoActual, setPedidoActual] = useState(pedido);

  const items = (() => {
    const i = pedidoActual.pedido_items;
    return Array.isArray(i) ? i : i ? [i] : [];
  })();

  const total =
    typeof pedidoActual.total === "string"
      ? parseFloat(pedidoActual.total)
      : Number(pedidoActual.total);
  const numeroOrden =
    pedidoActual.numero_orden != null
      ? `ORD-${String(pedidoActual.numero_orden).padStart(4, "0")}`
      : "-";

  async function actualizarEstado() {
    const p = await obtenerPedidoPorId(pedidoActual.id);
    if (p) setPedidoActual(p);
  }

  function descargarFactura() {
    const token = pedidoActual.token_factura;
    if (!token) return;
    window.open(
      `/factura/${pedidoActual.id}?token=${encodeURIComponent(token)}`,
      "_blank",
      "noopener"
    );
  }

  return (
    <div className="mx-auto mt-6 max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <Check size={28} className="text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[var(--ca-purple)]">
                  ¡Pedido realizado!
                </h1>
                <p className="mt-1 text-slate-600">Pago contra entrega</p>
                <p className="mt-2 text-3xl font-black text-[var(--ca-orange)]">
                  {numeroOrden}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  pedidoActual.estado === "despachado"
                    ? "bg-green-100 text-green-800"
                    : pedidoActual.estado === "pendiente"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {pedidoActual.estado}
              </span>
              <button
                type="button"
                onClick={actualizarEstado}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                title="Actualizar estado"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <h3 className="text-xs font-bold uppercase text-slate-500">Cliente</h3>
            <p className="mt-2 font-semibold text-slate-800">
              {pedidoActual.nombre_cliente}
            </p>
            <p className="text-sm text-slate-600">Tel: {pedidoActual.telefono}</p>
            <p className="text-sm text-slate-600">{pedidoActual.direccion}</p>
            {pedidoActual.notas && (
              <p className="mt-2 text-sm italic text-slate-600">
                Notas: {pedidoActual.notas}
              </p>
            )}
            <p className="mt-2 text-sm text-slate-600">
              Método de pago: <span className="font-semibold">{etiquetaMetodoPago(pedidoActual.metodo_pago)}</span>
            </p>
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase text-slate-500">
              Productos
            </h3>
            <ul className="mt-2 space-y-2 border-t border-slate-200 pt-2">
              {items.map((item, i) => {
                const subtotal =
                  typeof item.subtotal === "string"
                    ? parseFloat(item.subtotal)
                    : item.subtotal;
                return (
                  <li
                    key={i}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-slate-600">
                      {item.nombre} ({item.presentacion}) x{item.cantidad}
                    </span>
                    <span className="font-semibold">
                      ${subtotal.toLocaleString("es-CO")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mt-4 text-right text-xl font-black text-[var(--ca-orange)]">
            Total: ${total.toLocaleString("es-CO")}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={descargarFactura}
              disabled={!pedidoActual.token_factura}
              title={!pedidoActual.token_factura ? "Factura no disponible" : undefined}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[var(--ca-purple)] bg-[var(--ca-purple)]/10 px-6 py-3.5 font-bold text-[var(--ca-purple)] transition hover:bg-[var(--ca-purple)]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={22} />
              Descargar factura
            </button>
            <Link
              href="/"
              className="flex flex-1 items-center justify-center rounded-xl bg-[var(--ca-purple)] px-6 py-3.5 font-bold text-white transition hover:opacity-90"
            >
              Ir a la tienda
            </Link>
          </div>
        </div>
    </div>
  );
}