import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { obtenerRegistros, eliminarRegistro } from '../database';
import * as Sharing from 'expo-sharing';
import { exportarRegistrosExcel } from '../utils/exportRegistrosExcel';
import { normalizeCoordsToDms } from '../utils/coordsFormat';
import { sincronizarConServidor } from '../utils/syncService';

const RegistrosScreen = ({ navigation }) => {
  const [registros, setRegistros] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    cargarRegistros();
    
    // Recargar cuando la pantalla recibe el foco
    const unsubscribe = navigation.addListener('focus', () => {
      cargarRegistros();
    });

    return unsubscribe;
  }, [navigation]);

  const cargarRegistros = async () => {
    try {
      const datos = await obtenerRegistros();
      setRegistros(datos);
    } catch (error) {
      console.error('Error al cargar registros:', error);
      Alert.alert('Error', 'No se pudieron cargar los registros');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarRegistros();
    setRefreshing(false);
  };

  const pendientesSincronizacion = registros.filter((registro) => registro.syncStatus !== 'synced').length;

  const confirmarEliminar = (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Está seguro que desea eliminar este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', onPress: () => handleEliminar(id), style: 'destructive' }
      ]
    );
  };

  const handleEliminar = async (id) => {
    try {
      await eliminarRegistro(id);
      await cargarRegistros();
      Alert.alert('Éxito', 'Registro eliminado');
    } catch (error) {
      Alert.alert('Error', 'No se pudo eliminar el registro');
    }
  };

  const formatearFecha = (fechaISO) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportarExcel = async () => {
    if (registros.length === 0) {
      Alert.alert('Sin registros', 'No hay registros para exportar');
      return;
    }

    try {
      setExportando(true);
      const { fileUri, sharingAvailable } = await exportarRegistrosExcel(registros);

      if (sharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.ms-excel',
          UTI: 'com.microsoft.excel.xls',
          dialogTitle: 'Descargar registros en Excel'
        });
      }

      Alert.alert(
        'Excel generado',
        sharingAvailable
          ? 'Se genero el archivo Excel y ya puedes guardarlo o compartirlo.'
          : 'Se genero el archivo Excel en el almacenamiento interno de la aplicacion.'
      );
    } catch (error) {
      console.error('Error al exportar registros:', error);
      Alert.alert('Error', 'No se pudo generar el archivo Excel');
    } finally {
      setExportando(false);
    }
  };

  const handleSincronizar = async () => {
    if (registros.length === 0) {
      Alert.alert('Sin registros', 'No hay datos para sincronizar.');
      return;
    }

    try {
      setSincronizando(true);
      const resultado = await sincronizarConServidor();
      await cargarRegistros();
      Alert.alert(
        'Sincronizacion completa',
        `Se respaldaron ${resultado.recordsSent} registros y ${resultado.historySent} intervenciones en el servidor.`
      );
    } catch (error) {
      console.error('Error al sincronizar:', error);
      Alert.alert('Error', error?.message || 'No se pudo sincronizar los datos.');
    } finally {
      setSincronizando(false);
    }
  };

  const sincronizarConWebView = async () => {
    const payload = await construirPayloadSincronizacion();
    const safePayload = JSON.stringify(payload).replace(/<\/script/gi, '<\\/script');
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            (async function () {
              const payload = ${safePayload};
              const url = ${JSON.stringify(syncApiUrl)};
              const send = (message) => {
                window.ReactNativeWebView.postMessage(JSON.stringify(message));
              };

              try {
                const response = await fetch(url, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  },
                  body: JSON.stringify(payload)
                });

                const text = await response.text();
                let data = null;
                try {
                  data = JSON.parse(text);
                } catch (error) {
                  send({ ok: false, code: 'WEBVIEW_JSON_PARSE_ERROR', status: response.status, body: text, message: error.message });
                  return;
                }

                if (!response.ok || !data.success) {
                  send({ ok: false, code: 'WEBVIEW_SERVER_ERROR', status: response.status, body: text, message: data.message || 'Respuesta no exitosa' });
                  return;
                }

                send({ ok: true, status: response.status, data: data });
              } catch (error) {
                send({ ok: false, code: 'WEBVIEW_NETWORK_ERROR', message: error.message || 'Fallo de red en WebView' });
              }
            })();
          </script>
        </body>
      </html>
    `;

    return new Promise((resolve, reject) => {
      webViewSyncResolverRef.current = { resolve, reject, payload };
      setWebViewSyncHtml(html);
    });
  };

  const handleWebViewSyncMessage = async (event) => {
    const resolver = webViewSyncResolverRef.current;
    if (!resolver) {
      return;
    }

    try {
      const parsed = JSON.parse(event.nativeEvent.data || '{}');
      if (parsed?.ok) {
        await marcarSincronizacionLocalCompleta();
        resolver.resolve({
          recordsSent: resolver.payload.registros.length,
          historySent: resolver.payload.historialIntervenciones.length,
        });
      } else {
        resolver.reject(
          new Error(
            `${parsed?.code || 'WEBVIEW_SYNC_ERROR'} | status=${parsed?.status ?? 'n/a'} | message=${parsed?.message || 'Sin mensaje'} | body=${String(parsed?.body || '').slice(0, 240)}`
          )
        );
      }
    } catch (error) {
      resolver.reject(new Error(`WEBVIEW_SYNC_HANDLER_ERROR | ${error?.message || 'No se pudo interpretar el resultado del WebView'}`));
    } finally {
      webViewSyncResolverRef.current = null;
      setWebViewSyncHtml('');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.idArbol || item.nombre}</Text>
        <View style={[styles.syncPill, item.syncStatus === 'synced' ? styles.syncPillDone : styles.syncPillPending]}>
          <Text style={styles.syncPillText}>{item.syncStatus === 'synced' ? 'Sincronizado' : 'Pendiente'}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {!!item.nivelCriticidad && (
          <View style={styles.row}>
            <Text style={styles.label}>Criticidad:</Text>
            <View style={[styles.criticidadPill, { backgroundColor: item.colorCriticidad || '#275493' }]}>
              <Text style={styles.criticidadPillText}>
                {item.nivelCriticidad}{item.puntajeCriticidad != null ? ` · ${item.puntajeCriticidad}/100` : ''}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.row}>
          <Text style={styles.label}>Fecha de Inspeccion:</Text>
          <Text style={styles.value}>{item.fechaInspeccion || formatearFecha(item.fecha)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Inspector:</Text>
          <Text style={styles.value}>{item.inspector || item.nombre}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Especie:</Text>
          <Text style={styles.value}>{item.especie || '-'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Altura:</Text>
          <Text style={styles.value}>{item.alturaMetros ?? '-'} m</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>DAP:</Text>
          <Text style={styles.value}>{item.dapCentimetros ?? '-'} cm</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Distancia a la Via:</Text>
          <Text style={styles.value}>{item.distanciaViaMetros ?? '-'} m</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Coordenadas:</Text>
          <Text style={styles.value}>{normalizeCoordsToDms(item.coordenadas || item.ubicacion)}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => confirmarEliminar(item.id)}
        >
          <Text style={styles.deleteButtonText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Registros Ambientales</Text>
        <Text style={styles.subtitle}>Total: {registros.length} registros</Text>
        <Text style={styles.syncStatusText}>Pendientes de sincronizar: {pendientesSincronizacion}</Text>
        <TouchableOpacity
          style={[styles.syncButton, sincronizando && styles.syncButtonDisabled]}
          onPress={handleSincronizar}
          disabled={sincronizando}
        >
          {sincronizando ? (
            <ActivityIndicator size="small" color="#275493" />
          ) : (
            <Text style={styles.syncButtonText}>SINCRONIZAR AHORA</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportButton, exportando && styles.exportButtonDisabled]}
          onPress={exportarExcel}
          disabled={exportando}
        >
          {exportando ? (
            <ActivityIndicator size="small" color="#275493" />
          ) : (
            <Text style={styles.exportButtonText}>DESCARGAR EXCEL</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.syncDock} pointerEvents="box-none">
        <View style={styles.syncDockCard}>
          <View style={styles.syncDockInfoWrap}>
            <Text style={styles.syncDockTitle}>Sincronizacion local</Text>
            <Text style={styles.syncDockSubtitle}>
              {pendientesSincronizacion} registros pendientes de enviar
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.syncDockButton, sincronizando && styles.syncDockButtonDisabled]}
            onPress={handleSincronizar}
            disabled={sincronizando}
          >
            {sincronizando ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.syncDockButtonText}>SINCRONIZAR</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {registros.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay registros guardados</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Formulario')}
          >
            <Text style={styles.buttonText}>CREAR PRIMER REGISTRO</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={registros}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Formulario')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#275493',
  },
  header: {
    backgroundColor: '#275493',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
    opacity: 0.8,
  },
  syncStatusText: {
    marginTop: 10,
    color: '#dce7f8',
    fontSize: 12,
    fontWeight: '600',
  },
  syncButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#dff3ff',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.8,
  },
  syncButtonText: {
    color: '#1a467f',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  syncDock: {
    position: 'absolute',
    left: 15,
    right: 15,
    bottom: 90,
    zIndex: 20,
  },
  syncDockCard: {
    backgroundColor: '#f4fbff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#cfe3f5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  syncDockInfoWrap: {
    flex: 1,
    paddingRight: 10,
  },
  syncDockTitle: {
    color: '#1a467f',
    fontSize: 13,
    fontWeight: '800',
  },
  syncDockSubtitle: {
    color: '#4f6f93',
    fontSize: 11,
    marginTop: 2,
  },

  syncDockButton: {
    backgroundColor: '#275493',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    marginLeft: 10,
  },
  syncDockButtonDisabled: {
    opacity: 0.8,
  },
  syncDockButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  exportButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  exportButtonDisabled: {
    opacity: 0.75,
  },
  exportFotosButton: {
    backgroundColor: '#275493',
    marginTop: 8,
  },
  exportFotosButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  exportButtonText: {
    color: '#275493',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  list: {
    padding: 15,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#275493',
    flex: 1,
    paddingRight: 10,
  },
  syncPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  syncPillDone: {
    backgroundColor: '#dff3e2',
  },
  syncPillPending: {
    backgroundColor: '#fff0cc',
  },
  syncPillText: {
    color: '#204a84',
    fontSize: 11,
    fontWeight: '800',
  },
  cardBody: {
    marginBottom: 15,
  },
  row: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#275493',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#333',
  },
  criticidadPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 2,
  },
  criticidadPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  cardActions: {
    flexDirection: 'row',
  },
  deleteButton: {
    width: '100%',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  deleteButtonText: {
    color: '#dc3545',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#275493',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#275493',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },

});

export default RegistrosScreen;
