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

  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS historial_intervenciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registroId INTEGER NOT NULL,
      fechaIntervencion TEXT NOT NULL,
      tipoIntervencion TEXT NOT NULL,
      responsable TEXT,
      observaciones TEXT,
      fotoAntesUri TEXT,
      fotoDespuesUri TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (registroId) REFERENCES registros(id) ON DELETE CASCADE
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
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN tipoIntervencion TEXT;`
  ).catch(() => {});
  await db.execAsync(
    `ALTER TABLE registros ADD COLUMN prioridadIntervencion TEXT;`
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
      colorCriticidad,
      tipoIntervencion,
      prioridadIntervencion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      registro.colorCriticidad || null,
      registro.tipoIntervencion || null,
      registro.prioridadIntervencion || null
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

export const actualizarRegistro = async (registro) => {
  const db = await getDatabase();
  return db.runAsync(
    `UPDATE registros SET
      idArbol = ?,
      prCarretera = ?,
      unidadFuncional = ?,
      tipoVia = ?,
      fechaInspeccion = ?,
      inspector = ?,
      especie = ?,
      alturaMetros = ?,
      dapCentimetros = ?,
      distanciaViaMetros = ?,
      coordenadas = ?,
      ubicacionVia = ?,
      estado = ?,
      tipoIntervencion = ?,
      prioridadIntervencion = ?,
      colorCriticidad = ?,
      puntajeCriticidad = ?,
      nivelCriticidad = ?
    WHERE id = ?`,
    [
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
      registro.estado || 'Pendiente',
      registro.tipoIntervencion || null,
      registro.prioridadIntervencion || null,
      registro.colorCriticidad || null,
      registro.puntajeCriticidad ?? null,
      registro.nivelCriticidad || null,
      registro.id,
    ]
  );
};

export const obtenerHistorialIntervenciones = async (registroId) => {
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT * FROM historial_intervenciones WHERE registroId = ? ORDER BY fechaIntervencion DESC, id DESC',
    [registroId]
  );
};

export const insertarHistorialIntervencion = async (entry) => {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO historial_intervenciones (
      registroId,
      fechaIntervencion,
      tipoIntervencion,
      responsable,
      observaciones,
      fotoAntesUri,
      fotoDespuesUri
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.registroId,
      entry.fechaIntervencion,
      entry.tipoIntervencion,
      entry.responsable || null,
      entry.observaciones || null,
      entry.fotoAntesUri || null,
      entry.fotoDespuesUri || null,
    ]
  );
  return result.lastInsertRowId;
};
