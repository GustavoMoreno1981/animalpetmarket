"use client";

import { useCart } from "@/context/CartContext";
import {
  etiquetaMetodoPago,
  METODO_PAGO_POR_DEFECTO,
  METODOS_PAGO_PEDIDO,
  type MetodoPagoPedido,
} from "@/lib/pedidos";
import { Check, Package, Tag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { crearPedido, validarCupon } from "./actions";

export function CheckoutClient() {
  const router = useRouter();
  const { items, getTotalPrecio, clearCart } = useCart();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPagoPedido>(METODO_PAGO_POR_DEFECTO);
  const [cuponCodigo, setCuponCodigo] = useState("");
  const [cuponAplicado, setCuponAplicado] = useState<{ porcentaje: number } | null>(null);
  const [cuponError, setCuponError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = getTotalPrecio();
  const descuento = cuponAplicado ? total * (cuponAplicado.porcentaje / 100) : 0;
  const totalConDescuento = total - descuento;

  async function handleAplicarCupon() {
    setCuponError(null);
    if (!cuponCodigo.trim()) return;
    const res = await validarCupon(cuponCodigo);
    if (res.valid) {
      setCuponAplicado({ porcentaje: res.porcentaje });
    } else {
      setCuponAplicado(null);
      setCuponError(res.error);
    }
  }

  if (items.length === 0) {
    return (
      <section className="mt-6">
        <h1 className="text-3xl font-black text-[var(--ca-purple)]">
          Finalizar compra
        </h1>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-slate-600">
            Tu carrito está vacío
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-[var(--ca-purple)] font-bold hover:underline"
          >
            Ir a la tienda
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <Link
        href="/carrito"
        className="mb-4 inline-block text-sm font-semibold text-[var(--ca-purple)] hover:underline"
      >
        ← Volver al carrito
      </Link>

      <h1 className="text-3xl font-black text-[var(--ca-purple)]">
        Finalizar compra
      </h1>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Package size={20} className="text-amber-600" />
        <p className="text-sm font-medium text-amber-800">
          Pago contra entrega. No realizamos cobros en línea. Pagas cuando recibes tu pedido.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Formulario */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">
            Datos de entrega
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Completa tus datos para el envío (pago contra entrega)
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Nombre completo *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                maxLength={120}
                className="h-11 w-full rounded-xl border border-slate-200 px-4"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Teléfono / WhatsApp *
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="300 123 4567"
                maxLength={15}
                className="h-11 w-full rounded-xl border border-slate-200 px-4"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Dirección de entrega *
              </label>
              <textarea
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Barrancabermeja, dirección completa"
                rows={3}
                maxLength={300}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                ¿Cómo vas a pagar? *
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {METODOS_PAGO_PEDIDO.map((opcion) => (
                  <label
                    key={opcion}
                    className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      metodoPago === opcion
                        ? "border-[var(--ca-purple)] bg-[var(--ca-purple)]/10 text-[var(--ca-purple)]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="metodo_pago"
                      value={opcion}
                      checked={metodoPago === opcion}
                      onChange={() => setMetodoPago(opcion)}
                      className="sr-only"
                    />
                    {etiquetaMetodoPago(opcion)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Notas del pedido
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Instrucciones especiales..."
                rows={2}
                maxLength={500}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="h-fit rounded-2xl border border-[#f3dcff] bg-white p-6 shadow-[0_10px_26px_rgba(123,31,162,0.12)]">
          <h2 className="text-lg font-bold text-slate-800">
            Resumen del pedido
          </h2>
          <ul className="mt-4 space-y-2 border-b border-slate-100 pb-4">
            {items.map((i) => (
              <li
                key={`${i.productId}-${i.presentacion}`}
                className="flex justify-between text-sm"
              >
                <span className="text-slate-600">
                  {i.nombre} ({i.presentacion}) x{i.cantidad}
                </span>
                <span className="font-semibold">
                  ${(i.precio * i.cantidad).toLocaleString("es-CO")}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={cuponCodigo}
                onChange={(e) => {
                  setCuponCodigo(e.target.value.toUpperCase());
                  setCuponAplicado(null);
                  setCuponError(null);
                }}
                placeholder="Código de cupón"
                maxLength={6}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono uppercase"
              />
              <button
                type="button"
                onClick={handleAplicarCupon}
                className="rounded-lg border border-[var(--ca-purple)] px-3 py-2 text-sm font-bold text-[var(--ca-purple)] hover:bg-[var(--ca-purple)]/10"
              >
                <Tag size={16} className="inline" /> Aplicar
              </button>
            </div>
            {cuponError && <p className="text-sm text-red-600">{cuponError}</p>}
            {cuponAplicado && (
              <p className="text-sm font-semibold text-green-600">
                Cupón aplicado: -{cuponAplicado.porcentaje}%
              </p>
            )}
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Método de pago</span>
              <span className="font-semibold text-slate-800">{etiquetaMetodoPago(metodoPago)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>${total.toLocaleString("es-CO")}</span>
            </div>
            {cuponAplicado && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento ({cuponAplicado.porcentaje}%)</span>
                <span>-${descuento.toLocaleString("es-CO")}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black pt-2">
              <span>Total</span>
              <span className="text-[var(--ca-orange)]">
                ${totalConDescuento.toLocaleString("es-CO")}
              </span>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setError(null);
                setLoading(true);
                const result = await crearPedido(
                  nombre,
                  telefono,
                  direccion,
                  notas || null,
                  items.map((i) => ({
                    productId: i.productId,
                    nombre: i.nombre,
                    presentacion: i.presentacion,
                    precio: i.precio,
                    cantidad: i.cantidad,
                  })),
                  total,
                  cuponAplicado ? cuponCodigo.trim() : null,
                  { metodoPago }
                );
                setLoading(false);
                if ("error" in result && result.error) {
                  setError(result.error);
                  return;
                }
                clearCart();
                const tokenParam = result.tokenFactura
                  ? `?token=${encodeURIComponent(result.tokenFactura)}`
                  : "";
                router.push(`/pedido/${result.pedidoId}${tokenParam}`);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--ca-purple)] to-[#8e24aa] px-6 py-3.5 font-bold text-white shadow-lg shadow-purple-500/30 transition hover:brightness-110 disabled:opacity-60"
            >
              <Check size={22} />
              Finalizar compra
            </button>
            <Link
              href="/"
              className="flex w-full items-center justify-center rounded-xl border-2 border-slate-200 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
