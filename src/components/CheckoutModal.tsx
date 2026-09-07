"use client";

import { useCart } from "@/context/CartContext";
import { crearPedido, validarCupon } from "@/app/checkout/actions";
import { calcularResumenDomicilio, etiquetaValorDomicilio, type ConfiguracionDomicilio } from "@/lib/domicilios";
import {
  etiquetaMetodoPago,
  METODO_PAGO_POR_DEFECTO,
  METODOS_PAGO_PEDIDO,
  type MetodoPagoPedido,
} from "@/lib/pedidos";
import { Check, ChevronRight, Package, Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CartItem = {
  productId: string;
  nombre: string;
  presentacion: string;
  precio: number;
  cantidad: number;
};

const PASOS = [
  { id: 1, titulo: "Hola, ¿cómo te llamas?", campo: "nombre", placeholder: "Tu nombre" },
  { id: 2, titulo: "¿Cuál es tu teléfono?", campo: "telefono", placeholder: "300 123 4567" },
  { id: 3, titulo: "¿Cuál es tu dirección de entrega?", campo: "direccion", placeholder: "Barrancabermeja, dirección completa" },
  { id: 4, titulo: "¿Alguna nota para el pedido? (opcional)", campo: "notas", placeholder: "Instrucciones especiales..." },
];

export function CheckoutModal({
  open,
  onClose,
  configDomicilio,
  items,
  total,
}: {
  open: boolean;
  onClose: () => void;
  configDomicilio: ConfiguracionDomicilio;
  items: CartItem[];
  total: number;
}) {
  const { clearCart } = useCart();
  const router = useRouter();
  const [paso, setPaso] = useState(1);
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

  if (!open) return null;

  const pasoActual = PASOS[paso - 1];
  const valorActual =
    pasoActual?.campo === "nombre"
      ? nombre
      : pasoActual?.campo === "telefono"
        ? telefono
        : pasoActual?.campo === "direccion"
          ? direccion
          : notas;
  const setValor =
    pasoActual?.campo === "nombre"
      ? setNombre
      : pasoActual?.campo === "telefono"
        ? setTelefono
        : pasoActual?.campo === "direccion"
          ? setDireccion
          : setNotas;

  function handleCerrar() {
    setPaso(1);
    setNombre("");
    setTelefono("");
    setDireccion("");
    setNotas("");
    setMetodoPago(METODO_PAGO_POR_DEFECTO);
    setCuponCodigo("");
    setCuponAplicado(null);
    setCuponError(null);
    setError(null);
    onClose();
  }

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

  const resumen = calcularResumenDomicilio({
    subtotalProductos: total,
    valorDomicilioBase: configDomicilio.valor_domicilio_base,
    domicilioGratis: configDomicilio.domicilio_gratis_activo,
    porcentajeDescuento: cuponAplicado?.porcentaje ?? 0,
  });

  function handleSiguiente() {
    setError(null);
    if (paso < 4) {
      setPaso(paso + 1);
    } else if (paso === 4) {
      setPaso(5);
    }
  }

  function handleAtras() {
    setError(null);
    if (paso > 1) setPaso(paso - 1);
  }

  async function handleFinalizar() {
    setError(null);
    setLoading(true);
    const result = await crearPedido(
      nombre.trim(),
      telefono.trim(),
      direccion.trim(),
      notas.trim() || null,
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
    onClose();
    const tokenParam = result.tokenFactura
      ? `?token=${encodeURIComponent(result.tokenFactura)}`
      : "";
    router.push(`/pedido/${result.pedidoId}${tokenParam}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={handleCerrar}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Cerrar"
        >
          <X size={22} />
        </button>

        <div className="max-h-[85vh] overflow-y-auto p-6 pt-12">
          {paso <= 4 ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[var(--ca-purple)]">
                {pasoActual?.titulo}
              </h2>
              <input
                type={pasoActual?.campo === "telefono" ? "tel" : "text"}
                value={valorActual}
                onChange={(e) => setValor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (
                      (paso === 1 && nombre.trim()) ||
                      (paso === 2 && telefono.trim()) ||
                      (paso === 3 && direccion.trim()) ||
                      (paso === 4 && nombre.trim() && telefono.trim() && direccion.trim())
                    ) {
                      handleSiguiente();
                    }
                  }
                }}
                placeholder={pasoActual?.placeholder}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-lg outline-none transition focus:border-[var(--ca-purple)]"
                autoFocus
              />
              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                {paso > 1 && (
                  <button
                    type="button"
                    onClick={handleAtras}
                    className="rounded-xl border-2 border-slate-200 px-6 py-3 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Atrás
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSiguiente}
                  disabled={
                    (paso === 1 && !nombre.trim()) ||
                    (paso === 2 && !telefono.trim()) ||
                    (paso === 3 && !direccion.trim()) ||
                    (paso === 4 &&
                      (!nombre.trim() || !telefono.trim() || !direccion.trim()))
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--ca-purple)] px-6 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  Siguiente
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[var(--ca-purple)]">
                Resumen de tu pedido
              </h2>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="font-semibold text-slate-800">{nombre}</p>
                <p className="text-sm text-slate-600">{telefono}</p>
                <p className="text-sm text-slate-600">{direccion}</p>
                {notas && (
                  <p className="mt-2 text-sm italic text-slate-600">Notas: {notas}</p>
                )}
              </div>
              <ul className="space-y-2 border-t border-slate-200 pt-4">
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
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  ¿Cómo vas a pagar tu pedido?
                </p>
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
              {paso === 5 && (
                <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
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
              )}
              <p className="text-right text-sm text-slate-600">
                Método de pago: <span className="font-semibold text-slate-800">{etiquetaMetodoPago(metodoPago)}</span>
              </p>
              <p className="mt-2 text-right text-sm text-slate-500">
                Subtotal: ${resumen.subtotalProductos.toLocaleString("es-CO")}
              </p>
              <p className="text-right text-sm text-slate-500">
                Domicilio: {etiquetaValorDomicilio(resumen.valorDomicilioCobrado, resumen.domicilioEsGratis)}
              </p>
              {cuponAplicado && (
                <p className="text-right text-sm text-green-600">
                  Descuento ({cuponAplicado.porcentaje}%): -${resumen.descuento.toLocaleString("es-CO")}
                </p>
              )}
              <p className="text-right text-xl font-black text-[var(--ca-orange)]">
                Total: ${resumen.total.toLocaleString("es-CO")}
              </p>
              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAtras}
                  className="rounded-xl border-2 border-slate-200 px-6 py-3 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={handleFinalizar}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--ca-orange)] to-[#ff9b23] px-6 py-3.5 font-bold text-white shadow-lg disabled:opacity-60"
                >
                  {loading ? (
                    "Procesando..."
                  ) : (
                    <>
                      <Check size={22} />
                      Finalizar pedido
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {paso <= 5 && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Package size={16} />
                {items.length} producto{items.length !== 1 ? "s" : ""}
              </span>
              <span className="font-bold text-slate-700">
                ${resumen.total.toLocaleString("es-CO")}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
