export function toSlug(valor: string) {
  return valor
    .toLowerCase()
    .replace(/\s+/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function tiendaSubcategoriaHref(categoriaNombre: string, subcategoriaNombre: string) {
  return `/tienda/${toSlug(categoriaNombre)}/${toSlug(subcategoriaNombre)}`;
}

export function tiendaTipoProductoHref(
  categoriaNombre: string,
  subcategoriaNombre: string,
  tipoProductoNombre: string
) {
  return `${tiendaSubcategoriaHref(categoriaNombre, subcategoriaNombre)}/${toSlug(tipoProductoNombre)}`;
}
