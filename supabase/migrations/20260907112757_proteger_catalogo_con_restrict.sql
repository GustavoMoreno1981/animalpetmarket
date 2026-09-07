alter table subcategorias
  drop constraint if exists subcategorias_categoria_id_fkey;
alter table subcategorias
  add constraint subcategorias_categoria_id_fkey
  foreign key (categoria_id) references categorias(id) on delete restrict;

alter table tipos_producto
  drop constraint if exists tipos_producto_subcategoria_id_fkey;
alter table tipos_producto
  add constraint tipos_producto_subcategoria_id_fkey
  foreign key (subcategoria_id) references subcategorias(id) on delete restrict;

alter table productos
  drop constraint if exists productos_subcategoria_id_fkey;
alter table productos
  add constraint productos_subcategoria_id_fkey
  foreign key (subcategoria_id) references subcategorias(id) on delete restrict;

alter table productos
  drop constraint if exists productos_tipo_producto_id_fkey;
alter table productos
  add constraint productos_tipo_producto_id_fkey
  foreign key (tipo_producto_id) references tipos_producto(id) on delete restrict;

alter table producto_presentaciones
  drop constraint if exists producto_presentaciones_producto_id_fkey;
alter table producto_presentaciones
  add constraint producto_presentaciones_producto_id_fkey
  foreign key (producto_id) references productos(id) on delete restrict;

alter table producto_subcategorias
  drop constraint if exists producto_subcategorias_producto_id_fkey;
alter table producto_subcategorias
  add constraint producto_subcategorias_producto_id_fkey
  foreign key (producto_id) references productos(id) on delete restrict;

alter table producto_subcategorias
  drop constraint if exists producto_subcategorias_subcategoria_id_fkey;
alter table producto_subcategorias
  add constraint producto_subcategorias_subcategoria_id_fkey
  foreign key (subcategoria_id) references subcategorias(id) on delete restrict;

alter table inventario_lotes
  drop constraint if exists inventario_lotes_producto_presentacion_id_fkey;
alter table inventario_lotes
  add constraint inventario_lotes_producto_presentacion_id_fkey
  foreign key (producto_presentacion_id) references producto_presentaciones(id) on delete restrict;
