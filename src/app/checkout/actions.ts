"use server";

import {
  isValidUUID,
  sanitizarTexto,
  validarLongitud,
  validarTelefono,
} from "@/lib/validations";
import { aplicarIva, resolverIvaPorcentaje } from "@/lib/iva";
import { getConfiguracion } from "@/lib/config";
import { calcularResumenDomicilio } from "@/lib/domicilios";
import {
  esMetodoPagoPedido,
  METODO_PAGO_POR_DEFECTO,
  type MetodoPagoPedido,
} from "@/lib/pedidos";
import { createAdminClient, requireAuth } from "@/lib/supabase/server";
import { getPerfil } from "@/lib/roles";
import { revalidatePath } from "next/cache";

const MAX_NOMBRE = 120;
const MAX_DIRECCION = 300;
const MAX_NOTAS = 500;

export type CartItemInput = {
  productId: string;
  nombre: string;
  presentacion: string;
  precio: number;
  cantidad: number;
  aplica_iva?: boolean;
  iva_porcentaje?: number;
};

type PrecioYStock = {
  precio: number;
  aplica_iva: boolean;
  iva_porcentaje: number;
  nombre: string;
  productoPresentacionId: string | null;
};

/** Obtiene el precio real, aplica_iva y el id de presentación desde la BD. */
async function obtenerPrecioYPresentacion(
  supabase: ReturnType<typeof createAdminClient>,
  productId: string,
  presentacion: string
): Promise<PrecioYStock | null> {
  const { data: pp } = await supabase
    .from("producto_presentaciones")
    .select("id, precio, aplica_iva, iva_porcentaje, productos(nombre, aplica_iva, iva_porcentaje)")
    .eq("producto_id", productId)
    .eq("nombre", presentacion)
    .single();

  const nombreProd = pp ? (pp.productos as { nombre?: string } | null)?.nombre ?? "" : "";
  const ppId = pp?.id ?? null;
  const prodInfo = pp ? (pp.productos as { aplica_iva?: boolean; iva_porcentaje?: number | null } | null) : null;
  const prodIvaPorcentaje = resolverIvaPorcentaje({
    ivaPorcentaje: prodInfo?.iva_porcentaje,
    aplicaIva: prodInfo?.aplica_iva,
  });

  if (pp?.precio != null) {
    const p = typeof pp.precio === "string" ? parseFloat(pp.precio) : Number(pp.precio);
    const ivaPorcentaje = resolverIvaPorcentaje({
      ivaPorcentaje: pp.iva_porcentaje,
      aplicaIva: pp.aplica_iva,
      fallbackPorcentaje: prodIvaPorcentaje,
    });
    return { precio: p, aplica_iva: ivaPorcentaje > 0, iva_porcentaje: ivaPorcentaje, nombre: nombreProd, productoPresentacionId: ppId };
  }

  const { data: prod } = await supabase
    .from("productos")
    .select("precio, nombre, aplica_iva, iva_porcentaje")
    .eq("id", productId)
    .single();

  if (prod?.precio != null) {
    const p = typeof prod.precio === "string" ? parseFloat(prod.precio) : Number(prod.precio);
    const ivaPorcentaje = resolverIvaPorcentaje({
      ivaPorcentaje: (prod as { iva_porcentaje?: number | null }).iva_porcentaje,
      aplicaIva: (prod as { aplica_iva?: boolean }).aplica_iva,
    });
    return { precio: p, aplica_iva: ivaPorcentaje > 0, iva_porcentaje: ivaPorcentaje, nombre: prod.nombre ?? nombreProd, productoPresentacionId: ppId };
  }

  return null;
}

/** Stock disponible (solo lotes no vencidos) para una presentación. */
async function obtenerStockDisponible(
  supabase: ReturnType<typeof createAdminClient>,
  productoPresentacionId: string
): Promise<number> {
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: lotes } = await supabase
    .from("inventario_lotes")
    .select("cantidad")
    .eq("producto_presentacion_id", productoPresentacionId)
    .gte("fecha_vencimiento", hoy)
    .gte("cantidad", 1);

  const total =
    lotes?.reduce(
      (sum, l) => sum + (typeof l.cantidad === "string" ? parseInt(l.cantidad, 10) : l.cantidad),
      0
    ) ?? 0;
  return total;
}

/** Valida un cupón y devuelve el porcentaje si es válido */
export async function validarCupon(codigo: string): Promise<
  | { valid: true; porcentaje: number }
  | { valid: false; error: string }
