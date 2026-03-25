import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet, Text, Image } from 'react-native';
import { initDatabase } from './database';
import FormularioScreen from './screens/FormularioScreen';
import MapaScreen from './screens/MapaScreen';
import RegistrosScreen from './screens/RegistrosScreen';
import VisorMapaScreen from './screens/VisorMapaScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    cargarDatabase();

    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const cargarDatabase = async () => {
    try {
      await initDatabase();
      console.log('Base de datos inicializada correctamente');
    } catch (error) {
      console.error('Error al inicializar la base de datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || showIntro) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.gradientTop} />
        <View style={styles.gradientMiddle} />
        <View style={styles.gradientBottom} />
        <View style={styles.loadingContent}>
          <Image source={require('./assets/logo_vinus.png')} style={styles.loadingLogo} resizeMode="contain" />
          <Text style={styles.loadingTitle}>VINUS AMBIENTAL</Text>
          <Text style={styles.loadingSubtitle}>Inspeccion ambiental en campo</Text>
          <View style={styles.loadingIndicatorWrap}>
            <ActivityIndicator size="small" color="#275493" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Formulario"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#275493',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Formulario"
          component={FormularioScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MapaGPS"
          component={MapaScreen}
          options={{ title: 'Mapa GPS' }}
        />
        <Stack.Screen
          name="Registros"
          component={RegistrosScreen}
          options={{ title: 'Mis Registros' }}
        />
        <Stack.Screen
          name="VisorMapaArboles"
          component={VisorMapaScreen}
          options={{ title: 'Visor de Arboles' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  loadingContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  gradientTop: {
    position: 'absolute',
    top: -70,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#d9e8ff',
    opacity: 0.95,
  },
  gradientMiddle: {
    position: 'absolute',
    top: 150,
    left: -90,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#eef5ff',
    opacity: 0.98,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: -80,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#cfe1ff',
    opacity: 0.9,
  },
  loadingLogo: {
    width: 180,
    height: 110,
  },
  loadingTitle: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: '800',
    color: '#275493',
    textAlign: 'center',
  },
  loadingSubtitle: {
    marginTop: 10,
    fontSize: 15,
    color: '#4d74b8',
    textAlign: 'center',
  },
  loadingIndicatorWrap: {
    marginTop: 22,
  },
});
