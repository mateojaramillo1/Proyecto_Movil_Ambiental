CREATE DATABASE IF NOT EXISTS Proyecto_Movil_Vinus_Ambiental CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE Proyecto_Movil_Vinus_Ambiental;

CREATE TABLE IF NOT EXISTS registros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  local_id INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  ubicacion VARCHAR(255) NOT NULL,
  tipo_actividad VARCHAR(120) NOT NULL,
  descripcion TEXT NULL,
  cantidad_residuos DECIMAL(10,2) NULL,
  fecha VARCHAR(80) NOT NULL,
  estado VARCHAR(80) NULL,
  id_arbol VARCHAR(120) NULL,
  pr_carretera VARCHAR(120) NULL,
  unidad_funcional VARCHAR(120) NULL,
  tipo_via VARCHAR(120) NULL,
  fecha_inspeccion VARCHAR(80) NULL,
  inspector VARCHAR(120) NULL,
  especie VARCHAR(120) NULL,
  altura_metros DECIMAL(10,2) NULL,
  dap_centimetros DECIMAL(10,2) NULL,
  distancia_via_metros DECIMAL(10,2) NULL,
  coordenadas TEXT NULL,
  ubicacion_via TEXT NULL,
  foto_uri TEXT NULL,
  criterios_criticidad TEXT NULL,
  puntaje_criticidad INT NULL,
  nivel_criticidad VARCHAR(80) NULL,
  color_criticidad VARCHAR(40) NULL,
  tipo_intervencion VARCHAR(160) NULL,
  prioridad_intervencion VARCHAR(80) NULL,
  sync_status VARCHAR(30) DEFAULT 'synced',
  synced_at VARCHAR(80) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_registros_local_id (local_id)
);

CREATE TABLE IF NOT EXISTS historial_intervenciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  local_id INT NOT NULL,
  registro_local_id INT NOT NULL,
  fecha_intervencion VARCHAR(80) NOT NULL,
  tipo_intervencion VARCHAR(160) NOT NULL,
  responsable VARCHAR(120) NULL,
  observaciones TEXT NULL,
  foto_antes_uri TEXT NULL,
  foto_despues_uri TEXT NULL,
  sync_status VARCHAR(30) DEFAULT 'synced',
  synced_at VARCHAR(80) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_historial_local_id (local_id),
  KEY idx_historial_registro_local_id (registro_local_id)
);
