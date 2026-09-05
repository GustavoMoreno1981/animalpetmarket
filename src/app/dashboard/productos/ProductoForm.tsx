"use client";

import { IVA_OPCIONES, IVA_POR_DEFECTO } from "@/lib/iva";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type Presentacion = {
  id?: string;
  nombre: string;
  imagen?: string | null;
  precio?: string;
  porcentaje_oferta?: number | null;
  aplica_iva?: boolean | null;
  iva_porcentaje?: number | null;
};

const SECCIONES = [
  { id: "medicamento", label: "💊 Medicamentos", icon: "⚕️" },
  { id: "alimento", label: "🥩 Alimentos", icon: "🍗" },
  { id: "juguete", label: "🧸 Juguetes", icon: "🎾" },
  { id: "logistica", label: "🚚 Logística", icon: "📦" },
] as const;

type SeccionId = (typeof SECCIONES)[number]["id"];

type ProductoFormProps = {
  categorias: { id: string; nombre: string }[];
  subcategorias: { id: string; nombre: string; categoria_id: string }[];
  tiposProducto: { id: string; nombre: string; subcategoria_id: string }[];
  producto?: {
    nombre: string;
    descripcion: string | null;
    precio: number;
    aplica_iva?: boolean;
    iva_porcentaje?: number | null;
    imagen: string | null;
    subcategoria_id: string;
    tipo_producto_id: string;
    subcategoria_ids?: string[];
    peso: number | null;
    dimensiones: string | null;
    requiere_refrigeracion: boolean;
    producto_fragil: boolean;
    destacado: boolean;
    nuevo: boolean;
    mas_vendido: boolean;
    recomendado: boolean;
    porcentaje_oferta?: number | null;
    secciones_activas: string[];
    datos_medicamento: Record<string, unknown> | null;
    datos_alimento: Record<string, unknown> | null;
    datos_juguete: Record<string, unknown> | null;
  };
  presentaciones?: { id: string; nombre: string; imagen: string | null; precio: number | null; orden: number; porcentaje_oferta?: number | null; aplica_iva?: boolean | null; iva_porcentaje?: number | null }[];
  onSubmit: (formData: FormData) => Promise<{ error?: string } | { success?: boolean }>;
  onCancel?: () => void;
  loading: boolean;
  submitLabel: string;
};

