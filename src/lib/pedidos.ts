export const METODOS_PAGO_PEDIDO = ["efectivo", "codigo_qr"] as const;

export type MetodoPagoPedido = (typeof METODOS_PAGO_PEDIDO)[number];

export const METODO_PAGO_POR_DEFECTO: MetodoPagoPedido = "efectivo";

export function esMetodoPagoPedido(valor: string | null | undefined): valor is MetodoPagoPedido {
  return METODOS_PAGO_PEDIDO.includes((valor ?? "") as MetodoPagoPedido);
}

export function etiquetaMetodoPago(valor: string | null | undefined) {
  switch (valor) {
    case "efectivo":
      return "Efectivo";
    case "codigo_qr":
      return "Código QR";
    default:
      return "No definido";
  }
}
