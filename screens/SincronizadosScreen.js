import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { normalizeCoordsToDms } from '../utils/coordsFormat';
import { API_BASE_URL, API_TOKEN } from '../utils/apiConfig';

const SYNC_API_URL = `${API_BASE_URL}/obtener.php`;

const SincronizadosScreen = ({ navigation }) => {
  const [registros, setRegistros] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarRegistros();
    
    const unsubscribe = navigation.addListener('focus', () => {
      cargarRegistros();
    });

    return unsubscribe;
  }, [navigation]);

  const cargarRegistros = async () => {
    try {
      setCargando(true);
      const response = await fetch(SYNC_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Token': API_TOKEN,
        },
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.registros)) {
        setRegistros(data.registros);
      } else {
        Alert.alert('Error', data.message || 'No se pudieron cargar los registros del servidor');
      }
    } catch (error) {
      console.error('Error al cargar sincronizados:', error);
      Alert.alert('Error de conexión', error?.message || 'No se pudo conectar con el servidor');
    } finally {
      setCargando(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarRegistros();
    setRefreshing(false);
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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.id_arbol || item.nombre}</Text>
        <View style={styles.syncPill}>
          <Text style={styles.syncPillText}>Sincronizado</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {!!item.nivel_criticidad && (
          <View style={styles.row}>
            <Text style={styles.label}>Criticidad:</Text>
            <View style={[styles.criticidadPill, { backgroundColor: item.color_criticidad || '#275493' }]}>
              <Text style={styles.criticidadPillText}>
                {item.nivel_criticidad}{item.puntaje_criticidad != null ? ` · ${item.puntaje_criticidad}/100` : ''}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.row}>
          <Text style={styles.label}>Fecha de Inspeccion:</Text>
          <Text style={styles.value}>{item.fecha_inspeccion || formatearFecha(item.fecha)}</Text>
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
          <Text style={styles.value}>{item.altura_metros ?? '-'} m</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>DAP:</Text>
          <Text style={styles.value}>{item.dap_centimetros ?? '-'} cm</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Distancia a la Via:</Text>
          <Text style={styles.value}>{item.distancia_via_metros ?? '-'} m</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Coordenadas:</Text>
          <Text style={styles.value}>{normalizeCoordsToDms(item.coordenadas || item.ubicacion)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#275493" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Datos Sincronizados</Text>
        <Text style={styles.subtitle}>Total: {registros.length} registros en servidor</Text>
      </View>

      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#275493" />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      ) : registros.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay registros sincronizados aún</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fbf5',
  },
  header: {
    backgroundColor: '#275493',
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#275493',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  list: {
    padding: 15,
    paddingBottom: 30,
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
    backgroundColor: '#dff3e2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
});

export default SincronizadosScreen;
