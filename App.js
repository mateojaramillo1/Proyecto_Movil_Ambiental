import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { initDatabase } from './database';
import FormularioScreen from './screens/FormularioScreen';
import MapaScreen from './screens/MapaScreen';
import RegistrosScreen from './screens/RegistrosScreen';
import VisorMapaScreen from './screens/VisorMapaScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [fatalError, setFatalError] = useState('');

  const fadeIn = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const contentScale = useRef(new Animated.Value(0.76)).current;
  const contentTranslateY = useRef(new Animated.Value(22)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const introDuration = 2250;

    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentScale, {
        toValue: 1,
        duration: 820,
        easing: Easing.out(Easing.back(1.02)),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 820,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const badgePulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, {
          toValue: 1.035,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(badgePulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    badgePulseLoop.start();

    const introTimer = setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 260,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(() => setShowIntro(false));
    }, introDuration);

    initDatabase()
      .catch((error) => {
        setDbError(true);
        setFatalError(error?.message || 'No se pudo iniciar el sistema local.');
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      clearTimeout(introTimer);
      badgePulseLoop.stop();
    };
  }, [badgePulse, contentScale, contentTranslateY, fadeIn, fadeOut]);

  if (dbError) {
    return (
      <View style={[styles.container, styles.errorBg]}>
        <Text style={styles.errorTitle}>VINUS AMBIENTAL</Text>
        <View style={styles.errorCard}>
          <Text style={styles.errorHeading}>Error de base de datos</Text>
          <Text style={styles.errorText}>
            No se pudo inicializar la base de datos local.{"\n\n"}
            Intenta reiniciar la app o reinstalarla.{"\n"}
            Si el problema persiste, contacta soporte.{"\n\n"}
            {fatalError}
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading || showIntro) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeOut }]}>
        <View style={styles.topLine} />
        <View style={styles.bottomLine} />

        <Animated.View
          style={[
            styles.introContent,
            {
              opacity: fadeIn,
              transform: [{ scale: contentScale }, { translateY: contentTranslateY }],
            },
          ]}
        >
          {!logoError ? (
            <View style={styles.logoWrap}>
              <Animated.Image
                source={require('./assets/logo_vinus.png')}
                style={[
                  styles.logo,
                  { transform: [{ scale: badgePulse }] },
                ]}
                resizeMode="contain"
                onError={() => setLogoError(true)}
              />
            </View>
          ) : (
            <Text style={styles.title}>VINUS AMBIENTAL</Text>
          )}

          <View style={styles.titleBlock}>
            <Text style={styles.title}>VINUS</Text>
            <Text style={styles.secondaryTitle}>AMBIENTAL</Text>
            <View style={styles.divider} />
            <Text style={styles.subtitle}>Gestion e inspeccion ambiental en campo</Text>
          </View>

          <Text style={styles.loaderText}>Inicializando plataforma</Text>
        </Animated.View>

        <Text style={styles.versionText}>v2.0</Text>
      </Animated.View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Formulario"
        screenOptions={{
          headerStyle: { backgroundColor: '#275493' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="Formulario" component={FormularioScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MapaGPS" component={MapaScreen} options={{ title: 'Mapa GPS' }} />
        <Stack.Screen name="Registros" component={RegistrosScreen} options={{ title: 'Mis Registros' }} />
        <Stack.Screen name="VisorMapaArboles" component={VisorMapaScreen} options={{ title: 'Visor de Arboles' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  introContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    width: '100%',
  },
  topLine: {
    position: 'absolute',
    top: 62,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: 'rgba(39, 84, 147, 0.18)',
  },
  bottomLine: {
    position: 'absolute',
    bottom: 58,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: 'rgba(39, 84, 147, 0.18)',
  },
  logoWrap: {
    position: 'relative',
    marginBottom: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 84,
    height: 84,
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 46,
    fontWeight: '700',
    color: '#1a3d72',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 10,
  },
  secondaryTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4a7ab5',
    textAlign: 'center',
    letterSpacing: 6,
    marginLeft: 6,
    marginBottom: 28,
  },
  divider: {
    width: 40,
    height: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(39, 84, 147, 0.30)',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(74, 122, 181, 0.75)',
    textAlign: 'center',
    letterSpacing: 1.2,
    maxWidth: 220,
  },
  loaderText: {
    marginTop: 40,
    color: 'rgba(39, 84, 147, 0.35)',
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 2.0,
    textTransform: 'uppercase',
  },
  versionText: {
    position: 'absolute',
    bottom: 20,
    color: 'rgba(39, 84, 147, 0.30)',
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 1.5,
  },
  errorBg: {
    backgroundColor: '#1f5d38',
  },
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginTop: 14,
  },
  errorTitle: {
    fontSize: 30,
    color: '#fff',
    fontWeight: '900',
    textAlign: 'center',
  },
  errorHeading: {
    color: '#b63b3b',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    color: '#333',
    fontSize: 15,
    textAlign: 'center',
  },
});
