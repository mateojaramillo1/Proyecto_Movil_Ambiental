<?php
require_once __DIR__ . '/config.php';

requireApiToken();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'success' => true,
        'message' => 'API de sincronizacion activa.',
        'endpoint' => 'sync.php',
        'method' => 'POST',
    ]);
    exit;
}

try {
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);

    if (!is_array($payload)) {
        throw new Exception('El cuerpo de la solicitud no es JSON valido.');
    }

    $registros = $payload['registros'] ?? [];
    $historialIntervenciones = $payload['historialIntervenciones'] ?? [];

    $pdo = getConnection();
    $pdo->beginTransaction();

    $registroStmt = $pdo->prepare(
        'INSERT INTO registros (
            local_id,
            nombre,
            ubicacion,
            tipo_actividad,
            descripcion,
            cantidad_residuos,
            fecha,
            estado,
            id_arbol,
            pr_carretera,
            unidad_funcional,
            tipo_via,
            fecha_inspeccion,
            inspector,
            especie,
            altura_metros,
            dap_centimetros,
            distancia_via_metros,
            coordenadas,
            ubicacion_via,
            foto_uri,
            criterios_criticidad,
            puntaje_criticidad,
            nivel_criticidad,
            color_criticidad,
            tipo_intervencion,
            prioridad_intervencion,
            sync_status,
            synced_at,
            updated_at
        ) VALUES (
            :local_id,
            :nombre,
            :ubicacion,
            :tipo_actividad,
            :descripcion,
            :cantidad_residuos,
            :fecha,
            :estado,
            :id_arbol,
            :pr_carretera,
            :unidad_funcional,
            :tipo_via,
            :fecha_inspeccion,
            :inspector,
            :especie,
            :altura_metros,
            :dap_centimetros,
            :distancia_via_metros,
            :coordenadas,
            :ubicacion_via,
            :foto_uri,
            :criterios_criticidad,
            :puntaje_criticidad,
            :nivel_criticidad,
            :color_criticidad,
            :tipo_intervencion,
            :prioridad_intervencion,
            :sync_status,
            :synced_at,
            NOW()
        ) ON DUPLICATE KEY UPDATE
            nombre = VALUES(nombre),
            ubicacion = VALUES(ubicacion),
            tipo_actividad = VALUES(tipo_actividad),
            descripcion = VALUES(descripcion),
            cantidad_residuos = VALUES(cantidad_residuos),
            fecha = VALUES(fecha),
            estado = VALUES(estado),
            id_arbol = VALUES(id_arbol),
            pr_carretera = VALUES(pr_carretera),
            unidad_funcional = VALUES(unidad_funcional),
            tipo_via = VALUES(tipo_via),
            fecha_inspeccion = VALUES(fecha_inspeccion),
            inspector = VALUES(inspector),
            especie = VALUES(especie),
            altura_metros = VALUES(altura_metros),
            dap_centimetros = VALUES(dap_centimetros),
            distancia_via_metros = VALUES(distancia_via_metros),
            coordenadas = VALUES(coordenadas),
            ubicacion_via = VALUES(ubicacion_via),
            foto_uri = VALUES(foto_uri),
            criterios_criticidad = VALUES(criterios_criticidad),
            puntaje_criticidad = VALUES(puntaje_criticidad),
            nivel_criticidad = VALUES(nivel_criticidad),
            color_criticidad = VALUES(color_criticidad),
            tipo_intervencion = VALUES(tipo_intervencion),
            prioridad_intervencion = VALUES(prioridad_intervencion),
            sync_status = VALUES(sync_status),
            synced_at = VALUES(synced_at),
            updated_at = NOW()'
    );

    $historialStmt = $pdo->prepare(
        'INSERT INTO historial_intervenciones (
            local_id,
            registro_local_id,
            fecha_intervencion,
            tipo_intervencion,
            responsable,
            observaciones,
            foto_antes_uri,
            foto_despues_uri,
            sync_status,
            synced_at,
            updated_at
        ) VALUES (
            :local_id,
            :registro_local_id,
            :fecha_intervencion,
            :tipo_intervencion,
            :responsable,
            :observaciones,
            :foto_antes_uri,
            :foto_despues_uri,
            :sync_status,
            :synced_at,
            NOW()
        ) ON DUPLICATE KEY UPDATE
            registro_local_id = VALUES(registro_local_id),
            fecha_intervencion = VALUES(fecha_intervencion),
            tipo_intervencion = VALUES(tipo_intervencion),
            responsable = VALUES(responsable),
            observaciones = VALUES(observaciones),
            foto_antes_uri = VALUES(foto_antes_uri),
            foto_despues_uri = VALUES(foto_despues_uri),
            sync_status = VALUES(sync_status),
            synced_at = VALUES(synced_at),
            updated_at = NOW()'
    );

    foreach ($registros as $registro) {
        $registroStmt->execute([
            ':local_id' => (int)($registro['localId'] ?? 0),
            ':nombre' => $registro['nombre'] ?? '',
            ':ubicacion' => $registro['ubicacion'] ?? '',
            ':tipo_actividad' => $registro['tipoActividad'] ?? '',
            ':descripcion' => $registro['descripcion'] ?? null,
            ':cantidad_residuos' => $registro['cantidadResiduos'] ?? null,
            ':fecha' => $registro['fecha'] ?? date('c'),
            ':estado' => $registro['estado'] ?? null,
            ':id_arbol' => $registro['idArbol'] ?? null,
            ':pr_carretera' => $registro['prCarretera'] ?? null,
            ':unidad_funcional' => $registro['unidadFuncional'] ?? null,
            ':tipo_via' => $registro['tipoVia'] ?? null,
            ':fecha_inspeccion' => $registro['fechaInspeccion'] ?? null,
            ':inspector' => $registro['inspector'] ?? null,
            ':especie' => $registro['especie'] ?? null,
            ':altura_metros' => $registro['alturaMetros'] ?? null,
            ':dap_centimetros' => $registro['dapCentimetros'] ?? null,
            ':distancia_via_metros' => $registro['distanciaViaMetros'] ?? null,
            ':coordenadas' => $registro['coordenadas'] ?? null,
            ':ubicacion_via' => $registro['ubicacionVia'] ?? null,
            ':foto_uri' => $registro['fotoUri'] ?? null,
            ':criterios_criticidad' => $registro['criteriosCriticidad'] ?? null,
            ':puntaje_criticidad' => $registro['puntajeCriticidad'] ?? null,
            ':nivel_criticidad' => $registro['nivelCriticidad'] ?? null,
            ':color_criticidad' => $registro['colorCriticidad'] ?? null,
            ':tipo_intervencion' => $registro['tipoIntervencion'] ?? null,
            ':prioridad_intervencion' => $registro['prioridadIntervencion'] ?? null,
            ':sync_status' => $registro['syncStatus'] ?? 'synced',
            ':synced_at' => $registro['syncedAt'] ?? null,
        ]);
    }

    foreach ($historialIntervenciones as $item) {
        $historialStmt->execute([
            ':local_id' => (int)($item['localId'] ?? 0),
            ':registro_local_id' => (int)($item['registroLocalId'] ?? 0),
            ':fecha_intervencion' => $item['fechaIntervencion'] ?? date('c'),
            ':tipo_intervencion' => $item['tipoIntervencion'] ?? '',
            ':responsable' => $item['responsable'] ?? null,
            ':observaciones' => $item['observaciones'] ?? null,
            ':foto_antes_uri' => $item['fotoAntesUri'] ?? null,
            ':foto_despues_uri' => $item['fotoDespuesUri'] ?? null,
            ':sync_status' => $item['syncStatus'] ?? 'synced',
            ':synced_at' => $item['syncedAt'] ?? null,
        ]);
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Datos sincronizados correctamente.',
        'registrosRecibidos' => count($registros),
        'historialRecibidos' => count($historialIntervenciones),
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $error->getMessage(),
    ]);
}
