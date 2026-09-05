"use client";

import {
  crearTipoProducto,
  actualizarTipoProducto,
  eliminarTipoProducto,
  type TipoProducto,
} from "./actions";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type Categoria = { id: string; nombre: string };
type Subcategoria = {
  id: string;
  nombre: string;
  categoria_id: string;
  categorias?: { nombre: string } | null;
};

type TipoProductoRow = TipoProducto & {
  productosCount: number;
};

function SelectSubcategoria({
  subcategorias,
  defaultValue,
  disabled,
  name,
}: {
  subcategorias: Subcategoria[];
  defaultValue?: string;
  disabled?: boolean;
  name: string;
}) {
  const grupos = useMemo(() => {
    const map = new Map<string, { categoria: string; items: Subcategoria[] }>();
    subcategorias.forEach((subcategoria) => {
      const categoria = subcategoria.categorias?.nombre ?? "Sin categoría";
      if (!map.has(categoria)) {
        map.set(categoria, { categoria, items: [] });
      }
      map.get(categoria)?.items.push(subcategoria);
    });
    return [...map.values()].sort((a, b) => a.categoria.localeCompare(b.categoria, "es"));
  }, [subcategorias]);

  return (
    <select
      name={name}
      required
      defaultValue={defaultValue}
      disabled={disabled}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-800 outline-none transition focus:border-[var(--ca-purple)] focus:ring-2 focus:ring-[var(--ca-purple)]/20 disabled:opacity-60"
    >
      <option value="">Selecciona subcategoría</option>
      {grupos.map((grupo) => (
        <optgroup key={grupo.categoria} label={grupo.categoria}>
          {grupo.items.map((subcategoria) => (
            <option key={subcategoria.id} value={subcategoria.id}>
              {subcategoria.nombre}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function TiposProductoClient({
  tiposProducto,
  categorias,
  subcategorias,
}: {
  tiposProducto: TipoProductoRow[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await crearTipoProducto(formData);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      form.reset();
    }
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await actualizarTipoProducto(id, formData);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este tipo de producto?")) return;
    setError(null);
    setLoading(true);
    const result = await eliminarTipoProducto(id);
    setLoading(false);
    if ("error" in result && result.error) setError(result.error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[var(--ca-purple)]">
          Tipos de producto
        </h1>
        <p className="text-slate-600">
          Organiza cada subcategoría en tipos más específicos. Ej: Gatos → Medicamentos → Desparasitantes.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {categorias.length === 0 || subcategorias.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Primero crea categorías y subcategorías antes de agregar tipos de producto.
        </div>
      ) : (
        <>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[220px] flex-1">
                <label htmlFor="nombre" className="mb-1 block text-sm font-bold text-slate-700">
                  Nombre
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  placeholder="Ej: Desparasitantes, Antibióticos, Premium..."
                  required
                  disabled={loading}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-800 outline-none transition focus:border-[var(--ca-purple)] focus:ring-2 focus:ring-[var(--ca-purple)]/20 disabled:opacity-60"
                />
              </div>

              <div className="min-w-[240px] flex-1">
                <label htmlFor="subcategoria_id" className="mb-1 block text-sm font-bold text-slate-700">
                  Subcategoría
                </label>
                <SelectSubcategoria
                  subcategorias={subcategorias}
                  name="subcategoria_id"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 items-center gap-2 rounded-xl bg-[var(--ca-purple)] px-5 font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                <Plus size={18} />
                Agregar
              </button>
            </div>
          </form>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-sm font-bold text-slate-600">Categoría</th>
                  <th className="px-4 py-3 text-sm font-bold text-slate-600">Subcategoría</th>
                  <th className="px-4 py-3 text-sm font-bold text-slate-600">Tipo de producto</th>
                  <th className="px-4 py-3 text-sm font-bold text-slate-600">Productos</th>
                  <th className="w-24 px-4 py-3 text-right text-sm font-bold text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tiposProducto.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No hay tipos de producto. Agrega el primero arriba.
                    </td>
                  </tr>
                ) : (
                  tiposProducto.map((tipo) => {
                    const categoriaNombre = tipo.subcategorias?.categorias?.nombre ?? "-";
                    const subcategoriaNombre = tipo.subcategorias?.nombre ?? "-";
                    return (
                      <tr key={tipo.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                        {editingId === tipo.id ? (
                          <>
                            <td className="px-4 py-3 text-slate-700">{categoriaNombre}</td>
                            <td colSpan={2} className="px-4 py-3">
                              <form
                                onSubmit={(e) => handleUpdate(e, tipo.id)}
                                className="flex flex-wrap items-center gap-3"
                              >
                                <SelectSubcategoria
                                  subcategorias={subcategorias}
                                  name="subcategoria_id"
                                  defaultValue={tipo.subcategoria_id}
                                  disabled={loading}
                                />
                                <input
                                  name="nombre"
                                  type="text"
                                  defaultValue={tipo.nombre}
                                  required
                                  disabled={loading}
                                  className="h-9 min-w-[160px] rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[var(--ca-purple)]"
                                  autoFocus
                                />
                                <button
                                  type="submit"
                                  disabled={loading}
                                  className="rounded-lg bg-[var(--ca-purple)] px-3 py-1.5 text-xs font-bold text-white"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"
                                >
                                  Cancelar
                                </button>
                              </form>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{tipo.productosCount}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-slate-700">{categoriaNombre}</td>
                            <td className="px-4 py-3 text-slate-700">{subcategoriaNombre}</td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-800">{tipo.nombre}</span>
                              {tipo.nombre === "General" && (
                                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                                  automático
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{tipo.productosCount}</td>
                          </>
                        )}

                        <td className="px-4 py-3 text-right">
                          {editingId !== tipo.id && (
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setEditingId(tipo.id)}
                                disabled={loading}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-[var(--ca-purple)]"
                                title="Editar"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(tipo.id)}
                                disabled={loading || tipo.nombre === "General"}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                                title={tipo.nombre === "General" ? "El tipo General está protegido" : "Eliminar"}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
