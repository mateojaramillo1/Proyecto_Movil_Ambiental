import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { initDatabase } from './database';
import FormularioScreen from './screens/FormularioScreen';
import MapaScreen from './screens/MapaScreen';
import RegistrosScreen from './screens/RegistrosScreen';
import VisorMapaScreen from './screens/VisorMapaScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

  // --- entry animated values ---
  const logoTranslateY = useRef(new Animated.Value(80)).current;
  const logoScale     = useRef(new Animated.Value(0.28)).current;
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const logoRotate    = useRef(new Animated.Value(-10)).current;

  const dividerScaleX = useRef(new Animated.Value(0)).current;
  const dividerOpacity = useRef(new Animated.Value(0)).current;

  const titleTranslateX = useRef(new Animated.Value(-60)).current;
  const titleOpacity    = useRef(new Animated.Value(0)).current;
  const titleGlow       = useRef(new Animated.Value(0.18)).current;

  const subtitleTranslateX = useRef(new Animated.Value(60)).current;
  const subtitleOpacity    = useRef(new Animated.Value(0)).current;

  const barWidth   = useRef(new Animated.Value(0)).current;
  const barOpacity = useRef(new Animated.Value(0)).current;

  // --- loop animated values ---
  const logoPulse  = useRef(new Animated.Value(1)).current;
  const shimmerX   = useRef(new Animated.Value(-100)).current;
  const orb1Scale  = useRef(new Animated.Value(0.8)).current;
  const orb2Scale  = useRef(new Animated.Value(0.7)).current;
  const orb3Scale  = useRef(new Animated.Value(0.9)).current;
  const haloScale = useRef(new Animated.Value(0.5)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(24)).current;
  const dot1Opacity = useRef(new Animated.Value(0.28)).current;
  const dot2Opacity = useRef(new Animated.Value(0.28)).current;
  const dot3Opacity = useRef(new Animated.Value(0.28)).current;

  const [logoError, setLogoError] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [fatalError, setFatalError] = useState(null);

  useEffect(() => {
    const introDuration = 3600;

    const logoPulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(250),
        Animated.timing(shimmerX, {
          toValue: 260,
          duration: 1300,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerX, {
          toValue: -100,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const orb1Loop = Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Scale, { toValue: 1.08, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(orb1Scale, { toValue: 0.92, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );

    const orb2Loop = Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Scale, { toValue: 1.12, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(orb2Scale, { toValue: 0.82, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );

    const orb3Loop = Animated.loop(
      Animated.sequence([
        Animated.timing(orb3Scale, { toValue: 1.06, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(orb3Scale, { toValue: 0.9, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(titleGlow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(titleGlow, { toValue: 0.35, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    );

    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(dot1Opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(dot2Opacity, { toValue: 0.3, duration: 260, useNativeDriver: true }),
          Animated.timing(dot3Opacity, { toValue: 0.3, duration: 260, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(dot1Opacity, { toValue: 0.3, duration: 260, useNativeDriver: true }),
          Animated.timing(dot2Opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(dot3Opacity, { toValue: 0.3, duration: 260, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(dot1Opacity, { toValue: 0.3, duration: 260, useNativeDriver: true }),
          Animated.timing(dot2Opacity, { toValue: 0.3, duration: 260, useNativeDriver: true }),
          Animated.timing(dot3Opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        ]),
      ])
    );

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.back(1.3)),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoTranslateY, {
          toValue: 0,
          duration: 820,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 820,
          easing: Easing.out(Easing.back(1.25)),
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 0,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(haloOpacity, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(haloScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(dividerOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(dividerScaleX, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateX, {
          toValue: 0,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateX, {
          toValue: 0,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(barOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(barWidth, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    logoPulseLoop.start();
    shimmerLoop.start();
    orb1Loop.start();
    orb2Loop.start();
    orb3Loop.start();
    glowLoop.start();
    dotLoop.start();

    const introTimer = setTimeout(() => {
      setShowIntro(false);
    }, introDuration);

    initDatabase()
      .catch((error) => {
        setDbError(true);
        setFatalError(error?.message || 'No se pudo iniciar el sistema local.');
      })
      .finally(() => setIsLoading(false));

    return () => {
      clearTimeout(introTimer);
      logoPulseLoop.stop();
      shimmerLoop.stop();
      orb1Loop.stop();
      orb2Loop.stop();
      orb3Loop.stop();
      glowLoop.stop();
      dotLoop.stop();
    };
  }, []);

  // Splash robusto: si está cargando o intro, muestra splash animado/fallback; si no, navegación normal
  if (dbError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1f5d38' }]}> 
        <Animated.Text style={[styles.title, { fontSize: 34, color: '#fff', marginBottom: 18, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 12 }]}>VINUS AMBIENTAL</Animated.Text>
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 18, margin: 18 }}>
          <Animated.Text style={{ color: '#b63b3b', fontWeight: 'bold', fontSize: 18, textAlign: 'center', marginBottom: 8 }}>
            Error de base de datos
          </Animated.Text>
          <Animated.Text style={{ color: '#333', fontSize: 15, textAlign: 'center' }}>
            No se pudo inicializar la base de datos local.\n\nIntenta reiniciar la app o reinstalarla.\nSi el problema persiste, contacta soporte.
          </Animated.Text>
        </View>
      </View>
    );
  }

  if (isLoading || showIntro) {
    return (
      <View style={styles.container}>
        {/* Orbes de fondo animados */}
        <Animated.View style={[styles.orb1, { transform: [{ scale: orb1Scale }] }]} />
        <Animated.View style={[styles.orb2, { transform: [{ scale: orb2Scale }] }]} />
        <Animated.View style={[styles.orb3, { transform: [{ scale: orb3Scale }] }]} />

        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            }
          ]}
        >
          <Animated.View
            style={[
              styles.logoHalo,
              {
                opacity: haloOpacity,
                transform: [{ scale: haloScale }],
              }
            ]}
          />
          <Animated.View style={[styles.brandCapsule, { opacity: subtitleOpacity }]}> 
            <Animated.Text style={styles.brandCapsuleText}>VINUS EXPERIENCE</Animated.Text>
          </Animated.View>
          {/* Logo con respiro suave o fallback si falla */}
          {!logoError ? (
            <Animated.Image
              source={require('./assets/logo_vinus.png')}
              style={[
                styles.logo,
                {
                  opacity: logoOpacity,
                  transform: [
                    { translateY: logoTranslateY },
                    { scale: Animated.multiply(logoScale, logoPulse) },
                    { rotate: logoRotate.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] }) },
                  ],
                }
              ]}
              resizeMode="contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <Animated.Text style={[styles.title, { fontSize: 38, color: '#fff', marginBottom: 18 }]}>VINUS AMBIENTAL</Animated.Text>
          )}

          {/* Línea divisoria que crece desde el centro */}
          <Animated.View
            style={[
              styles.divider,
              { opacity: dividerOpacity, transform: [{ scaleX: dividerScaleX }] }
            ]}
          />

          {/* Título desde la izquierda */}
          <Animated.Text
            style={[
              styles.title,
              {
                opacity: titleOpacity,
                transform: [{ translateX: titleTranslateX }],
                textShadowColor: '#fff',
                textShadowRadius: titleGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }),
                textShadowOffset: { width: 0, height: 0 },
                elevation: 6,
              }
            ]}
          >
            VINUS AMBIENTAL
          </Animated.Text>

          {/* Subtítulo desde la derecha */}
          <Animated.Text
            style={[
              styles.subtitle,
              { opacity: subtitleOpacity, transform: [{ translateX: subtitleTranslateX }] }
            ]}
          >
            Inspeccion ambiental en campo
          </Animated.Text>

          {/* Barra de progreso con shimmer */}
          <Animated.View style={[styles.barWrap, { opacity: barOpacity }]}> 
            <View style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barFill,
                  {
                    width: barWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  }
                ]}
              >
                <Animated.View
                  style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]}
                />
              </Animated.View>
            </View>
          </Animated.View>

          {/* Puntos de carga parpadeantes */}
          <View style={styles.dotsRow}>
            <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
            <Animated.View style={[styles.dot, { opacity: dot2Opacity }]} />
            <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
          </View>

          {/* Mensaje de error si falla la base de datos */}
          {dbError && (
            <View style={{ marginTop: 18 }}>
              <Animated.Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, backgroundColor: '#b63b3b', padding: 10, borderRadius: 8 }}>
                Error al inicializar la base de datos. Reinicia la app o contacta soporte.
              </Animated.Text>
            </View>
          )}
          {fatalError && (
            <View style={{ marginTop: 18 }}>
              <Animated.Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, backgroundColor: '#b63b3b', padding: 10, borderRadius: 8 }}>
                {fatalError}
              </Animated.Text>
            </View>
          )}
        </Animated.View>
      </View>
    );
  }

  // Si no está cargando ni intro, muestra la navegación normal
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
    backgroundColor: '#071a33',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Orbes de fondo ───────────────────────────────────────────────────
  orb1: {
    position: 'absolute',
    top: -110,
    right: -90,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: '#163d77',
    opacity: 0.9,
  },
  orb2: {
    position: 'absolute',
    bottom: 60,
    left: -130,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#0d4f47',
    opacity: 0.48,
  },
  orb3: {
    position: 'absolute',
    bottom: -70,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#21586d',
    opacity: 0.75,
  },
  // Contenido central ────────────────────────────────────────────────
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 10,
  },
  logoHalo: {
    position: 'absolute',
    top: 18,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(122, 210, 173, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  brandCapsule: {
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  brandCapsuleText: {
    color: '#d6efe2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  logo: {
    width: 230,
    height: 150,
    marginBottom: 10,
  },
  divider: {
    width: 148,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(180,231,212,0.52)',
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.6,
    marginBottom: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.13)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
    elevation: 8,
  },
  subtitle: {
    marginTop: 6,
    color: '#c7e7d8',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  barWrap: {
    width: 210,
    marginTop: 24,
  },
  barTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#69c3a0',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 70,
    height: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.50)',
  },
  // Dots ─────────────────────────────────────────────────────────────
  dotsRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 18,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#d0efe0',
  },
});