> {
  const c = (codigo ?? "").trim().toUpperCase();
  if (!c) return { valid: false, error: "Ingresa un código" };
  const supabase = createAdminClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("cupones")
    .select("id, porcentaje, usado, valido_hasta")
    .ilike("codigo", c)
    .limit(1)
    .maybeSingle();
  if (!data) return { valid: false, error: "Cupón no encontrado" };
  if (data.usado) return { valid: false, error: "Cupón ya utilizado" };
  if (data.valido_hasta && data.valido_hasta < hoy) return { valid: false, error: "Cupón expirado" };
  return { valid: true, porcentaje: data.porcentaje };
}

export async function crearPedido(
  nombre: string,
  telefono: string,
  direccion: string,
  notas: string | null,
  items: CartItemInput[],
  _totalCliente: number,
  cuponCodigo: string | null,
  opciones?: {
    vendedorId?: string | null;
    metodoPago?: MetodoPagoPedido;
  }
) {
  if (!nombre?.trim()) return { error: "El nombre es obligatorio" };
  if (!telefono?.trim()) return { error: "El teléfono es obligatorio" };
  if (!direccion?.trim()) return { error: "La dirección es obligatoria" };
  if (!items?.length) return { error: "El carrito está vacío" };

  const errNombre = validarLongitud(nombre, MAX_NOMBRE);
  if (errNombre) return { error: `Nombre: ${errNombre}` };
  const errTel = validarTelefono(telefono);
  if (errTel) return { error: errTel };
  const errDir = validarLongitud(direccion, MAX_DIRECCION);
  if (errDir) return { error: `Dirección: ${errDir}` };
  if (notas?.trim()) {
    const errNotas = validarLongitud(notas, MAX_NOTAS, 0);
    if (errNotas) return { error: `Notas: ${errNotas}` };
  }
  const metodoPago = opciones?.metodoPago ?? METODO_PAGO_POR_DEFECTO;
  if (!esMetodoPagoPedido(metodoPago)) return { error: "Método de pago inválido" };

  const supabase = createAdminClient();

  const itemsValidados: Array<{
    productId: string;
    nombre: string;
    presentacion: string;
    precio: number;
    cantidad: number;
    aplica_iva: boolean;
    iva_porcentaje: number;
  }> = [];

  for (const item of items) {
    if (!isValidUUID(item.productId)) {
      return { error: `Producto inválido en el carrito` };
    }
    if (item.cantidad < 1 || item.cantidad > 999) {
      return { error: `Cantidad inválida para "${item.nombre}"` };
    }
    const info = await obtenerPrecioYPresentacion(supabase, item.productId, item.presentacion);
    if (!info) {
      return { error: `Producto "${item.nombre}" (${item.presentacion}) no encontrado o sin precio` };
    }
    if (item.cantidad < 1) continue;

    if (info.productoPresentacionId) {
      const stock = await obtenerStockDisponible(supabase, info.productoPresentacionId);
      if (stock < item.cantidad) {
        return {
          error: `Stock insuficiente de "${info.nombre}" (${item.presentacion}). Disponible: ${stock}, solicitado: ${item.cantidad}`,
        };
      }
    }

    const precioFinal = aplicarIva(info.precio, info.iva_porcentaje);
    itemsValidados.push({
      productId: item.productId,
      nombre: info.nombre || item.nombre,
      presentacion: item.presentacion,
      precio: precioFinal,
      cantidad: item.cantidad,
      aplica_iva: info.aplica_iva,
      iva_porcentaje: info.iva_porcentaje,
    });
  }

  if (itemsValidados.length === 0) return { error: "El carrito está vacío" };

  const subtotalProductos = itemsValidados.reduce(
    (sum, i) => sum + i.precio * i.cantidad,
    0
  );

  const cupon = (cuponCodigo ?? "").trim() || null;
  let porcentajeDescuento = 0;
  if (cupon) {
    const cuponValidado = await validarCupon(cupon);
    if (!cuponValidado.valid) return { error: cuponValidado.error };
    porcentajeDescuento = cuponValidado.porcentaje;
  }

  const config = await getConfiguracion();
  const resumen = calcularResumenDomicilio({
    subtotalProductos,
    valorDomicilioBase: config.valor_domicilio_base,
    domicilioGratis: config.domicilio_gratis_activo,
    porcentajeDescuento,
  });

  const itemsParaRpc = itemsValidados.map((i) => ({
    producto_id: i.productId,
    nombre: i.nombre,
    presentacion: i.presentacion,
    cantidad: i.cantidad,
    precio_unitario: i.precio,
    aplica_iva: i.aplica_iva,
    iva_porcentaje: i.iva_porcentaje,
  }));

  const { data: pedidoId, error: errRpc } = await supabase.rpc("crear_pedido_transaccional", {
    p_nombre_cliente: sanitizarTexto(nombre, MAX_NOMBRE),
    p_telefono: sanitizarTexto(telefono, 20),
    p_direccion: sanitizarTexto(direccion, MAX_DIRECCION),
    p_notas: notas ? sanitizarTexto(notas, MAX_NOTAS) : "",
    p_total: resumen.total,
    p_items: itemsParaRpc,
    p_cupon_codigo: cupon,
    p_vendedor_id: opciones?.vendedorId ?? null,
    p_metodo_pago: metodoPago,
    p_subtotal_productos: resumen.subtotalProductos,
    p_valor_domicilio_cobrado: resumen.valorDomicilioCobrado,
    p_valor_domicilio_real: resumen.valorDomicilioReal,
    p_domicilio_es_gratis: resumen.domicilioEsGratis,
  });

  if (errRpc) return { error: errRpc.message };
  if (!pedidoId) return { error: "No se pudo crear el pedido" };

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("numero_orden, token_factura")
    .eq("id", pedidoId)
    .single();

  const numeroOrden = pedido?.numero_orden != null
    ? `ORD-${String(pedido.numero_orden).padStart(4, "0")}`
    : null;

  revalidatePath("/dashboard/pedidos");
  return { success: true, pedidoId, numeroOrden, tokenFactura: pedido?.token_factura ?? null };
}

