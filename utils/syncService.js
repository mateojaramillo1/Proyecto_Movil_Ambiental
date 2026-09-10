import {
  obtenerRegistros,
  obtenerHistorialIntervenciones,
  marcarTodoComoSincronizado,
} from '../database';
import { API_BASE_URL, API_TOKEN } from './apiConfig';

const SYNC_API_URL = `${API_BASE_URL}/sync.php`;

const truncate = (value, max = 240) => {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const requestWithXhr = ({ method, url, headers = {}, body = null, timeoutMs = 15000 }) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.timeout = timeoutMs;

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) {
        return;
      }

      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        text: xhr.responseText || '',
      });
    };

    xhr.onerror = () => reject(new Error('XMLHttpRequest network error'));
    xhr.ontimeout = () => reject(new Error('XMLHttpRequest timeout'));

    try {
      xhr.send(body);
    } catch (error) {
      reject(error);
    }
  });
};

const buildApiHeaders = (contentType) => {
  const headers = {
    Accept: 'application/json',
    'X-API-Token': API_TOKEN,
  };

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  return headers;
};

const mapRegistroToPayload = (registro) => ({
  localId: registro.id,
  nombre: registro.nombre,
  ubicacion: registro.ubicacion,
  tipoActividad: registro.tipoActividad,
  descripcion: registro.descripcion,
  cantidadResiduos: registro.cantidadResiduos,
  fecha: registro.fecha,
  estado: registro.estado,
  idArbol: registro.idArbol,
  prCarretera: registro.prCarretera,
  unidadFuncional: registro.unidadFuncional,
  tipoVia: registro.tipoVia,
  fechaInspeccion: registro.fechaInspeccion,
  inspector: registro.inspector,
  especie: registro.especie,
  alturaMetros: registro.alturaMetros,
  dapCentimetros: registro.dapCentimetros,
  distanciaViaMetros: registro.distanciaViaMetros,
  coordenadas: registro.coordenadas,
  ubicacionVia: registro.ubicacionVia,
  fotoUri: registro.fotoUri,
  criteriosCriticidad: registro.criteriosCriticidad,
  puntajeCriticidad: registro.puntajeCriticidad,
  nivelCriticidad: registro.nivelCriticidad,
  colorCriticidad: registro.colorCriticidad,
  tipoIntervencion: registro.tipoIntervencion,
  prioridadIntervencion: registro.prioridadIntervencion,
  syncStatus: registro.syncStatus,
  syncedAt: registro.syncedAt,
});

const mapHistorialToPayload = (item) => ({
  localId: item.id,
  registroLocalId: item.registroId,
  fechaIntervencion: item.fechaIntervencion,
  tipoIntervencion: item.tipoIntervencion,
  responsable: item.responsable,
  observaciones: item.observaciones,
  fotoAntesUri: item.fotoAntesUri,
  fotoDespuesUri: item.fotoDespuesUri,
  syncStatus: item.syncStatus,
  syncedAt: item.syncedAt,
});

export const construirPayloadSincronizacion = async () => {
  const registros = await obtenerRegistros();
  const historialesAgrupados = await Promise.all(
    registros.map(async (registro) => ({
      registroId: registro.id,
      items: await obtenerHistorialIntervenciones(registro.id),
    }))
  );

  const historialIntervenciones = historialesAgrupados.flatMap((grupo) => {
    return grupo.items.map((item) => mapHistorialToPayload(item));
  });

  return {
    registros: registros.map(mapRegistroToPayload),
    historialIntervenciones,
  };
};

export const marcarSincronizacionLocalCompleta = async () => {
  await marcarTodoComoSincronizado();
};

export const sincronizarConServidor = async () => {
  const payload = await construirPayloadSincronizacion();

  const context = `URL=${SYNC_API_URL} | registros=${payload.registros.length} | historial=${payload.historialIntervenciones.length}`;

  // Paso 1: validar conectividad desde la app al endpoint.
  let precheckResponse;
  try {
    const fetchPrecheck = await fetch(SYNC_API_URL, {
      method: 'GET',
      headers: buildApiHeaders(),
    });
    precheckResponse = {
      ok: fetchPrecheck.ok,
      status: fetchPrecheck.status,
      text: await fetchPrecheck.text(),
      transport: 'fetch',
    };
  } catch (error) {
    try {
      const xhrPrecheck = await requestWithXhr({
        method: 'GET',
        url: SYNC_API_URL,
        headers: buildApiHeaders(),
      });
      precheckResponse = {
        ...xhrPrecheck,
        transport: 'xhr',
      };
    } catch (xhrError) {
      throw new Error(
        `SYNC_PRECHECK_ERROR | ${context} | fetch=${error?.message || 'error'} | xhr=${xhrError?.message || 'error'}`
      );
    }
  }

  if (!precheckResponse.ok) {
    throw new Error(
      `SYNC_PRECHECK_HTTP_${precheckResponse.status} | ${context} | transport=${precheckResponse.transport} | body=${truncate(precheckResponse.text)}`
    );
  }

  let response;
  try {
    const fetchResponse = await fetch(SYNC_API_URL, {
      method: 'POST',
      headers: buildApiHeaders('application/json'),
      body: JSON.stringify(payload),
    });
    response = {
      ok: fetchResponse.ok,
      status: fetchResponse.status,
      text: await fetchResponse.text(),
      transport: 'fetch',
    };
  } catch (error) {
    try {
      const xhrResponse = await requestWithXhr({
        method: 'POST',
        url: SYNC_API_URL,
        headers: buildApiHeaders('application/json'),
        body: JSON.stringify(payload),
      });
      response = {
        ...xhrResponse,
        transport: 'xhr',
      };
    } catch (xhrError) {
      throw new Error(
        `SYNC_POST_NETWORK_ERROR | ${context} | fetch=${error?.message || 'error'} | xhr=${xhrError?.message || 'error'}`
      );
    }
  }

  const responseText = response.text;
  let data = null;
  try {
    data = JSON.parse(responseText);
  } catch (error) {
    throw new Error(
      `SYNC_JSON_PARSE_ERROR | ${context} | transport=${response.transport} | status=${response.status} | body=${truncate(responseText)} | ${error?.message || 'JSON invalido'}`
    );
  }

  if (!response.ok || !data?.success) {
    throw new Error(
      `SYNC_SERVER_ERROR | ${context} | transport=${response.transport} | status=${response.status} | success=${String(data?.success)} | message=${truncate(data?.message || 'Sin mensaje')} | body=${truncate(responseText)}`
    );
  }

  await marcarTodoComoSincronizado();

  return {
    recordsSent: payload.registros.length,
    historySent: payload.historialIntervenciones.length,
    message: data.message || 'Sincronizacion completada',
  };
};

export const getSyncApiUrl = () => SYNC_API_URL;