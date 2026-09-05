"use client";

import {
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  type Producto,
  type ProductoPresentacion,
} from "./actions";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ProductoForm } from "./ProductoForm";

type Subcategoria = { id: string; nombre: string; categoria_id: string };
type TipoProducto = { id: string; nombre: string; subcategoria_id: string };
type Categoria = { id: string; nombre: string };
const ITEMS_POR_PAGINA = 10;

type ProductoRow = Producto & {
  stock?: number;
  subcategorias?:
    | { nombre: string; categorias?: { nombre: string } | { nombre: string }[] }
    | { nombre: string; categorias?: { nombre: string } | { nombre: string }[] }[]
    | null;
  producto_subcategorias?:
    | {
        subcategoria_id?: string | null;
        subcategorias?:
          | { nombre: string; categorias?: { nombre: string } | { nombre: string }[] }
          | { nombre: string; categorias?: { nombre: string } | { nombre: string }[] }[]
          | null;
      }[]
    | null;
  producto_presentaciones?: ProductoPresentacion[] | null;
  tipos_producto?:
    | { id: string; nombre: string; subcategoria_id?: string | null }
    | { id: string; nombre: string; subcategoria_id?: string | null }[]
    | null;
};

function getSubcatName(p: ProductoRow) {
  const items: string[] = [];
  const principales = p.subcategorias ? (Array.isArray(p.subcategorias) ? p.subcategorias : [p.subcategorias]) : [];
  const adicionales = Array.isArray(p.producto_subcategorias)
    ? p.producto_subcategorias
        .map((rel) => rel.subcategorias)
        .flatMap((sub) => (sub ? (Array.isArray(sub) ? sub : [sub]) : []))
    : [];

  [...principales, ...adicionales].forEach((sub) => {
    if (!sub?.nombre) return;
    const cat = sub.categorias;
    const catObj = Array.isArray(cat) ? cat[0] : cat;
    const label = catObj ? `${catObj.nombre} → ${sub.nombre}` : sub.nombre;
    if (!items.includes(label)) items.push(label);
  });

  return items.length > 0 ? items.join(", ") : "-";
}

function getTipoProductoName(p: ProductoRow) {
  const tipo = p.tipos_producto
    ? Array.isArray(p.tipos_producto)
      ? p.tipos_producto[0]
      : p.tipos_producto
    : null;
  return tipo?.nombre ?? "-";
}

function getPrecioBaseDisplay(p: ProductoRow) {
  const presentaciones = Array.isArray(p.producto_presentaciones)
    ? [...p.producto_presentaciones].sort((a, b) => a.orden - b.orden)
    : [];
  const precioPresentacion = presentaciones.find((presentacion) => presentacion.precio != null)?.precio;
  return Number(precioPresentacion ?? p.precio ?? 0);
}