export function ProductoForm({
  categorias,
  subcategorias,
  tiposProducto,
  producto,
  presentaciones = [],
  onSubmit,
  onCancel,
  loading,
  submitLabel,
}: ProductoFormProps) {
  const [categoriaPrincipalId, setCategoriaPrincipalId] = useState(
    subcategorias.find((sub) => sub.id === (producto?.subcategoria_id ?? ""))?.categoria_id ?? ""
  );
  const [subcategoriaPrincipalId, setSubcategoriaPrincipalId] = useState(
    producto?.subcategoria_id ?? ""
  );
  const [tipoProductoId, setTipoProductoId] = useState(producto?.tipo_producto_id ?? "");
  const [subcategoriasSeleccionadas, setSubcategoriasSeleccionadas] = useState<string[]>(
    producto?.subcategoria_ids ?? (producto?.subcategoria_id ? [producto.subcategoria_id] : [])
  );
  const [secciones, setSecciones] = useState<SeccionId[]>(
    (producto?.secciones_activas ?? []).filter((s): s is SeccionId =>
      SECCIONES.some((sec) => sec.id === s)
    )
  );
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<SeccionId | null>("medicamento");
  const [presentacionesList, setPresentacionesList] = useState<Presentacion[]>(
    presentaciones.length > 0
      ? presentaciones
          .sort((a, b) => a.orden - b.orden)
          .map((p) => ({
            id: p.id,
            nombre: p.nombre,
            imagen: p.imagen,
            precio: p.precio != null ? String(p.precio) : "",
            porcentaje_oferta: p.porcentaje_oferta ?? null,
            aplica_iva: p.aplica_iva ?? null,
            iva_porcentaje: p.iva_porcentaje ?? (p.aplica_iva === false ? 0 : IVA_POR_DEFECTO),
          }))
      : [{ nombre: "", imagen: null, precio: "", aplica_iva: null, iva_porcentaje: IVA_POR_DEFECTO }]
  );

  const toggleSeccion = (id: SeccionId) => {
    setSecciones((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const agregarPresentacion = () => {
    setPresentacionesList((prev) => [...prev, { nombre: "", imagen: null, precio: "", aplica_iva: null, iva_porcentaje: IVA_POR_DEFECTO }]);
  };

  const quitarPresentacion = (i: number) => {
    setPresentacionesList((prev) => prev.filter((_, idx) => idx !== i));
  };

  const toggleSubcategoria = (id: string) => {
    setSubcategoriasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const subcategoriasCategoriaActual = useMemo(
    () =>
      categoriaPrincipalId
        ? subcategorias.filter((subcategoria) => subcategoria.categoria_id === categoriaPrincipalId)
        : [],
    [categoriaPrincipalId, subcategorias]
  );

  const tiposProductoSubcategoriaActual = useMemo(
    () =>
      subcategoriaPrincipalId
        ? tiposProducto.filter((tipo) => tipo.subcategoria_id === subcategoriaPrincipalId)
        : [],
    [subcategoriaPrincipalId, tiposProducto]
  );

  const resolverTipoPredeterminado = (subcategoriaId: string) => {
    const tiposDisponibles = tiposProducto.filter((tipo) => tipo.subcategoria_id === subcategoriaId);
    if (tiposDisponibles.length === 0) return "";
    const general = tiposDisponibles.find((tipo) => tipo.nombre.toLowerCase() === "general");
    return general?.id ?? tiposDisponibles[0].id;
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const presentacionesValidas = presentacionesList.filter(
      (presentacion) => presentacion.nombre.trim() && String(presentacion.precio ?? "").trim()
    );
    if (presentacionesValidas.length === 0) {
      setError("Debes agregar al menos una presentación con gramaje y precio.");
      return;
    }
    const form = e.currentTarget;
    const formData = new FormData(form);

    formData.delete("subcategoria_ids");
    subcategoriasSeleccionadas
      .filter((id) => id !== subcategoriaPrincipalId)
      .forEach((id) => formData.append("subcategoria_ids", id));

    secciones.forEach((s) => formData.append("secciones_activas", s));

    // Recolectar datos de cada sección en JSON (nombres con prefijo para evitar conflictos)
    if (secciones.includes("medicamento")) {
      const dm: Record<string, string> = {};
      ["principio_activo", "concentracion", "uso", "uso_veterinario", "especie_recomendada", "peso_recomendado", "edad_minima", "registro_ica_invima", "requiere_formula", "fecha_vencimiento", "dosis_recomendada", "forma_administracion"].forEach((f) => {
        const v = formData.get(`med_${f}`) as string;
        if (v) dm[f] = v;
      });
      formData.set("datos_medicamento", JSON.stringify(dm));
    }
    if (secciones.includes("alimento")) {
      const da: Record<string, string> = {};
      ["tipo", "etapa", "raza", "tamano_animal", "ingredientes", "proteina", "grasa", "fibra", "peso_presentacion", "tamano_empaque", "fecha_vencimiento"].forEach((f) => {
        const v = formData.get(`ali_${f}`) as string;
        if (v) da[f] = v;
      });
      formData.set("datos_alimento", JSON.stringify(da));
    }
    if (secciones.includes("juguete")) {
      const dj: Record<string, string> = {};
      ["material", "tamano", "nivel_resistencia", "tipo", "enfoque"].forEach((f) => {
        const v = formData.get(`jug_${f}`) as string;
        if (v) dj[f] = v;
      });
      formData.set("datos_juguete", JSON.stringify(dj));
    }

    try {
      const result = await onSubmit(formData);
      if ("error" in result && result.error) setError(result.error);
      else if (onCancel) onCancel();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al guardar el producto"
      );
    }
  }

  const d = (key: string, def = "") =>
    (producto?.datos_medicamento as Record<string, string>)?.[key] ?? def;
  const a = (key: string, def = "") =>
    (producto?.datos_alimento as Record<string, string>)?.[key] ?? def;
  const j = (key: string, def = "") =>
    (producto?.datos_juguete as Record<string, string>)?.[key] ?? def;

  const med = (key: string) => ({ name: `med_${key}`, defaultValue: d(key) });
  const ali = (key: string) => ({ name: `ali_${key}`, defaultValue: a(key) });
  const jug = (key: string) => ({ name: `jug_${key}`, defaultValue: j(key) });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {/* Selección de secciones */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-3 font-bold text-slate-700">
          ¿Qué datos quieres registrar para este producto?
        </h3>
        <div className="flex flex-wrap gap-2">
          {SECCIONES.map((s) => (
            <label
              key={s.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                secciones.includes(s.id)
                  ? "border-[var(--ca-purple)] bg-[var(--ca-purple)]/10 text-[var(--ca-purple)]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={secciones.includes(s.id)}
                onChange={() => toggleSeccion(s.id)}
                className="rounded"
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      {/* Datos básicos */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-700">Datos básicos</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold">Nombre *</label>
            <input
              name="nombre"
              defaultValue={producto?.nombre}
              required
              className="h-10 w-full rounded-lg border border-slate-200 px-3"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Oferta (%)</label>
            <input
              type="number"
              name="porcentaje_oferta"
              min={0}
              max={99}
              placeholder="0"
              defaultValue={producto?.porcentaje_oferta ?? ""}
              className="h-10 w-24 rounded-lg border border-slate-200 px-3 text-sm"
            />
            <span className="ml-2 text-xs text-slate-500">(aparece en ofertas)</span>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">IVA</label>
            <select
              name="iva_porcentaje"
              defaultValue={String(producto?.iva_porcentaje ?? (producto?.aplica_iva === false ? 0 : IVA_POR_DEFECTO))}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            >
              {IVA_OPCIONES.map((iva) => (
                <option key={iva} value={iva}>
                  {iva === 0 ? "Sin IVA" : `IVA ${iva}%`}
                </option>
              ))}
            </select>
            <span className="ml-2 text-xs text-slate-500">(por defecto 19%)</span>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Categoría *</label>
          <select
            value={categoriaPrincipalId}
            onChange={(e) => {
              const value = e.target.value;
              setCategoriaPrincipalId(value);
              const subcategoriaSigueValida = subcategorias.some(
                (subcategoria) =>
                  subcategoria.id === subcategoriaPrincipalId &&
                  subcategoria.categoria_id === value
              );
              if (!subcategoriaSigueValida) {
                setSubcategoriaPrincipalId("");
                setTipoProductoId("");
                setSubcategoriasSeleccionadas([]);
              }
            }}
            className="h-10 w-full rounded-lg border border-slate-200 px-3"
          >
            <option value="">Selecciona categoría</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Subcategoría *</label>
          <select
            name="subcategoria_id"
            required
            value={subcategoriaPrincipalId}
            onChange={(e) => {
              const value = e.target.value;
              setSubcategoriaPrincipalId(value);
              if (value) {
                const subcategoria = subcategorias.find((item) => item.id === value);
                if (subcategoria) setCategoriaPrincipalId(subcategoria.categoria_id);
                setSubcategoriasSeleccionadas((prev) =>
                  prev.includes(value) ? prev : [...prev, value]
                );
                setTipoProductoId((prev) => {
                  const tiposDisponibles = tiposProducto.filter((tipo) => tipo.subcategoria_id === value);
                  if (tiposDisponibles.some((tipo) => tipo.id === prev)) return prev;
                  return resolverTipoPredeterminado(value);
                });
              } else {
                setTipoProductoId("");
              }
            }}
            className="h-10 w-full rounded-lg border border-slate-200 px-3"
          >
            <option value="">Selecciona subcategoría</option>
            {subcategoriasCategoriaActual.map((subcategoria) => (
              <option key={subcategoria.id} value={subcategoria.id}>
                {subcategoria.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Tipo de producto *</label>
          <select
            name="tipo_producto_id"
            required
            value={tipoProductoId}
            onChange={(e) => setTipoProductoId(e.target.value)}
            disabled={!subcategoriaPrincipalId || tiposProductoSubcategoriaActual.length === 0}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">
              {subcategoriaPrincipalId
                ? tiposProductoSubcategoriaActual.length > 0
                  ? "Selecciona tipo de producto"
                  : "Primero crea un tipo de producto"
                : "Selecciona subcategoría"}
            </option>
            {tiposProductoSubcategoriaActual.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </select>
          {subcategoriaPrincipalId && tiposProductoSubcategoriaActual.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              Esta subcategoría aún no tiene tipos de producto. Créelos en `/dashboard/tipos-producto`.
            </p>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            Otras subcategorías donde también aparece
          </p>
          <p className="mb-3 text-xs text-slate-500">
            El producto conservará una subcategoría principal, pero también podrá mostrarse en otras sin duplicarlo.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {categorias.map((cat) => {
              const relacionadas = subcategorias.filter((s) => s.categoria_id === cat.id);
              if (relacionadas.length === 0) return null;
              return (
                <div key={cat.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-sm font-bold text-slate-700">{cat.nombre}</p>
                  <div className="space-y-2">
                    {relacionadas.map((sub) => {
                      const esPrincipal = subcategoriaPrincipalId === sub.id;
                      const checked = esPrincipal || subcategoriasSeleccionadas.includes(sub.id);
                      return (
                        <label key={sub.id} className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (esPrincipal) return;
                              toggleSubcategoria(sub.id);
                            }}
                            disabled={esPrincipal}
                            className="rounded"
                          />
                          <span>
                            {sub.nombre}
                            {esPrincipal && (
                              <span className="ml-1 text-xs font-semibold text-[var(--ca-purple)]">
                                (principal)
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Descripción</label>
          <textarea
            name="descripcion"
            defaultValue={producto?.descripcion ?? ""}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Imagen principal</label>
          <input
            name="imagen"
            type="file"
            accept="image/*"
            className="text-sm"
          />
          {producto?.imagen && (
            <img
              src={producto.imagen}
              alt=""
              className="mt-2 h-20 w-20 rounded-lg object-cover"
            />
          )}
        </div>
        <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-4 text-sm text-sky-900">
          La imagen principal se carga aquí, pero el gramaje, el precio y la información de cada variante se registran abajo en <strong>Presentaciones</strong>.
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">
            ¿Dónde mostrar este producto?
          </p>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              name="destacado"
              value="1"
              defaultChecked={producto?.destacado}
              className="rounded"
            />
            <span className="text-sm font-medium">Producto destacado</span>
            <span className="text-xs text-slate-500">(aparece en el inicio)</span>
          </label>
        </div>
      </div>

      {/* Presentaciones (ej: 500g, 1kg, 2kg - cada una con su foto) */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-700">
            Presentaciones (cada una con su propia foto)
          </h3>
          <button
            type="button"
            onClick={agregarPresentacion}
            className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Plus size={16} />
            Añadir
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Agrega aquí cada gramaje o presentación real del producto. Ej: 500g, 1kg, 2kg.
        </p>
        <div className="space-y-4">
          {presentacionesList.map((p, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4"
            >
              {p.id && (
                <input type="hidden" name={`presentacion_${i}_id`} value={p.id} />
              )}
              <div className="min-w-[120px] flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Gramaje / presentación
                </label>
                <input
                  type="text"
                  name={`presentacion_${i}_nombre`}
                  value={p.nombre}
                  onChange={(e) =>
                    setPresentacionesList((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x))
                    )
                  }
                  placeholder="500g, 1kg, 3 kg, 85 g..."
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>
              <div className="min-w-[100px] flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Precio ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name={`presentacion_${i}_precio`}
                  value={p.precio ?? ""}
                  onChange={(e) =>
                    setPresentacionesList((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, precio: e.target.value } : x))
                    )
                  }
                  required={Boolean(p.nombre.trim())}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>
              <div className="min-w-[80px]">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Oferta (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={99}
                  name={`presentacion_${i}_oferta`}
                  value={p.porcentaje_oferta ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPresentacionesList((prev) =>
                      prev.map((x, j) =>
                        j === i ? { ...x, porcentaje_oferta: v ? parseInt(v, 10) : null } : x
                      )
                    );
                  }}
                  placeholder="0"
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>
              <div className="min-w-[120px]">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  IVA
                </label>
                <select
                  name={`presentacion_${i}_iva_porcentaje`}
                  value={String(p.iva_porcentaje ?? (p.aplica_iva === false ? 0 : IVA_POR_DEFECTO))}
                  onChange={(e) =>
                    setPresentacionesList((prev) =>
                      prev.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              iva_porcentaje: parseInt(e.target.value, 10),
                              aplica_iva: parseInt(e.target.value, 10) > 0,
                            }
                          : x
                      )
                    )
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                >
                  {IVA_OPCIONES.map((iva) => (
                    <option key={iva} value={iva}>
                      {iva === 0 ? "Sin IVA" : `${iva}%`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[140px]">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Imagen
                </label>
                <input
                  type="file"
                  name={`presentacion_${i}_imagen`}
                  accept="image/*"
                  className="text-sm"
                />
                {p.imagen && (
                  <img
                    src={p.imagen}
                    alt=""
                    className="mt-2 h-16 w-16 rounded-lg object-cover"
                  />
                )}
                {p.imagen && (
                  <input
                    type="hidden"
                    name={`presentacion_${i}_imagen_url`}
                    value={p.imagen}
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => quitarPresentacion(i)}
                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                title="Quitar presentación"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Medicamento */}
      {secciones.includes("medicamento") && (
        <Seccion
          titulo="💊 Datos de medicamento"
          expandido={expandido === "medicamento"}
          onToggle={() => setExpandido(expandido === "medicamento" ? null : "medicamento")}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name={med("principio_activo").name} label="Principio activo" defaultValue={med("principio_activo").defaultValue} />
            <Input name={med("concentracion").name} label="Concentración" defaultValue={med("concentracion").defaultValue} />
            <Input name={med("uso").name} label="Uso (antiparasitario, antibiótico...)" defaultValue={med("uso").defaultValue} />
            <Select name={med("uso_veterinario").name} label="Uso veterinario" options={["Sí", "No"]} defaultValue={med("uso_veterinario").defaultValue} />
            <Input name={med("especie_recomendada").name} label="Especie recomendada" defaultValue={med("especie_recomendada").defaultValue} />
            <Input name={med("peso_recomendado").name} label="Peso recomendado del animal" defaultValue={med("peso_recomendado").defaultValue} />
            <Input name={med("edad_minima").name} label="Edad mínima" defaultValue={med("edad_minima").defaultValue} />
            <Input name={med("registro_ica_invima").name} label="Registro ICA / INVIMA" defaultValue={med("registro_ica_invima").defaultValue} />
            <Select name={med("requiere_formula").name} label="Requiere fórmula veterinaria" options={["Sí", "No"]} defaultValue={med("requiere_formula").defaultValue} />
            <Input name={med("fecha_vencimiento").name} label="Fecha vencimiento" type="date" defaultValue={med("fecha_vencimiento").defaultValue} />
            <Input name={med("dosis_recomendada").name} label="Dosis recomendada" defaultValue={med("dosis_recomendada").defaultValue} />
            <Input name={med("forma_administracion").name} label="Forma (oral, tópico, inyectable)" defaultValue={med("forma_administracion").defaultValue} />
          </div>
        </Seccion>
      )}

      {/* Alimento */}
      {secciones.includes("alimento") && (
        <Seccion
          titulo="🥩 Datos de alimento"
          expandido={expandido === "alimento"}
          onToggle={() => setExpandido(expandido === "alimento" ? null : "alimento")}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Select name={ali("tipo").name} label="Tipo" options={["Seco", "Húmedo", "Natural"]} defaultValue={ali("tipo").defaultValue} />
            <Select name={ali("etapa").name} label="Etapa" options={["Cachorro", "Adulto", "Senior"]} defaultValue={ali("etapa").defaultValue} />
            <Input name={ali("raza").name} label="Raza (opcional)" defaultValue={ali("raza").defaultValue} />
            <Select name={ali("tamano_animal").name} label="Tamaño" options={["Pequeño", "Mediano", "Grande"]} defaultValue={ali("tamano_animal").defaultValue} />
            <Input name={ali("ingredientes").name} label="Ingredientes principales" defaultValue={ali("ingredientes").defaultValue} />
            <Input name={ali("proteina").name} label="Proteína %" type="number" defaultValue={ali("proteina").defaultValue} />
            <Input name={ali("grasa").name} label="Grasa %" type="number" defaultValue={ali("grasa").defaultValue} />
            <Input name={ali("fibra").name} label="Fibra %" type="number" defaultValue={ali("fibra").defaultValue} />
            <Input name={ali("peso_presentacion").name} label="Peso presentación" defaultValue={ali("peso_presentacion").defaultValue} />
            <Input name={ali("tamano_empaque").name} label="Tamaño empaque" defaultValue={ali("tamano_empaque").defaultValue} />
            <Input name={ali("fecha_vencimiento").name} label="Fecha vencimiento" type="date" defaultValue={ali("fecha_vencimiento").defaultValue} />
          </div>
        </Seccion>
      )}

      {/* Juguete */}
      {secciones.includes("juguete") && (
        <Seccion
          titulo="🧸 Datos de juguete"
          expandido={expandido === "juguete"}
          onToggle={() => setExpandido(expandido === "juguete" ? null : "juguete")}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name={jug("material").name} label="Material" defaultValue={jug("material").defaultValue} />
            <Input name={jug("tamano").name} label="Tamaño" defaultValue={jug("tamano").defaultValue} />
            <Select name={jug("nivel_resistencia").name} label="Nivel resistencia" options={["Bajo", "Medio", "Alto"]} defaultValue={jug("nivel_resistencia").defaultValue} />
            <Select name={jug("tipo").name} label="Tipo" options={["Mordedor", "Interactivo", "Peluche", "Sonido"]} defaultValue={jug("tipo").defaultValue} />
            <Input name={jug("enfoque").name} label="Para (cachorros, adultos, entrenamiento)" defaultValue={jug("enfoque").defaultValue} />
          </div>
        </Seccion>
      )}

      {/* Logística */}
      {secciones.includes("logistica") && (
        <Seccion
          titulo="🚚 Datos logísticos"
          expandido={expandido === "logistica"}
          onToggle={() => setExpandido(expandido === "logistica" ? null : "logistica")}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="peso" label="Peso (kg)" type="number" step="0.01" defaultValue={producto?.peso != null ? String(producto.peso) : ""} />
            <Input name="dimensiones" label="Dimensiones (L x A x A)" defaultValue={producto?.dimensiones ?? ""} />
            <label className="flex items-center gap-2">
              <input type="checkbox" name="requiere_refrigeracion" value="1" defaultChecked={producto?.requiere_refrigeracion} />
              <span className="text-sm">Requiere refrigeración</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="producto_fragil" value="1" defaultChecked={producto?.producto_fragil} />
              <span className="text-sm">Producto frágil</span>
            </label>
          </div>
        </Seccion>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[var(--ca-purple)] px-6 py-2 font-bold text-white disabled:opacity-60"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-6 py-2 font-bold text-slate-600">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function Seccion({
  titulo,
  expandido,
  onToggle,
  children,
}: {
  titulo: string;
  expandido: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-bold text-slate-700"
      >
        {titulo}
        {expandido ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      <div
        className={`border-t border-slate-200 p-4 ${expandido ? "block" : "hidden"}`}
        aria-hidden={!expandido}
      >
        {children}
      </div>
    </div>
  );
}

function Input({
  name,
  label,
  type = "text",
  step,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  step?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        name={name}
        step={step}
        defaultValue={defaultValue}
        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
      />
    </div>
  );
}

function Select({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
      >
        <option value="">Seleccionar</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
