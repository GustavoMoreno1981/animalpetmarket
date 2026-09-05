"use client";

import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { DashboardNav } from "./DashboardNav";

const navItemsAdmin = [
  { href: "/dashboard", label: "Inicio", iconName: "LayoutDashboard" as const },
  { href: "/dashboard/categorias", label: "Categorías", iconName: "PawPrint" as const },
  { href: "/dashboard/subcategorias", label: "Subcategorías", iconName: "Layers" as const },
  { href: "/dashboard/tipos-producto", label: "Tipos de producto", iconName: "Tags" as const },
  { href: "/dashboard/productos", label: "Productos", iconName: "Package" as const },
  { href: "/dashboard/inventario", label: "Inventario", iconName: "Boxes" as const },
  { href: "/dashboard/pedidos", label: "Pedidos", iconName: "ShoppingBag" as const },
  { href: "/dashboard/clientes", label: "Clientes", iconName: "UserCircle" as const },
  { href: "/dashboard/vendedores", label: "Vendedores", iconName: "Users" as const },
  { href: "/dashboard/domiciliarios", label: "Domiciliarios", iconName: "Bike" as const },
  { href: "/dashboard/informes", label: "Informes", iconName: "BarChart3" as const },
  { href: "/dashboard/newsletter", label: "Newsletter", iconName: "Mail" as const },
  { href: "/dashboard/cupones", label: "Cupones", iconName: "Tag" as const },
  { href: "/dashboard/config", label: "Configuración", iconName: "Settings" as const },
];

const navItemsVendedor = [
  { href: "/dashboard", label: "Inicio", iconName: "LayoutDashboard" as const },
  { href: "/dashboard/clientes", label: "Clientes", iconName: "UserCircle" as const },
  { href: "/dashboard/pedidos", label: "Pedidos", iconName: "ShoppingBag" as const },
];

const navItemsDomiciliario = [
  { href: "/dashboard", label: "Pedidos por repartir", iconName: "Bike" as const },
];

export function DashboardSidebar({
  rol = "admin",
}: {
  rol?: "admin" | "vendedor" | "domiciliario";
  vendedorId?: string | null;
}) {
  const navItems =
    rol === "vendedor"
      ? navItemsVendedor
      : rol === "domiciliario"
        ? navItemsDomiciliario
        : navItemsAdmin;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-md print:hidden lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu size={22} className="text-slate-700" />
      </button>

      {/* Overlay móvil (solo cuando menú abierto) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white shadow-lg transition-transform duration-200 print:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-100 px-4">
          <div className="flex items-center gap-2">
            <img
              src="/logo-centro-animal.JPG"
              alt="Logo"
              className="h-10 w-10 rounded-lg object-cover"
            />
            <span className="font-black text-[var(--ca-purple)]">Dashboard</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <div key={item.href} onClick={() => setOpen(false)}>
              <DashboardNav item={item} />
            </div>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-100 p-3">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
