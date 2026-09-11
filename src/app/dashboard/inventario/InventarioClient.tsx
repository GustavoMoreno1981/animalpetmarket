"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, LogOut, Package, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { agregarLote, darSalidaLote } from "./actions";
import { StickerLote } from "./StickerLote";

type Presentacion = {
  id: string;
  nombre: string;
  producto_id: string;
  productos: { id: string; nombre: string } | null;
};

const ITEMS_POR_PAGINA = 8;

type Lote = {
  id: string;
  lote: string;
  cantidad: number;
  fecha_vencimiento: string;
  created_at?: string;
  producto_presentacion_id: string;
  producto_presentaciones: {
    id: string;
    nombre: string;
    productos: { id: string; nombre: string } | null;
  } | null;
};

export function InventarioClient({
  presentaciones,
  lotes,
  focoPresentacionId,
}: {
  presentaciones: Presentacion[];
  lotes: Lote[];
  focoPresentacionId: string | null;
}) {
  const [productoPresentacionId, setProductoPresentacionId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [loading, setLoading] = useState(false);
  const [salidaLoteId, setSalidaLoteId] = useState<string | null>(null);
  const [salidaCantidad, setSalidaCantidad] = useState("");
  const [salidaLoading, setSalidaLoading] = useState(false);
  const [salidaError, setSalidaError] = useState<string | null>(null);
  const [agregarError, setAgregarError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const focoRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (focoPresentacionId && focoRef.current) {
      focoRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focoPresentacionId]);

  const hoy = new Date().toISOString().slice(0, 10);
  const en30Dias = new Date();
  en30Dias.setDate(en30Dias.getDate() + 30);
  const limiteAlerta = en30Dias.toISOString().slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoPresentacionId || !cantidad || !fechaVencimiento) return;
    setAgregarError(null);
    setLoading(true);
    const result = await agregarLote(productoPresentacionId, parseInt(cantidad, 10), fechaVencimiento);
    setLoading(false);
    if ("error" in result && result.error) {
      setAgregarError(result.error);
    } else {
      setCantidad("");
      setFechaVencimiento("");
      setProductoPresentacionId("");
      router.refresh();
    }
  };

  const handleDarSalida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salidaLoteId || !salidaCantidad) return;
    const cant = parseInt(salidaCantidad, 10);
    if (cant < 1) return;
    setSalidaError(null);
    setSalidaLoading(true);
    const result = await darSalidaLote(salidaLoteId, cant);
    setSalidaLoading(false);
    if ("error" in result && result.error) {
      setSalidaError(result.error);
    } else {
      setSalidaLoteId(null);
      setSalidaCantidad("");
      router.refresh();
    }
  };

  const stockPorPresentacion = lotes.reduce(
    (acc, l) => {
      const key = l.producto_presentacion_id;
      if (!acc[key]) acc[key] = { total: 0, lotes: [] };
      acc[key].total += typeof l.cantidad === "string" ? parseInt(l.cantidad, 10) : l.cantidad;
      acc[key].lotes.push(l);
      return acc;
    },
    {} as Record<string, { total: number; lotes: Lote[] }>
  );

  const presentacionesConStock = presentaciones.map((p) => {
    const stock = stockPorPresentacion[p.id];
    const total = stock?.total ?? 0;
    const lotesList = stock?.lotes ?? [];
    const proximoVencimiento = lotesList
      .filter((l) => l.fecha_vencimiento >= hoy)
      .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))[0];
    const vencePronto = proximoVencimiento && proximoVencimiento.fecha_vencimiento <= limiteAlerta;
    return {
      ...p,
      total,
      lotesList,
      proximoVencimiento: proximoVencimiento?.fecha_vencimiento,
      vencePronto,
    };
  });

  const term = busqueda.trim().toLowerCase();
  const presentacionesFiltradas = term
    ? presentacionesConStock.filter((p) => {
        const prodNombre = (p.productos?.nombre ?? "").toLowerCase();
        const presNombre = (p.nombre ?? "").toLowerCase();
        const lotesStr = p.lotesList.map((l) => l.lote.toLowerCase()).join(" ");
        return (
          prodNombre.includes(term) ||
          presNombre.includes(term) ||
          lotesStr.includes(term)
        );
      })
    : presentacionesConStock;

  const totalPaginas = Math.ceil(presentacionesFiltradas.length / ITEMS_POR_PAGINA) || 1;
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const presentacionesPaginadas = presentacionesFiltradas.slice(inicio, inicio + ITEMS_POR_PAGINA);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[var(--ca-purple)]">Inventario</h1>
        <p className="mt-2 text-slate-600">
          Gestiona lotes, cantidades y fechas de vencimiento por presentación.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
      >
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-700">
          <Plus size={20} />
          Ingresar lote
        </h2>
        {agregarError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {agregarError}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Producto / Presentación
            </label>
            <select
              value={productoPresentacionId}
              onChange={(e) => setProductoPresentacionId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            >
              <option value="">Seleccionar...</option>
              {presentaciones.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.productos?.nombre ?? "Producto"} – {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Cantidad</label>
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Fecha vencimiento
            </label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--ca-purple)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Agregar"}
            </button>
          </div>
        </div>
      </form>

      <div>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-700">
            <Package size={20} />
            Stock por presentación
          </h2>
          <div className="relative max-w-xs flex-1 sm:max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
              placeholder="Buscar producto, presentación o lote..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--ca-purple)] focus:ring-2 focus:ring-[var(--ca-purple)]/20"
            />
          </div>
        </div>
        {presentacionesFiltradas.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            {term
              ? "No se encontraron productos con esa búsqueda."
              : "No hay presentaciones. Crea productos y presentaciones primero."}
          </div>
        ) : (
          <>
          <div className="space-y-4">
            {presentacionesPaginadas.map((p) => {
              const prod = p.productos;
              const esFoco = focoPresentacionId === p.id;
              return (
                <div
                  key={p.id}
                  ref={esFoco ? focoRef : undefined}
                  className={`overflow-hidden rounded-2xl border bg-white transition-shadow ${
                    esFoco ? "border-[var(--ca-purple)] ring-2 ring-[var(--ca-purple)]/30" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-4">
                    <div>
                      <p className="font-bold text-slate-800">
                        {prod?.nombre ?? "Producto"} – {p.nombre}
                      </p>
                      <p className="text-sm text-slate-500">
                        Stock total: <strong>{p.total}</strong> unidades
                      </p>
                    </div>
                    {p.vencePronto && p.proximoVencimiento && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        <AlertTriangle size={14} />
                        Vence {new Date(p.proximoVencimiento).toLocaleDateString("es-CO")}
                      </span>
                    )}
                  </div>
                  {p.lotesList.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="px-4 py-2 text-left font-semibold text-slate-600">
                              Lote
                            </th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-600">
                              Cantidad
                            </th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-600">
                              Vencimiento
                            </th>
                            <th className="px-4 py-2 text-right font-semibold text-slate-600">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.lotesList.map((l) => {
                            const cant = typeof l.cantidad === "string" ? parseInt(l.cantidad, 10) : l.cantidad;
                            const vencido = l.fecha_vencimiento < hoy;
                            const mostrandoSalida = salidaLoteId === l.id;
                            return (
                              <tr
                                key={l.id}
                                className={`border-b border-slate-50 ${vencido ? "bg-red-50/50 text-slate-500" : ""}`}
                              >
                                <td className="px-4 py-2 font-mono">{l.lote}</td>
                                <td className="px-4 py-2">{cant}</td>
                                <td className="px-4 py-2">
                                  {new Date(l.fecha_vencimiento).toLocaleDateString("es-CO")}
                                  {vencido && (
                                    <span className="ml-2 text-xs text-red-600">(vencido)</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                  <StickerLote lote={l} />
                                  {mostrandoSalida ? (
                                    <form
                                      onSubmit={handleDarSalida}
                                      className="flex flex-col items-end gap-2"
                                    >
                                      {salidaError && (
                                        <span className="text-xs text-red-600">{salidaError}</span>
                                      )}
                                      <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min={1}
                                        max={cant}
                                        value={salidaCantidad}
                                        onChange={(e) => setSalidaCantidad(e.target.value)}
                                        placeholder="Cant."
                                        className="w-16 rounded border border-slate-200 px-2 py-1 text-sm"
                                        autoFocus
                                      />
                                      <button
                                        type="submit"
                                        disabled={salidaLoading || !salidaCantidad}
                                        className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                                      >
                                        {salidaLoading ? "..." : "Dar salida"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSalidaLoteId(null);
                                          setSalidaCantidad("");
                                          setSalidaError(null);
                                        }}
                                        className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                                      >
                                        Cancelar
                                      </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSalidaLoteId(l.id);
                                        setSalidaCantidad(String(cant));
                                      }}
                                      className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                      title="Dar salida (descontar del inventario)"
                                    >
                                      <LogOut size={12} />
                                      Dar salida
                                    </button>
                                    </>
                                  )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="p-4 text-sm text-slate-500">Sin stock registrado</p>
                  )}
                </div>
              );
            })}
          </div>
          {presentacionesFiltradas.length > ITEMS_POR_PAGINA && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-slate-500">
                Mostrando {inicio + 1}-{Math.min(inicio + ITEMS_POR_PAGINA, presentacionesFiltradas.length)} de {presentacionesFiltradas.length} presentaciones
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaActual <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="min-w-[100px] text-center text-sm font-medium text-slate-600">
                  Página {paginaActual} de {totalPaginas}
                </span>
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual >= totalPaginas}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
