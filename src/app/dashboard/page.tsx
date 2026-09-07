import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Coins,
  Package,
  PawPrint,
  ShoppingBag,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { getDashboardContext } from "@/lib/roles";
import { PedidosPorRepartirClient } from "./domiciliarios/PedidosPorRepartirClient";

type LoteConProducto = {
  id: string;
  lote: string;
  cantidad: number;
  fecha_vencimiento: string;
  producto_presentacion_id: string;
  producto_presentaciones: {
    nombre: string;
    productos: { nombre: string } | null;
  } | null;
};

function clasificarLotes(lotes: LoteConProducto[], hoy: string) {
  const d = new Date(hoy + "T12:00:00");
  const m1 = new Date(d);
  m1.setDate(m1.getDate() + 30);
  const m2 = new Date(d);
  m2.setDate(m2.getDate() + 60);
  const m3 = new Date(d);
  m3.setDate(m3.getDate() + 90);
  const limite1 = m1.toISOString().slice(0, 10);
  const limite2 = m2.toISOString().slice(0, 10);
  const limite3 = m3.toISOString().slice(0, 10);

  const vencidos: LoteConProducto[] = [];
  const en1Mes: LoteConProducto[] = [];
  const en2Meses: LoteConProducto[] = [];
  const en3Meses: LoteConProducto[] = [];

  for (const l of lotes) {
    const fv = l.fecha_vencimiento;
    if (fv < hoy) vencidos.push(l);
    else if (fv <= limite1) en1Mes.push(l);
    else if (fv <= limite2) en2Meses.push(l);
    else if (fv <= limite3) en3Meses.push(l);
  }

  return { vencidos, en1Mes, en2Meses, en3Meses };
}

