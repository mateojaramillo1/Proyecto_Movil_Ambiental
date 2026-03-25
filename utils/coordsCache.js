// Módulo compartido para pasar coordenadas de MapaScreen a FormularioScreen
// sin depender de route params (evita que el componente se vuelva a montar).

let _pendingCoords = null;

export const storePendingCoords = (coords) => {
  _pendingCoords = coords;
};

export const takePendingCoords = () => {
  const coords = _pendingCoords;
  _pendingCoords = null;
  return coords;
};