export function ProductosClient({
  productos,
  categorias,
  subcategorias,
  tiposProducto,
}: {
  productos: ProductoRow[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  tiposProducto: TipoProducto[];
}) {
  const formContainerRef = useRef<HTMLDivElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    if (!(creating || editingId)) return;
    formContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [creating, editingId]);

  function recargarPaginaProductos() {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard/productos";
    }
  }

  async function handleCreate(formData: FormData) {
    setLoading(true);
    try {
      const result = await crearProducto(formData);
      if ("success" in result && result.success) {
        setCreating(false);
        recargarPaginaProductos();
      }
      return result;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al crear el producto",
      };
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string, formData: FormData) {
    setLoading(true);
    try {
      const result = await actualizarProducto(id, formData);
      if ("success" in result && result.success) {
        setEditingId(null);
        recargarPaginaProductos();
      }
      return result;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al actualizar el producto",
      };
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    setLoading(true);
    try {
      await eliminarProducto(id);
      recargarPaginaProductos();
    } finally {
      setLoading(false);
    }
  }

  const prod = productos.find((p) => p.id === editingId);

  const term = busqueda.trim().toLowerCase();
  const productosFiltrados = term
    ? productos.filter((p) => {
        const nombre = (p.nombre ?? "").toLowerCase();
        const desc = (p.descripcion ?? "").toLowerCase();
        const subcat = getSubcatName(p).toLowerCase();
        const tipo = getTipoProductoName(p).toLowerCase();
        return (
          nombre.includes(term) ||
          desc.includes(term) ||
          subcat.includes(term) ||
          tipo.includes(term)
        );
      })
    : productos;

  const totalPaginas = Math.ceil(productosFiltrados.length / ITEMS_POR_PAGINA) || 1;
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const productosPaginados = productosFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--ca-purple)]">
            Productos
          </h1>
          <p className="text-slate-600">
            Crea productos y selecciona qué datos registrar (medicamento,
            alimento, juguete, logística, marketing).
          </p>
        </div>
        {!creating && !editingId && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--ca-purple)] px-5 py-2.5 font-bold text-white"
          >
            <Plus size={18} />
            Nuevo producto
          </button>
        )}
      </div>

      {(creating || editingId) && (
        <div
          ref={formContainerRef}
          className="rounded-xl border border-slate-200 bg-slate-50 p-6"
        >
          <h2 className="mb-4 font-bold text-slate-700">
            {editingId ? "Editar producto" : "Nuevo producto"}
          </h2>
          <ProductoForm
            key={editingId ?? (creating ? "nuevo-producto" : "producto-form")}
            categorias={categorias}
            subcategorias={subcategorias}
            tiposProducto={tiposProducto}
            producto={
              prod
                ? {
                    nombre: prod.nombre,
                    descripcion: prod.descripcion,
                    precio: typeof prod.precio === "string" ? parseFloat(prod.precio) : Number(prod.precio),
                    aplica_iva: (prod as { aplica_iva?: boolean }).aplica_iva !== false,
                    iva_porcentaje: (prod as { iva_porcentaje?: number | null }).iva_porcentaje ?? ((prod as { aplica_iva?: boolean }).aplica_iva === false ? 0 : 19),
                    imagen: prod.imagen,
                    subcategoria_id: prod.subcategoria_id,
                    tipo_producto_id: prod.tipo_producto_id,
                    subcategoria_ids: (prod as { subcategoria_ids?: string[] }).subcategoria_ids ?? [prod.subcategoria_id],
                    peso: prod.peso ? Number(prod.peso) : null,
                    dimensiones: prod.dimensiones,
                    requiere_refrigeracion: prod.requiere_refrigeracion,
                    producto_fragil: prod.producto_fragil,
                    destacado: prod.destacado,
                    nuevo: prod.nuevo,
                    mas_vendido: prod.mas_vendido,
                    recomendado: prod.recomendado,
                    porcentaje_oferta: prod.porcentaje_oferta ?? null,
                    secciones_activas: prod.secciones_activas ?? [],
                    datos_medicamento: prod.datos_medicamento,
                    datos_alimento: prod.datos_alimento,
                    datos_juguete: prod.datos_juguete,
                  }
                : undefined
            }
            presentaciones={
              Array.isArray(prod?.producto_presentaciones)
                ? prod.producto_presentaciones
                : []
            }
            onSubmit={editingId ? (fd) => handleUpdate(editingId, fd) : handleCreate}
            onCancel={() => {
              setCreating(false);
              setEditingId(null);
            }}
            loading={loading}
            submitLabel={editingId ? "Guardar" : "Crear producto"}
          />
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            placeholder="Buscar por nombre, descripción, subcategoría o tipo..."
            className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--ca-purple)] focus:ring-2 focus:ring-[var(--ca-purple)]/20"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-bold text-slate-600">Producto</th>
              <th className="px-4 py-3 font-bold text-slate-600">Precio</th>
              <th className="px-4 py-3 font-bold text-slate-600">Stock</th>
              <th className="px-4 py-3 font-bold text-slate-600">Subcategoría</th>
              <th className="px-4 py-3 font-bold text-slate-600">Tipo</th>
              <th className="w-24 px-4 py-3 text-right font-bold text-slate-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  {term
                    ? "No se encontraron productos con esa búsqueda."
                    : "No hay productos. Crea el primero."}
                </td>
              </tr>
            ) : (
              productosPaginados.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.imagen && (
                        <img
                          src={p.imagen}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      )}
                      <span className="font-semibold">{p.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    ${getPrecioBaseDisplay(p).toLocaleString("es-CO")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        (p.stock ?? 0) === 0 ? "text-amber-600" : "text-slate-700"
                      }`}
                    >
                      {p.stock ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {getSubcatName(p)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {getTipoProductoName(p)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setCreating(false);
                        setEditingId(p.id);
                      }}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-[var(--ca-purple)]"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-red-100 hover:text-red-600"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {productosFiltrados.length > ITEMS_POR_PAGINA && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Mostrando {inicio + 1}-{Math.min(inicio + ITEMS_POR_PAGINA, productosFiltrados.length)} de {productosFiltrados.length} productos
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
    </div>
  );
}