export default async function DashboardPage() {
  const ctx = await getDashboardContext();
  if (ctx?.rol === "domiciliario" && ctx.domiciliarioId) {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const [{ data: pedidos }, { data: entregados }] = await Promise.all([
      supabase
        .from("pedidos")
        .select(`
          id,
          numero_orden,
          nombre_cliente,
          telefono,
          direccion,
          notas,
          metodo_pago,
          subtotal_productos,
          valor_domicilio_cobrado,
          valor_domicilio_real,
          domicilio_es_gratis,
          descuento_pedido,
          total,
          estado,
          pedido_items (
            nombre,
            presentacion,
            cantidad,
            subtotal
          )
        `)
        .eq("domiciliario_id", ctx.domiciliarioId)
        .in("estado", ["pendiente", "confirmado", "enviado", "despachado"])
        .order("created_at", { ascending: false }),
      supabase
        .from("pedidos")
        .select("id, total, valor_domicilio_real")
        .eq("domiciliario_id", ctx.domiciliarioId)
        .eq("estado", "entregado"),
    ]);

    const resumen = {
      pedidosEntregados: entregados?.length ?? 0,
      totalPedidos: (entregados ?? []).reduce(
        (sum, p) => sum + (typeof p.total === "string" ? parseFloat(p.total) : Number(p.total ?? 0)),
        0
      ),
      totalDomicilios: (entregados ?? []).reduce(
        (sum, p) =>
          sum +
          (typeof p.valor_domicilio_real === "string"
            ? parseFloat(p.valor_domicilio_real)
            : Number(p.valor_domicilio_real ?? 0)),
        0
      ),
    };

    return <PedidosPorRepartirClient pedidos={pedidos ?? []} resumen={resumen} />;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  const hoy = new Date().toISOString().slice(0, 10);

  const [
    { count: productosCount },
    { count: categoriasCount },
    { count: pedidosCount },
    { data: ventasHoy },
    { data: lotes },
  ] = await Promise.all([
    supabase.from("productos").select("*", { count: "exact", head: true }),
    supabase.from("categorias").select("*", { count: "exact", head: true }),
    supabase.from("pedidos").select("*", { count: "exact", head: true }),
    supabase.from("ventas").select("total").eq("fecha_venta", hoy),
    supabase
      .from("inventario_lotes")
      .select(`
        id,
        lote,
        cantidad,
        fecha_vencimiento,
        producto_presentacion_id,
        producto_presentaciones (
          nombre,
          productos (nombre)
        )
      `)
      .order("fecha_vencimiento", { ascending: true }),
  ]);

  const ventasHoyTotal =
    ventasHoy?.reduce(
      (acc, v) => acc + (typeof v.total === "string" ? parseFloat(v.total) : Number(v.total)),
      0
    ) ?? 0;

  const lotesData: LoteConProducto[] = (lotes ?? []).map((l: { producto_presentaciones?: { nombre: string; productos?: { nombre: string } | { nombre: string }[] } | { nombre: string; productos?: { nombre: string } | { nombre: string }[] }[] }) => {
    const pp = Array.isArray(l.producto_presentaciones) ? l.producto_presentaciones[0] : l.producto_presentaciones;
    const prod = pp?.productos ? (Array.isArray(pp.productos) ? pp.productos[0] : pp.productos) : null;
    return { ...l, producto_presentaciones: pp ? { nombre: pp.nombre, productos: prod ? { nombre: prod.nombre } : null } : null } as LoteConProducto;
  });
  const { vencidos, en1Mes, en2Meses, en3Meses } = clasificarLotes(lotesData, hoy);

  const stats = [
    { label: "Productos", value: String(productosCount ?? 0), icon: Package, color: "bg-[#fff0dc]" },
    { label: "Categorías", value: String(categoriasCount ?? 0), icon: PawPrint, color: "bg-[#e8f9dd]" },
    { label: "Pedidos", value: String(pedidosCount ?? 0), icon: ShoppingBag, color: "bg-[#e4f3ff]" },
    {
      label: "Ventas hoy",
      value: `$${ventasHoyTotal.toLocaleString("es-CO")}`,
      icon: TrendingUp,
      color: "bg-[#f4e8ff]",
    },
    { label: "Control domicilios", value: "Activo", icon: Coins, color: "bg-[#fef3e8]" },
  ];

  const seccionesVencimiento = [
    {
      titulo: "Vencidos",
      lotes: vencidos,
      color: "bg-red-50 border-red-200",
      icono: XCircle,
      iconColor: "text-red-600",
    },
    {
      titulo: "Vencen en 1 mes",
      lotes: en1Mes,
      color: "bg-amber-50 border-amber-200",
      icono: AlertTriangle,
      iconColor: "text-amber-600",
    },
    {
      titulo: "Vencen en 2 meses",
      lotes: en2Meses,
      color: "bg-yellow-50 border-yellow-200",
      icono: CalendarClock,
      iconColor: "text-yellow-700",
    },
    {
      titulo: "Vencen en 3 meses",
      lotes: en3Meses,
      color: "bg-emerald-50 border-emerald-200",
      icono: CalendarClock,
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-black text-[var(--ca-purple)]">
        Bienvenido, {user?.email?.split("@")[0] ?? "Admin"}
      </h1>
      <p className="mt-1 text-slate-600">
        Panel de administración de Pet Market Animal
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`rounded-2xl ${stat.color} p-4 shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">
                  {stat.label}
                </span>
                <Icon className="text-[var(--ca-purple)]" size={24} />
              </div>
              <p className="mt-2 text-2xl font-black text-[var(--ca-purple)]">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-700">
          <CalendarClock size={20} />
          Productos por vencimiento
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Clic en un producto para ir al inventario y dar salida (descontar unidades vencidas o próximas a vencer).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {seccionesVencimiento.map((sec) => {
            const Icon = sec.icono;
            return (
              <div
                key={sec.titulo}
                className={`rounded-2xl border p-4 ${sec.color}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-bold text-slate-800">
                    <Icon size={18} className={sec.iconColor} />
                    {sec.titulo}
                  </span>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-sm font-bold text-slate-600">
                    {sec.lotes.length} lote{sec.lotes.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {sec.lotes.length === 0 ? (
                  <p className="text-sm text-slate-500">Ninguno</p>
                ) : (
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                    {sec.lotes.map((l) => {
                      const cant = typeof l.cantidad === "string" ? parseInt(l.cantidad, 10) : l.cantidad;
                      const prod = l.producto_presentaciones?.productos?.nombre ?? "Producto";
                      const pres = l.producto_presentaciones?.nombre ?? "";
                      return (
                        <li key={l.id}>
                          <Link
                            href={`/dashboard/inventario?foco=${l.producto_presentacion_id}`}
                            className="group flex flex-col gap-0.5 rounded-lg bg-white/60 px-2 py-1.5 transition hover:bg-white hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span className="flex items-center gap-1 font-medium text-slate-800">
                              {prod} – {pres}
                              <ArrowRight size={12} className="opacity-50 group-hover:translate-x-0.5 group-hover:opacity-100" />
                            </span>
                            <span className="text-xs text-slate-600 sm:text-sm">
                              Lote {l.lote} · {cant} ud ·{" "}
                              {new Date(l.fecha_vencimiento).toLocaleDateString("es-CO")}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-bold text-slate-700">Próximos pasos</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>• Configura las categorías desde el menú lateral</li>
          <li>• Agrega productos a tu tienda</li>
          <li>• Personaliza la información de contacto</li>
        </ul>
      </div>
    </div>
  );
}
