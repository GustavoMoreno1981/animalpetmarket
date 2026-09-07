"use client";

import { etiquetaValorDomicilio, normalizarMonto } from "@/lib/domicilios";
import { etiquetaMetodoPago } from "@/lib/pedidos";
import { Bike, Camera, MapPin, Phone, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { marcarEntregado } from "./marcarEntregadoActions";

type PedidoItem = {
  nombre: string;
  presentacion: string;
  cantidad: number;
  subtotal: number;
};

type Pedido = {
  id: string;
  numero_orden: number | null;
  nombre_cliente: string;
  telefono: string;
  direccion: string;
  notas: string | null;
  metodo_pago?: string | null;
  valor_domicilio_cobrado?: number | string | null;
  valor_domicilio_real?: number | string | null;
  domicilio_es_gratis?: boolean | null;
  total: number;
  estado: string;
  pedido_items: PedidoItem[] | PedidoItem | null;
};

function formatNumeroOrden(n: number | null): string {
  if (n == null) return "-";
  return `ORD-${String(n).padStart(4, "0")}`;
}

export function PedidosPorRepartirClient({
  pedidos,
  resumen,
}: {
  pedidos: Pedido[];
  resumen: {
    pedidosEntregados: number;
    totalPedidos: number;
    totalDomicilios: number;
  };
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalPedido, setModalPedido] = useState<Pedido | null>(null);
  const [fotoActual, setFotoActual] = useState<{ file: File; preview: string } | null>(null);
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function abrirModal(p: Pedido) {
    setError(null);
    setFotoActual(null);
    setCamaraAbierta(false);
    setErrorCamara(null);
    setModalPedido(p);
  }

  const cerrarCamara = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamaraAbierta(false);
    setErrorCamara(null);
  }, []);

  function cerrarModal() {
    cerrarCamara();
    if (fotoActual?.preview) URL.revokeObjectURL(fotoActual.preview);
    setFotoActual(null);
    setModalPedido(null);
    setError(null);
  }

  async function abrirCamara() {
    setErrorCamara(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      setCamaraAbierta(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo acceder a la cámara";
      setErrorCamara(msg);
    }
  }

  useEffect(() => {
    if (camaraAbierta && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [camaraAbierta]);

  function capturarFoto() {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `entrega-${Date.now()}.jpg`, { type: "image/jpeg" });
        if (fotoActual?.preview) URL.revokeObjectURL(fotoActual.preview);
        setFotoActual({ file, preview: URL.createObjectURL(blob) });
        cerrarCamara();
      },
      "image/jpeg",
      0.9
    );
  }

  async function handleMarcarEntregado() {
    if (!modalPedido) return;
    const total = typeof modalPedido.total === "string" ? parseFloat(modalPedido.total) : Number(modalPedido.total);
    if (!fotoActual?.file) {
      setError("Debes tomar una foto del pedido entregado");
      return;
    }
    setError(null);
    setLoading(modalPedido.id);
    const result = await marcarEntregado(modalPedido.id, total, fotoActual.file);
    setLoading(null);
    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      cerrarModal();
      window.location.reload();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-[var(--ca-purple)]">
          <Bike size={28} />
          Pedidos por repartir
        </h1>
        <p className="mt-2 text-slate-600">
          Toca un pedido para tomar la foto y marcarlo como entregado
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Pedidos entregados</p>
          <p className="mt-2 text-2xl font-black text-[var(--ca-purple)]">
            {resumen.pedidosEntregados}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Dinero acumulado en pedidos</p>
          <p className="mt-2 text-2xl font-black text-[var(--ca-orange)]">
            ${resumen.totalPedidos.toLocaleString("es-CO")}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Domicilios acumulados</p>
          <p className="mt-2 text-2xl font-black text-emerald-600">
            ${resumen.totalDomicilios.toLocaleString("es-CO")}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {pedidos.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Bike size={48} className="mx-auto text-slate-300" />
          <p className="mt-4 font-medium text-slate-600">No tienes pedidos por repartir</p>
          <p className="mt-1 text-sm text-slate-500">
            Los pedidos asignados aparecerán aquí cuando el administrador te los asigne
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((p) => {
            const total = normalizarMonto(p.total);
            const valorDomicilioReal = normalizarMonto(p.valor_domicilio_real);
            return (
              <div
                key={p.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-bold text-slate-800">
                      {formatNumeroOrden(p.numero_orden)} · {p.nombre_cliente}
                    </p>
                    <p className="text-sm text-slate-500">{p.direccion}</p>
                    <p className="text-xs font-medium text-slate-600">
                      Pago: {etiquetaMetodoPago(p.metodo_pago)}
                    </p>
                    <p className="text-xs font-medium text-slate-600">
                      Domicilio: {etiquetaValorDomicilio(p.valor_domicilio_cobrado, p.domicilio_es_gratis)}
                    </p>
                    <p className="text-xs font-medium text-slate-600">
                      Costo real domicilio: ${valorDomicilioReal.toLocaleString("es-CO")}
                    </p>
                    {p.estado !== "despachado" && (
                      <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        En preparación
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-black text-[var(--ca-orange)]">
                      ${total.toLocaleString("es-CO")}
                    </p>
                    <button
                      type="button"
                      onClick={() => abrirModal(p)}
                      className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-700"
                    >
                      <Camera size={18} />
                      Entregar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para tomar foto y marcar entregado */}
      {modalPedido && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && cerrarModal()}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <h2 className="font-bold text-slate-800">
                {formatNumeroOrden(modalPedido.numero_orden)} · {modalPedido.nombre_cliente}
              </h2>
              <button
                type="button"
                onClick={cerrarModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 p-4">
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 text-slate-700">
                  <Phone size={16} />
                  {modalPedido.telefono}
                </p>
                <p className="flex items-center gap-2 text-slate-700">
                  <MapPin size={16} />
                  {modalPedido.direccion}
                </p>
                {modalPedido.notas && (
                  <p className="text-slate-600">
                    <span className="font-medium">Notas:</span> {modalPedido.notas}
                  </p>
                )}
                <p className="text-slate-600">
                  <span className="font-medium">Método de pago:</span>{" "}
                  {etiquetaMetodoPago(modalPedido.metodo_pago)}
                </p>
                <p className="text-slate-600">
                  <span className="font-medium">Domicilio al cliente:</span>{" "}
                  {etiquetaValorDomicilio(modalPedido.valor_domicilio_cobrado, modalPedido.domicilio_es_gratis)}
                </p>
                <p className="text-slate-600">
                  <span className="font-medium">Costo real domicilio:</span>{" "}
                  ${normalizarMonto(modalPedido.valor_domicilio_real).toLocaleString("es-CO")}
                </p>
              </div>

              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                <p className="mb-4 font-semibold text-slate-700">
                  Toma una foto del pedido entregado
                </p>
                {camaraAbierta ? (
                  <div className="space-y-3">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={capturarFoto}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-bold text-white transition hover:bg-green-700"
                      >
                        <Camera size={24} />
                        Tomar foto
                      </button>
                      <button
                        type="button"
                        onClick={cerrarCamara}
                        className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : fotoActual?.preview ? (
                  <div className="space-y-3">
                    <img
                      src={fotoActual.preview}
                      alt="Vista previa"
                      className="mx-auto max-h-48 rounded-lg border border-slate-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={abrirCamara}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--ca-purple)] px-6 py-3 font-bold text-white transition hover:brightness-110"
                    >
                      <Camera size={20} />
                      Tomar otra foto
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={abrirCamara}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--ca-purple)] px-6 py-3 font-bold text-white transition hover:brightness-110"
                  >
                    <Camera size={24} />
                    Abrir cámara
                  </button>
                )}
                {errorCamara && (
                  <p className="mt-3 text-sm font-medium text-red-600">{errorCamara}</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleMarcarEntregado}
                disabled={loading === modalPedido.id || !fotoActual}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-4 font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                <Camera size={20} />
                {loading === modalPedido.id ? "Guardando..." : "Marcar como entregado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
