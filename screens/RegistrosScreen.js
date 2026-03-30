import React, { useState, useEffect } from 'react';
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
import { obtenerRegistros, eliminarRegistro, actualizarEstado } from '../database';
import * as Sharing from 'expo-sharing';
import { exportarRegistrosExcel } from '../utils/exportRegistrosExcel';
import { normalizeCoordsToDms } from '../utils/coordsFormat';

const RegistrosScreen = ({ navigation }) => {
  const [registros, setRegistros] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [exportando, setExportando] = useState(false);

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

  const cambiarEstado = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === 'Pendiente' ? 'Completado' : 'Pendiente';
    try {
      await actualizarEstado(id, nuevoEstado);
      await cargarRegistros();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
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
          mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          UTI: 'org.openxmlformats.spreadsheetml.sheet',
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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.idArbol || item.nombre}</Text>
        <View style={[
          styles.estadoBadge,
          item.estado === 'Completado' ? styles.completado : styles.pendiente
        ]}>
          <Text style={styles.estadoText}>{item.estado}</Text>
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
          style={[styles.actionButton, styles.estadoButton]}
          onPress={() => cambiarEstado(item.id, item.estado)}
        >
          <Text style={styles.actionButtonText}>
            {item.estado === 'Pendiente' ? 'Marcar Completado' : 'Marcar Pendiente'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
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
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
  },
  pendiente: {
    backgroundColor: '#FFA500',
  },
  completado: {
    backgroundColor: '#4CAF50',
  },
  estadoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  estadoButton: {
    backgroundColor: '#275493',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
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
