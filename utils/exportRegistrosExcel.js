import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { normalizeCoordsToDms } from './coordsFormat';

const COLUMN_WIDTHS = [
  { wch: 8 },
  { wch: 16 },
  { wch: 20 },
  { wch: 18 },
  { wch: 18 },
  { wch: 12 },
  { wch: 12 },
  { wch: 18 },
  { wch: 28 },
  { wch: 22 }
];

const sanitizeValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return value;
};

const formatearFechaRegistro = (fechaISO) => {
  if (!fechaISO) {
    return '-';
  }

  const fecha = new Date(fechaISO);

  if (Number.isNaN(fecha.getTime())) {
    return fechaISO;
  }

  return fecha.toLocaleString('es-CO');
};

const construirFilas = (registros) => registros.map((item, index) => ({
  'N.': index + 1,
  'ID Arbol': sanitizeValue(item.idArbol || item.nombre),
  'Fecha de inspeccion': sanitizeValue(item.fechaInspeccion),
  Inspector: sanitizeValue(item.inspector || item.nombre),
  Especie: sanitizeValue(item.especie),
  'Altura (m)': sanitizeValue(item.alturaMetros),
  'DAP (cm)': sanitizeValue(item.dapCentimetros),
  'Distancia a la via (m)': sanitizeValue(item.distanciaViaMetros),
  Coordenadas: sanitizeValue(normalizeCoordsToDms(item.coordenadas || item.ubicacion)),
  'Fecha de registro': formatearFechaRegistro(item.fecha)
}));

export const exportarRegistrosExcel = async (registros) => {
  if (!registros || registros.length === 0) {
    throw new Error('No hay registros para exportar');
  }

  const rows = construirFilas(registros);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = COLUMN_WIDTHS;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros');

  const base64 = XLSX.write(workbook, {
    type: 'base64',
    bookType: 'xlsx'
  });

  const baseDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;

  if (!baseDirectory) {
    throw new Error('No se encontro una carpeta disponible para guardar el archivo');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileUri = `${baseDirectory}registros_vinus_ambiental_${timestamp}.xlsx`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: 'base64'
  });

  const sharingAvailable = await Sharing.isAvailableAsync();

  return {
    fileUri,
    sharingAvailable
  };
};