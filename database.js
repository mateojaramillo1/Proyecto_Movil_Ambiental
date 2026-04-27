import * as SQLite from 'expo-sqlite';

let dbPromise;

const getDatabase = async () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('ambiental.db');
  }
  return dbPromise;
};

export const initDatabase = async () => {
  const db = await getDatabase();
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS registros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      ubicacion TEXT NOT NULL,
      tipoActividad TEXT NOT NULL,
      descripcion TEXT,
      cantidadResiduos REAL,
      fecha TEXT NOT NULL,
      estado TEXT DEFAULT 'Pendiente'
    );`
  );

  // Migracion incremental para agregar nuevos campos sin perder registros existentes.
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN idArbol TEXT;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN prCarretera TEXT;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN unidadFuncional TEXT;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN tipoVia TEXT;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN fechaInspeccion TEXT;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN inspector TEXT;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN especie TEXT;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN alturaMetros REAL;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN dapCentimetros REAL;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN distanciaViaMetros REAL;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN coordenadas TEXT;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN ubicacionVia TEXT;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN fotoUri TEXT;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN criteriosCriticidad TEXT;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN puntajeCriticidad INTEGER;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN nivelCriticidad TEXT;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN colorCriticidad TEXT;`
  ).catch(() => {});
};

export const insertarRegistro = async (registro) => {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO registros (
      nombre,
      ubicacion,
      tipoActividad,
      descripcion,
      cantidadResiduos,
      fecha,
      estado,
      idArbol,
      prCarretera,
      unidadFuncional,
      tipoVia,
      fechaInspeccion,
      inspector,
      especie,
      alturaMetros,
      dapCentimetros,
      distanciaViaMetros,
      coordenadas,
      ubicacionVia,
      fotoUri,
      criteriosCriticidad,
      puntajeCriticidad,
      nivelCriticidad,
      colorCriticidad
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      registro.nombre,
      registro.ubicacion,
      registro.tipoActividad,
      registro.descripcion,
      registro.cantidadResiduos,
      registro.fecha,
      registro.estado || 'Pendiente',
      registro.idArbol || null,
      registro.prCarretera || null,
      registro.unidadFuncional || null,
      registro.tipoVia || null,
      registro.fechaInspeccion || null,
      registro.inspector || null,
      registro.especie || null,
      registro.alturaMetros ?? null,
      registro.dapCentimetros ?? null,
      registro.distanciaViaMetros ?? null,
      registro.coordenadas || null,
      registro.ubicacionVia || null,
      registro.fotoUri || null,
      registro.criteriosCriticidad || null,
      registro.puntajeCriticidad ?? null,
      registro.nivelCriticidad || null,
      registro.colorCriticidad || null
    ]
  );
  return result.lastInsertRowId;
};

export const obtenerRegistros = async () => {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM registros ORDER BY id DESC');
};

export const eliminarRegistro = async (id) => {
  const db = await getDatabase();
  return db.runAsync('DELETE FROM registros WHERE id = ?', [id]);
};

export const actualizarEstado = async (id, nuevoEstado) => {
  const db = await getDatabase();
  return db.runAsync('UPDATE registros SET estado = ? WHERE id = ?', [nuevoEstado, id]);
};
