-- Política DELETE en ventas para rechazar pedidos despachados
drop policy if exists "Autenticados pueden eliminar ventas" on ventas;
create policy "Autenticados pueden eliminar ventas"
  on ventas for delete to authenticated using (true);
