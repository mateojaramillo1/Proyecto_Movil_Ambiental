import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { storePendingCoords } from '../utils/coordsCache';

const decimalToDms = (value, isLatitude) => {
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  const hemisphere = isLatitude
    ? (value >= 0 ? 'N' : 'S')
    : (value >= 0 ? 'E' : 'W');

  return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${hemisphere}`;
};

const parseDmsToDecimal = (value, isLatitude) => {
  if (!value || typeof value !== 'string') return NaN;
  const normalized = value.trim().toUpperCase();
  const numbers = normalized.match(/-?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 3) return NaN;

  const degrees = parseFloat(numbers[0]);
  const minutes = parseFloat(numbers[1]);
  const seconds = parseFloat(numbers[2]);

  if ([degrees, minutes, seconds].some(Number.isNaN)) return NaN;
  if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return NaN;

  let decimal = Math.abs(degrees) + (minutes / 60) + (seconds / 3600);
  if (degrees < 0) decimal *= -1;

  const hemisphereMatch = normalized.match(/(?:\s|^)([NSEW])\s*$/);
  if (hemisphereMatch) {
    const hemisphere = hemisphereMatch[1];
    if (hemisphere === 'S' || hemisphere === 'W') decimal = -Math.abs(decimal);
    if (hemisphere === 'N' || hemisphere === 'E') decimal = Math.abs(decimal);
  }

  const limit = isLatitude ? 90 : 180;
  if (decimal < -limit || decimal > limit) return NaN;

  return decimal;
};

const formatCoords = (latitude, longitude) => `${decimalToDms(latitude, true)}, ${decimalToDms(longitude, false)}`;

const MapaScreen = ({ navigation }) => {
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const obtenerUbicacionPrecisa = async () => {
    const samples = [];

    for (let i = 0; i < 3; i += 1) {
      try {
        const sample = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          mayShowUserSettingsDialog: true,
          timeout: 15000,
          maximumAge: 0
        });
        samples.push(sample.coords);
      } catch (error) {
        // Si una muestra falla, continuamos con las disponibles.
      }
    }

    if (samples.length === 0) {
      throw new Error('No se pudo obtener ninguna lectura GPS');
    }

    const sorted = samples.slice().sort((a, b) => {
      const aAcc = typeof a.accuracy === 'number' ? a.accuracy : Number.POSITIVE_INFINITY;
      const bAcc = typeof b.accuracy === 'number' ? b.accuracy : Number.POSITIVE_INFINITY;
      return aAcc - bAcc;
    });

    const best = sorted[0];
    const close = sorted.filter((s) => {
      return Math.abs(s.latitude - best.latitude) < 0.00025 && Math.abs(s.longitude - best.longitude) < 0.00025;
    }).slice(0, 2);

    if (close.length < 2) {
      return {
        latitude: best.latitude,
        longitude: best.longitude,
        accuracy: best.accuracy
      };
    }

    const avgLat = close.reduce((acc, s) => acc + s.latitude, 0) / close.length;
    const avgLng = close.reduce((acc, s) => acc + s.longitude, 0) / close.length;

    return {
      latitude: avgLat,
      longitude: avgLng,
      accuracy: best.accuracy
    };
  };

  const obtenerMiUbicacion = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Debes permitir ubicacion para capturar las coordenadas.');
        return;
      }

      const pos = await obtenerUbicacionPrecisa();

      const next = {
        latitude: pos.latitude,
        longitude: pos.longitude
      };

      setSelectedPosition(next);
      setManualLat(decimalToDms(next.latitude, true));
      setManualLng(decimalToDms(next.longitude, false));

      if (typeof pos.accuracy === 'number' && pos.accuracy > 35) {
        Alert.alert('Aviso', 'La precision GPS fue baja. Si ves desfase, vuelve a capturar ubicacion.');
      }
    } catch (error) {
      Alert.alert('Error', 'No fue posible obtener la ubicacion actual.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const aplicarCoordenadasManuales = () => {
    const lat = parseDmsToDecimal(manualLat, true);
    const lng = parseDmsToDecimal(manualLng, false);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Error', 'Ingrese coordenadas validas en formato DMS (ej: 4° 42\' 39.60" N).');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Error', 'Rango invalido. Latitud -90 a 90, Longitud -180 a 180.');
      return;
    }

    setSelectedPosition({ latitude: lat, longitude: lng });
  };

  const usarUbicacionSeleccionada = () => {
    if (!selectedPosition) {
      Alert.alert('Aviso', 'Primero obtenga su ubicacion o ingrese coordenadas manuales.');
      return;
    }

    // Guarda las coordenadas en el cache compartido y regresa sin crear
    // una nueva instancia de FormularioScreen (evita perder los campos).
    storePendingCoords(formatCoords(selectedPosition.latitude, selectedPosition.longitude));
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ubicacion GPS</Text>
        <Text style={styles.headerSubtitle}>Modo estable: mi ubicacion o coordenadas manuales</Text>
      </View>

      <View style={styles.body}>
        <TouchableOpacity style={styles.secondaryButton} onPress={obtenerMiUbicacion}>
          {loadingLocation ? (
            <ActivityIndicator color="#275493" />
          ) : (
            <Text style={styles.secondaryButtonText}>OBTENER MI UBICACION ACTUAL</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.coordsLabel}>Coordenadas seleccionadas:</Text>
        <Text style={styles.coordsValue}>
          {selectedPosition
            ? formatCoords(selectedPosition.latitude, selectedPosition.longitude)
            : 'Sin coordenadas seleccionadas'}
        </Text>

        <Text style={styles.manualTitle}>O escribir otra ubicacion:</Text>
        <View style={styles.manualRow}>
          <TextInput
            style={[styles.manualInput, styles.manualInputLeft]}
            value={manualLat}
            onChangeText={setManualLat}
            placeholder={'Latitud DMS (ej: 4° 42\' 39.60" N)'}
            placeholderTextColor="#8a9ab8"
          />
          <TextInput
            style={styles.manualInput}
            value={manualLng}
            onChangeText={setManualLng}
            placeholder={'Longitud DMS (ej: 74° 4\' 19.56" W)'}
            placeholderTextColor="#8a9ab8"
          />
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={aplicarCoordenadasManuales}>
          <Text style={styles.secondaryButtonText}>APLICAR COORDENADAS MANUALES</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={usarUbicacionSeleccionada}>
          <Text style={styles.primaryButtonText}>USAR ESTA UBICACION</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  header: {
    backgroundColor: '#275493',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700'
  },
  headerSubtitle: {
    color: '#dce7f8',
    fontSize: 13,
    marginTop: 4
  },
  body: {
    padding: 16
  },
  coordsLabel: {
    marginTop: 16,
    color: '#275493',
    fontSize: 13,
    fontWeight: '700'
  },
  coordsValue: {
    marginTop: 6,
    color: '#1f1f1f',
    fontSize: 14,
    marginBottom: 14
  },
  secondaryButton: {
    backgroundColor: '#edf3ff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bfd3f5'
  },
  secondaryButtonText: {
    color: '#275493',
    fontSize: 14,
    fontWeight: '700'
  },
  manualTitle: {
    marginBottom: 8,
    color: '#275493',
    fontSize: 13,
    fontWeight: '700'
  },
  manualRow: {
    flexDirection: 'row',
    marginBottom: 10
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#bfd3f5',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#275493',
    fontSize: 14
  },
  manualInputLeft: {
    marginRight: 8
  },
  primaryButton: {
    backgroundColor: '#275493',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  }
});

export default MapaScreen;