/** Crea un pedido desde el dashboard (vendedor o admin). Si es vendedor, asocia vendedor_id. */
export async function crearPedidoDesdeDashboard(
  nombre: string,
  telefono: string,
  direccion: string,
  notas: string | null,
  items: CartItemInput[],
  cuponCodigo: string | null
) {
  const auth = await requireAuth();
  if (auth.error) return auth;

  const perfil = await getPerfil(auth.user!.id);
  let vendedorId: string | null = null;

  if (perfil?.rol === "vendedor") {
    if (!perfil.vendedor_id) {
      return {
        error:
          "Tu usuario tiene rol de vendedor pero no está vinculado a un vendedor activo. Revisa la configuración del perfil.",
      };
    }

    const supabase = createAdminClient();
    const { data: vendedor, error: vendedorError } = await supabase
      .from("vendedores")
      .select("id, activo")
      .eq("id", perfil.vendedor_id)
      .single();

    if (vendedorError || !vendedor?.id) {
      return {
        error:
          "No se encontró el vendedor asociado a este usuario. Revisa la configuración del vendedor en el panel de administración.",
      };
    }

    if (!vendedor.activo) {
      return {
        error:
          "El vendedor asociado a este usuario está inactivo. Actívalo para poder registrar pedidos correctamente.",
      };
    }

    vendedorId = vendedor.id;
  }

  return crearPedido(nombre, telefono, direccion, notas, items, 0, cuponCodigo, {
    vendedorId,
    metodoPago: METODO_PAGO_POR_DEFECTO,
  });
}

export type PedidoResumen = {
  id: string;
  numero_orden: number | null;
  estado: string;
  nombre_cliente: string;
  telefono: string;
  direccion: string;
  notas: string | null;
  metodo_pago: MetodoPagoPedido;
  subtotal_productos: number;
  valor_domicilio_cobrado: number;
  valor_domicilio_real: number;
  domicilio_es_gratis: boolean;
  descuento_pedido: number;
  total: number;
  created_at: string;
  token_factura: string | null | undefined;
  pedido_items: { nombre: string; presentacion: string; cantidad: number; precio_unitario: number; subtotal: number; aplica_iva?: boolean; iva_porcentaje?: number | null }[];
};

/** Obtiene un pedido por ID (ruta pública, sin auth). */
export async function obtenerPedidoPorId(pedidoId: string): Promise<PedidoResumen | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pedidos")
    .select(
      `
      id,
      numero_orden,
      estado,
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
      created_at,
      token_factura,
      pedido_items (nombre, presentacion, cantidad, precio_unitario, subtotal, aplica_iva, iva_porcentaje)
    `
    )
    .eq("id", pedidoId)
    .single();

  return data as PedidoResumen | null;
}
