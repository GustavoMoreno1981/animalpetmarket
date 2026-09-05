"use client";

import { useCart } from "@/context/CartContext";
import { aplicarIva, etiquetaIva, tieneIva } from "@/lib/iva";
import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProductoGaleria } from "./ProductoGaleria";

type Presentacion = {
  id: string;
  nombre: string;
  imagen: string | null;
  precio: number | null;
  orden: number;
  porcentaje_oferta?: number | null;
  iva_porcentaje?: number | null;
};

type Opcion = {
  nombre: string;
  precio: number;
  precioOriginal: number;
  porcentajeOferta: number;
  imagenIndex: number;
  ivaPorcentaje: number;
};

export function ProductoDetalle({
  productId,
  nombre,
  precioBase,
  ivaPorcentajeBase = 19,
  descripcion,
  imagenes,
  presentaciones,
  badge,
  porcentajeOfertaBase,
  datosMedicamento,
  datosAlimento,
  datosJuguete,
  peso,
  dimensiones,
}: {
  productId: string;
  nombre: string;
  precioBase: number;
  descripcion: string | null;
  imagenes: { url: string; label?: string }[];
  presentaciones: Presentacion[];
  ivaPorcentajeBase?: number;
  badge: string | null;
  porcentajeOfertaBase?: number | null;
  datosMedicamento: Record<string, string> | null;
  datosAlimento: Record<string, string> | null;
  datosJuguete: Record<string, string> | null;
  peso: number | null;
  dimensiones: string | null;
}) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [agregado, setAgregado] = useState(false);
  const sortedPresentaciones = [...presentaciones].sort((a, b) => a.orden - b.orden);
  const opciones: Opcion[] = [];
  let imgIdx = 1;
  for (const p of sortedPresentaciones) {
    const precioOrig = p.precio != null ? Number(p.precio) : precioBase;
    const oferta = p.porcentaje_oferta ?? 0;
    const precioBasePres = oferta > 0 ? precioOrig * (1 - oferta / 100) : precioOrig;
    const ivaPorcentaje = p.iva_porcentaje ?? ivaPorcentajeBase;
    const precioFinal = aplicarIva(precioBasePres, ivaPorcentaje);
    const imagenIndex = p.imagen ? imgIdx++ : 0;
    opciones.push({ nombre: p.nombre, precio: precioFinal, precioOriginal: precioBasePres, porcentajeOferta: oferta, imagenIndex, ivaPorcentaje });
  }

  if (opciones.length === 0) {
    const ofertaPrincipal = porcentajeOfertaBase ?? 0;
    const precioPrincipalBase = ofertaPrincipal > 0 ? precioBase * (1 - ofertaPrincipal / 100) : precioBase;
    const precioPrincipalFinal = aplicarIva(precioPrincipalBase, ivaPorcentajeBase);
    opciones.push({
      nombre,
      precio: precioPrincipalFinal,
      precioOriginal: precioPrincipalBase,
      porcentajeOferta: ofertaPrincipal,
      imagenIndex: 0,
      ivaPorcentaje: ivaPorcentajeBase,
    });
  }

  const [seleccionada, setSeleccionada] = useState(0);
  const [imagenActiva, setImagenActiva] = useState(0);

  const opcion = opciones[seleccionada];
  const precioActual = opcion?.precio ?? precioBase;
  const badgeOferta = opcion?.porcentajeOferta ? `${opcion.porcentajeOferta}% OFF` : null;
  const badgeFinal = badgeOferta ?? badge;

  const handleSeleccionar = (index: number) => {
    setSeleccionada(index);
    setImagenActiva(opciones[index]?.imagenIndex ?? 0);
  };

  const handleImagenChange = (imagenIndex: number) => {
    setImagenActiva(imagenIndex);
    const idx = opciones.findIndex((o) => o.imagenIndex === imagenIndex);
    if (idx >= 0) setSeleccionada(idx);
  };

  return (
    <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[1fr_1fr]">
      {/* Galería */}
      <ProductoGaleria
        imagenes={imagenes}
        nombre={nombre}
        badge={badgeFinal}
        imagenInicial={imagenActiva}
        onImagenChange={handleImagenChange}
      />

      {/* Info */}
      <div className="min-w-0 flex flex-col">
        <h1 className="break-words text-2xl font-black text-[var(--ca-purple)] sm:text-3xl">
          {nombre}
        </h1>

        {/* Precio destacado */}
        <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
          {opcion?.porcentajeOferta ? (
            <>
              <span className="text-base text-slate-500 line-through sm:text-lg">
                ${opcion.precioOriginal.toLocaleString("es-CO")}
              </span>
              <span className="text-2xl font-black text-[var(--ca-orange)] sm:text-3xl">
                ${precioActual.toLocaleString("es-CO")}
              </span>
              {tieneIva(opcion.ivaPorcentaje) && (
                <span className="text-xs text-slate-500">({etiquetaIva(opcion.ivaPorcentaje)})</span>
              )}
              <span className="rounded-full bg-[#ff6b35] px-2 py-0.5 text-xs font-bold text-white">
                {opcion.porcentajeOferta}% OFF
              </span>
            </>
          ) : (
            <span className="flex flex-wrap items-end gap-x-2 gap-y-1">
              <span className="text-2xl font-black text-[var(--ca-orange)] sm:text-3xl">
                ${precioActual.toLocaleString("es-CO")}
              </span>
              {tieneIva(opcion?.ivaPorcentaje) && (
                <span className="text-xs text-slate-500">({etiquetaIva(opcion?.ivaPorcentaje)})</span>
              )}
            </span>
          )}
        </div>

        {opcion && (
          <p className="mt-3 text-sm font-semibold text-slate-600">
            Presentación: <span className="text-slate-800">{opcion.nombre}</span>
          </p>
        )}

        {/* Presentaciones - seleccionables */}
        {opciones.length > 1 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-bold text-slate-600">
              Elige presentación
            </h3>
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              {opciones.map((op, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSeleccionar(i)}
                  className={`w-full rounded-xl border-2 px-4 py-2.5 text-left text-sm font-semibold transition sm:w-auto ${
                    seleccionada === i
                      ? "border-[var(--ca-purple)] bg-[var(--ca-purple)]/10 text-[var(--ca-purple)]"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="block break-words">{op.nombre}</span>
                  {op.porcentajeOferta ? (
                    <span className="mt-1 block sm:ml-1.5 sm:mt-0 sm:inline">
                      <span className="block text-slate-400 line-through sm:inline">${op.precioOriginal.toLocaleString("es-CO")}</span>
                      <span className="block font-black text-[var(--ca-orange)] sm:ml-1 sm:inline">${op.precio.toLocaleString("es-CO")}</span>
                    </span>
                  ) : (
                    <span className="mt-1 block font-black text-[var(--ca-orange)] sm:ml-1.5 sm:mt-0 sm:inline">
                      ${op.precio.toLocaleString("es-CO")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Descripción */}
        {descripcion && (
          <div className="mt-4">
            <h3 className="text-sm font-bold text-slate-600">Descripción</h3>
            <p className="mt-1 break-words whitespace-pre-wrap text-justify text-slate-700">{descripcion}</p>
          </div>
        )}

        {/* Datos técnicos */}
        {(datosMedicamento ||
          datosAlimento ||
          datosJuguete) && (
          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            {datosMedicamento &&
              Object.keys(datosMedicamento).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500">
                    Datos del medicamento
                  </h4>
                  <dl className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
                    {Object.entries(datosMedicamento).map(
                      ([k, v]) =>
                        v && (
                          <div key={k} className="min-w-0">
                            <dt className="text-slate-500 capitalize">
                              {k.replace(/_/g, " ")}:
                            </dt>
                            <dd className="break-words font-medium">{v}</dd>
                          </div>
                        )
                    )}
                  </dl>
                </div>
              )}
            {datosAlimento &&
              Object.keys(datosAlimento).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500">
                    Datos del alimento
                  </h4>
                  <dl className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
                    {Object.entries(datosAlimento).map(
                      ([k, v]) =>
                        v && (
                          <div key={k} className="min-w-0">
                            <dt className="text-slate-500 capitalize">
                              {k.replace(/_/g, " ")}:
                            </dt>
                            <dd className="break-words font-medium">{v}</dd>
                          </div>
                        )
                    )}
                  </dl>
                </div>
              )}
            {datosJuguete &&
              Object.keys(datosJuguete).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500">
                    Datos del juguete
                  </h4>
                  <dl className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
                    {Object.entries(datosJuguete).map(
                      ([k, v]) =>
                        v && (
                          <div key={k} className="min-w-0">
                            <dt className="text-slate-500 capitalize">
                              {k.replace(/_/g, " ")}:
                            </dt>
                            <dd className="break-words font-medium">{v}</dd>
                          </div>
                        )
                    )}
                  </dl>
                </div>
              )}
          </div>
        )}

        {/* Botones de pedido */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              addToCart({
                productId,
                nombre,
                presentacion: opcion?.nombre ?? nombre,
                precio: precioActual,
                imagen: imagenes[imagenActiva]?.url ?? null,
              });
              setAgregado(true);
              setTimeout(() => setAgregado(false), 2000);
              router.push("/carrito");
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3.5 font-bold text-white shadow-lg transition ${
              agregado
                ? "bg-green-500 shadow-green-500/30"
                : "bg-gradient-to-r from-[var(--ca-orange)] to-[#ff9b23] shadow-orange-300/40 hover:brightness-105"
            }`}
          >
            <ShoppingCart size={20} />
            {agregado ? "¡Agregado!" : "Agregar al carrito"}
          </button>
        </div>

        {peso != null && (
          <p className="mt-4 break-words text-xs text-slate-500">
            Peso: {peso} kg
            {dimensiones && ` • ${dimensiones}`}
          </p>
        )}
      </div>
    </div>
  );
}
