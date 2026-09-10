import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { normalizeCoordsToDms } from './coordsFormat';

const sanitizeValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return value;
};

const formatearFechaRegistro = (fechaISO) => {
  if (!fechaISO) return '-';
  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return fechaISO;
  return fecha.toLocaleString('es-CO');
};

const escapeHtml = (v) =>
  String(v ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// MIME base64 requires lines of max 76 chars
const chunkBase64 = (str) => (str.match(/.{1,76}/g) || [str]).join('\r\n');

const leerFotoInfo = async (uri) => {
  if (!uri) return null;
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const ext = (uri.split('.').pop() || '').toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return { base64, mime };
  } catch {
    return null;
  }
};

export const exportarRegistrosExcel = async (registros) => {
  if (!registros || registros.length === 0) {
    throw new Error('No hay registros para exportar');
  }

  const filas = await Promise.all(
    registros.map(async (item) => ({
      ...item,
      _foto: await leerFotoInfo(item.fotoUri),
    }))
  );

  const boundary = `----=_ExcelPart_${Date.now()}`;

  // Cada fila referencia su imagen via Content-ID
  const filaHtml = (item, index) => {
    const cid = `foto${item.id || index}`;
    const imgTag = item._foto
      ? `<img src="cid:${cid}" width="120" height="90" style="object-fit:cover" />`
      : 'Sin foto';
    return `<tr style="height:110pt">
      <td>${index + 1}</td>
      <td>${escapeHtml(item.idArbol || item.nombre)}</td>
      <td>${escapeHtml(item.fechaInspeccion)}</td>
      <td>${escapeHtml(item.inspector || item.nombre)}</td>
      <td>${escapeHtml(item.especie)}</td>
      <td>${escapeHtml(sanitizeValue(item.alturaMetros))}</td>
      <td>${escapeHtml(sanitizeValue(item.dapCentimetros))}</td>
      <td>${escapeHtml(sanitizeValue(item.distanciaViaMetros))}</td>
      <td>${escapeHtml(item.nivelCriticidad)}</td>
      <td>${escapeHtml(item.tipoIntervencion)}</td>
      <td>${escapeHtml(normalizeCoordsToDms(item.coordenadas || item.ubicacion))}</td>
      <td>${escapeHtml(item.estado)}</td>
      <td>${formatearFechaRegistro(item.fecha)}</td>
      <td style="width:130pt">${imgTag}</td>
    </tr>`;
  };

  const htmlBody = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;font-size:10pt;}
th{background:#275493;color:#fff;padding:5pt 8pt;font-weight:bold;white-space:nowrap;}
td{padding:4pt 8pt;border:1pt solid #d0d8e8;vertical-align:middle;}
tr:nth-child(even) td{background:#f4f8ff;}
</style></head>
<body><table border="1">
<thead><tr>
  <th>N.</th><th>ID Arbol</th><th>Fecha inspeccion</th><th>Inspector</th>
  <th>Especie</th><th>Altura m</th><th>DAP cm</th><th>Dist. via m</th>
  <th>Criticidad</th><th>Intervencion</th><th>Coordenadas</th><th>Estado</th>
  <th>Fecha registro</th><th>Foto</th>
</tr></thead>
<tbody>${filas.map(filaHtml).join('')}</tbody>
</table></body></html>`;

  // Construir el archivo MHTML (formato que Excel lee con imagenes embebidas)
  let mhtml = `MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="${boundary}"\r\n\r\n`;

  mhtml += `--${boundary}\r\n`;
  mhtml += `Content-Type: text/html; charset="utf-8"\r\n`;
  mhtml += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
  mhtml += htmlBody;
  mhtml += `\r\n\r\n`;

  for (let i = 0; i < filas.length; i++) {
    const foto = filas[i]._foto;
    if (!foto) continue;
    const cid = `foto${filas[i].id || i}`;
    mhtml += `--${boundary}\r\n`;
    mhtml += `Content-Type: ${foto.mime}\r\n`;
    mhtml += `Content-Transfer-Encoding: base64\r\n`;
    mhtml += `Content-ID: <${cid}>\r\n\r\n`;
    mhtml += chunkBase64(foto.base64);
    mhtml += `\r\n\r\n`;
  }

  mhtml += `--${boundary}--`;

  const baseDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!baseDirectory) throw new Error('No se encontro carpeta disponible');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileUri = `${baseDirectory}registros_vinus_${timestamp}.xls`;

  await FileSystem.writeAsStringAsync(fileUri, mhtml, { encoding: 'utf8' });

  const sharingAvailable = await Sharing.isAvailableAsync();
  return { fileUri, sharingAvailable };
};