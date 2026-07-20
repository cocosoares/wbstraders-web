export function databaseOrderError(error: { message?: string; code?: string }): { status: number; code: string; message: string } {
  const message = error.message ?? "database_error";
  if (message.includes("stock_not_initialized")) {
    return { status: 409, code: "STOCK_NOT_INITIALIZED", message: "El inventario del producto aún no está habilitado" };
  }
  if (message.includes("insufficient_stock")) {
    return { status: 409, code: "INSUFFICIENT_STOCK", message: "No hay stock suficiente para completar el pedido" };
  }
  return { status: 500, code: "ORDER_PERSISTENCE_FAILED", message: "No pudimos registrar el pedido" };
}
