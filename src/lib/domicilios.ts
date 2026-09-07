export type ConfiguracionDomicilio = {
  valor_domicilio_base: number | string | null | undefined;
  domicilio_gratis_activo: boolean | null | undefined;
};

export type ResumenDomicilio = {
  subtotalProductos: number;
  valorDomicilioCobrado: number;
  valorDomicilioReal: number;
  descuento: number;
  total: number;
  domicilioEsGratis: boolean;
};

function redondearMoneda(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function normalizarMonto(valor: number | string | null | undefined) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  if (typeof valor === "string") {
    const parsed = Number.parseFloat(valor);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function calcularResumenDomicilio(params: {
  subtotalProductos: number;
  valorDomicilioBase: number | string | null | undefined;
  domicilioGratis?: boolean | null;
  porcentajeDescuento?: number | null;
}): ResumenDomicilio {
  const subtotalProductos = redondearMoneda(Math.max(0, normalizarMonto(params.subtotalProductos)));
  const valorDomicilioReal = redondearMoneda(Math.max(0, normalizarMonto(params.valorDomicilioBase)));
  const domicilioEsGratis = Boolean(params.domicilioGratis);
  const valorDomicilioCobrado = domicilioEsGratis ? 0 : valorDomicilioReal;
  const porcentajeDescuento = Math.max(0, normalizarMonto(params.porcentajeDescuento ?? 0));
  const baseDescuento = subtotalProductos + valorDomicilioCobrado;
  const descuento = redondearMoneda(baseDescuento * (porcentajeDescuento / 100));
  const total = redondearMoneda(Math.max(0, baseDescuento - descuento));

  return {
    subtotalProductos,
    valorDomicilioCobrado,
    valorDomicilioReal,
    descuento,
    total,
    domicilioEsGratis,
  };
}

export function etiquetaValorDomicilio(
  valorDomicilioCobrado: number | string | null | undefined,
  domicilioEsGratis: boolean | null | undefined
) {
  if (domicilioEsGratis) return "Gratis";
  const valor = normalizarMonto(valorDomicilioCobrado);
  if (valor <= 0) return "$0";
  return `$${valor.toLocaleString("es-CO")}`;
}
