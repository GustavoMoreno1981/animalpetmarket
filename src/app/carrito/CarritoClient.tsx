"use client";

import { useCart } from "@/context/CartContext";
import { CheckoutModal } from "@/components/CheckoutModal";
import { type ConfiguracionDomicilio } from "@/lib/domicilios";
import {
  CreditCard,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function CarritoClient({ configDomicilio }: { configDomicilio: ConfiguracionDomicilio }) {
  const { items, removeFromCart, updateCantidad, getTotalItems, getTotalPrecio } =
    useCart();
  const [modalAbierto, setModalAbierto] = useState(false);

  const total = getTotalPrecio();
  const totalItems = getTotalItems();

  return (
    <section className="mt-6">
      <h1 className="text-3xl font-black text-[var(--ca-purple)]">
        Mi carrito
      </h1>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <ShoppingCart className="mx-auto text-slate-300" size={64} />
          <p className="mt-4 text-lg font-semibold text-slate-600">
            Tu carrito está vacío
          </p>
          <p className="mt-1 text-slate-500">
            Agrega productos desde la tienda para verlos aquí.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-[var(--ca-purple)] px-6 py-3 font-bold text-white transition hover:brightness-110"
          >
            Ir a la tienda
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Lista de productos */}
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.presentacion}`}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                {item.imagen ? (
                  <img
                    src={item.imagen}
                    alt={item.nombre}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100">
                    <ShoppingCart className="text-slate-400" size={24} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-800">{item.nombre}</h3>
                  <p className="text-sm text-slate-500">{item.presentacion}</p>
                  <p className="mt-1 font-black text-[var(--ca-orange)]">
                    ${item.precio.toLocaleString("es-CO")} c/u
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateCantidad(
                        item.productId,
                        item.presentacion,
                        item.cantidad - 1
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-bold">{item.cantidad}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateCantidad(
                        item.productId,
                        item.presentacion,
                        item.cantidad + 1
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <p className="min-w-[80px] text-right font-bold text-slate-800">
                  ${(item.precio * item.cantidad).toLocaleString("es-CO")}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    removeFromCart(item.productId, item.presentacion)
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Eliminar"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          {/* Resumen y botones */}
          <div className="h-fit rounded-2xl border border-[#f3dcff] bg-white p-6 shadow-[0_10px_26px_rgba(123,31,162,0.12)]">
            <h3 className="text-lg font-black text-slate-800">
              Resumen del pedido
            </h3>
            <div className="mt-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-slate-600">
                {totalItems} producto{totalItems !== 1 ? "s" : ""}
              </span>
              <span className="font-bold text-slate-800">
                ${total.toLocaleString("es-CO")}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg font-black text-slate-800">Total</span>
              <span className="text-2xl font-black text-[var(--ca-orange)]">
                ${total.toLocaleString("es-CO")}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setModalAbierto(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--ca-orange)] to-[#ff9b23] px-6 py-3.5 text-center font-bold text-white shadow-lg shadow-orange-300/40 transition hover:brightness-105"
              >
                <CreditCard size={20} />
                Realizar pedido a contra entrega
              </button>
              <CheckoutModal
                open={modalAbierto}
                onClose={() => setModalAbierto(false)}
                configDomicilio={configDomicilio}
                items={items.map((i) => ({
                  productId: i.productId,
                  nombre: i.nombre,
                  presentacion: i.presentacion,
                  precio: i.precio,
                  cantidad: i.cantidad,
                }))}
                total={total}
              />
              <Link
                href="/"
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-6 py-3.5 text-center font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
