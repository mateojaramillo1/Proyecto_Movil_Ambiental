import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  View,
  StatusBar,
  Text,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { insertarRegistro } from '../database';
import { takePendingCoords } from '../utils/coordsCache';
import { calcularCriticidad, getCriticidadConfig } from '../utils/criticidadArbol';

const formatDateISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

const formatCoords = (latitude, longitude) => `${decimalToDms(latitude, true)}, ${decimalToDms(longitude, false)}`;

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const CRITICIDAD_CONFIG = getCriticidadConfig();
const UF_OPTIONS = [
  'UF1 Pradera - Porcesito',
  'UF2 Porcesito - Santiago',
  'UF3 Tunel La Quiebra',
  'UF4 El Limon - Cisneros',
  'UF5 Cisneros - Alto de Dolores',
  'UF6 Hatovial'
];

const getImagePicker = () => {
  try {
    return require('expo-image-picker');
  } catch (_) {
    return null;
  }
};

const FormularioScreen = ({ navigation, route }) => {
  const [idArbol, setIdArbol] = useState('');
  const [prCarretera, setPrCarretera] = useState('');
  const [unidadFuncional, setUnidadFuncional] = useState('');
  const [tipoVia, setTipoVia] = useState('');
  const [fechaInspeccion, setFechaInspeccion] = useState(formatDateISO(new Date()));
  const [inspector, setInspector] = useState('');
  const [especie, setEspecie] = useState('');
  const [alturaMetros, setAlturaMetros] = useState('');
  const [dapCentimetros, setDapCentimetros] = useState('');
  const [distanciaViaMetros, setDistanciaViaMetros] = useState('');
  const [coordenadas, setCoordenadas] = useState('');
  const [ubicacionVia, setUbicacionVia] = useState('');
  const [fotoUri, setFotoUri] = useState('');
  const [criteriosSeleccionados, setCriteriosSeleccionados] = useState([]);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introTranslateY = useRef(new Animated.Value(20)).current;
  const heroShimmer = useRef(new Animated.Value(0)).current;

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = (firstDay.getDay() + 6) % 7;
    const days = [];

    for (let i = 0; i < startPadding; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push(day);
    }

    return days;
  }, [currentMonth]);

  const criticidadActual = useMemo(() => {
    return calcularCriticidad(criteriosSeleccionados);
  }, [criteriosSeleccionados]);

  // Lee las coordenadas pendientes cada vez que la pantalla recibe el foco
  // (al regresar de MapaGPS) sin depender de route params para evitar re-montaje.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const coords = takePendingCoords();
      if (coords) {
        setCoordenadas(coords);
        setMapLoading(false);
      }
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 430,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(introTranslateY, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true
      })
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(heroShimmer, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(heroShimmer, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [heroShimmer, introOpacity, introTranslateY]);

  const validarFormulario = () => {
    if (!idArbol.trim()) {
      Alert.alert('Error', 'Ingrese el ID del arbol');
      return false;
    }
    if (!prCarretera.trim()) {
      Alert.alert('Error', 'Ingrese el PR de carretera');
      return false;
    }
    if (!unidadFuncional) {
      Alert.alert('Error', 'Seleccione la unidad funcional (UF)');
      return false;
    }
    if (!tipoVia) {
      Alert.alert('Error', 'Seleccione el tipo de via');
      return false;
    }
    if (!fechaInspeccion.trim()) {
      Alert.alert('Error', 'Seleccione la fecha de inspeccion');
      return false;
    }
    if (!inspector.trim()) {
      Alert.alert('Error', 'Ingrese el nombre del inspector');
      return false;
    }
    if (!especie.trim()) {
      Alert.alert('Error', 'Ingrese la especie');
      return false;
    }
    if (!alturaMetros || isNaN(alturaMetros)) {
      Alert.alert('Error', 'Ingrese una altura valida en metros');
      return false;
    }
    if (!dapCentimetros || isNaN(dapCentimetros)) {
      Alert.alert('Error', 'Ingrese un DAP valido en centimetros');
      return false;
    }
    if (!distanciaViaMetros || isNaN(distanciaViaMetros)) {
      Alert.alert('Error', 'Ingrese una distancia valida a la via');
      return false;
    }
    if (!coordenadas.trim()) {
      Alert.alert('Error', 'Debe capturar la ubicacion actual en el mapa');
      return false;
    }
    if (!ubicacionVia) {
      Alert.alert('Error', 'Seleccione la ubicacion respecto a la via');
      return false;
    }
    return true;
  };

  const toggleCriterioCriticidad = (key) => {
    setCriteriosSeleccionados((prev) => {
      if (prev.includes(key)) {
        return prev.filter((item) => item !== key);
      }
      return [...prev, key];
    });
  };

  const guardarRegistro = async () => {
    if (!validarFormulario()) return;

    try {
      const registro = {
        nombre: inspector.trim(),
        ubicacion: coordenadas.trim(),
        tipoActividad: 'Inspeccion arborea',
        descripcion: `Especie: ${especie.trim()}`,
        cantidadResiduos: null,
        fecha: new Date().toISOString(),
        estado: 'Pendiente',
        idArbol: idArbol.trim(),
        prCarretera: prCarretera.trim(),
        unidadFuncional,
        tipoVia,
        fechaInspeccion: fechaInspeccion.trim(),
        inspector: inspector.trim(),
        especie: especie.trim(),
        alturaMetros: parseFloat(alturaMetros),
        dapCentimetros: parseFloat(dapCentimetros),
        distanciaViaMetros: parseFloat(distanciaViaMetros),
        coordenadas: coordenadas.trim(),
        ubicacionVia: ubicacionVia,
        fotoUri: fotoUri || null,
        criteriosCriticidad: JSON.stringify(criticidadActual.selectedKeys),
        puntajeCriticidad: criticidadActual.score,
        nivelCriticidad: criticidadActual.levelLabel,
        colorCriticidad: criticidadActual.color
      };

      await insertarRegistro(registro);

      Alert.alert('Exito', 'Registro guardado correctamente', [
        {
          text: 'Ver registros',
          onPress: () => navigation.navigate('Registros')
        },
        {
          text: 'Nuevo registro',
          onPress: limpiarFormulario
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el registro');
      console.error(error);
    }
  };

  const limpiarFormulario = () => {
    setIdArbol('');
    setPrCarretera('');
    setUnidadFuncional('');
    setTipoVia('');
    setFechaInspeccion(formatDateISO(new Date()));
    setInspector('');
    setEspecie('');
    setAlturaMetros('');
    setDapCentimetros('');
    setDistanciaViaMetros('');
    setCoordenadas('');
    setUbicacionVia('');
    setFotoUri('');
    setCriteriosSeleccionados([]);
  };

  const abrirMapaGps = () => {
    setMapLoading(true);
    navigation.navigate('MapaGPS');
  };

  const capturarFoto = async () => {
    const ImagePicker = getImagePicker();
    if (!ImagePicker) {
      Alert.alert('Funcion no disponible', 'Para usar foto en este dispositivo, instala la version mas reciente de la app.');
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Debes habilitar el permiso de camara para tomar la foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFotoUri(result.assets[0].uri);
    }
  };

  const seleccionarFotoGaleria = async () => {
    const ImagePicker = getImagePicker();
    if (!ImagePicker) {
      Alert.alert('Funcion no disponible', 'Para usar foto en este dispositivo, instala la version mas reciente de la app.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Debes habilitar el permiso de galeria para seleccionar la foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFotoUri(result.assets[0].uri);
    }
  };

  const abrirSelectorFoto = () => {
    Alert.alert('Foto del arbol', 'Selecciona como quieres agregar la foto', [
      { text: 'Tomar foto', onPress: capturarFoto },
      { text: 'Elegir de galeria', onPress: seleccionarFotoGaleria },
      { text: 'Cancelar', style: 'cancel' }
    ]);
  };

  const seleccionarDia = (day) => {
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setFechaInspeccion(formatDateISO(selected));
    setCalendarVisible(false);
  };

  const cambiarMes = (delta) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f8ff" />
      <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
        <View style={styles.bgOrbTop} />
        <View style={styles.bgOrbBottom} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bgGlow,
            {
              opacity: heroShimmer.interpolate({
                inputRange: [0, 1],
                outputRange: [0.18, 0.42]
              }),
              transform: [
                {
                  scale: heroShimmer.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.08]
                  })
                }
              ]
            }
          ]}
        />

        <View style={styles.darkTopMenuBar}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </TouchableOpacity>
          <Text style={styles.darkTopMenuTitle}>VINUS AMBIENTAL</Text>
          <View style={styles.darkTopMenuSpacer} />
        </View>

        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: introOpacity,
              transform: [{ translateY: introTranslateY }]
            }
          ]}
        >
          <View style={styles.topBarBrandOnly}>
            <Image source={require('../assets/logo_vinus.png')} style={styles.brandLogoLarge} resizeMode="contain" />
            <Text style={styles.formIntroTitle}>Registro de Arbol Urbano</Text>
            <Text style={styles.formIntroSubtitle}>Completa los datos tecnicos y de ubicacion del ejemplar</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Identificacion</Text>

            <Text style={styles.label}>ID Arbol *</Text>
            <TextInput
              style={styles.input}
              value={idArbol}
              onChangeText={setIdArbol}
              placeholder="Ej: ARB-001"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>PR (carretera) *</Text>
            <TextInput
              style={styles.input}
              value={prCarretera}
              onChangeText={setPrCarretera}
              placeholder="Ej: PR 12+300"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>UF (Unidad Funcional) *</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={unidadFuncional}
                onValueChange={(itemValue) => setUnidadFuncional(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Seleccione una UF" value="" />
                {UF_OPTIONS.map((uf) => (
                  <Picker.Item key={uf} label={uf} value={uf} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Tipo de Via *</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={tipoVia}
                onValueChange={(itemValue) => setTipoVia(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Seleccione el tipo de via" value="" />
                <Picker.Item label="Via sencilla" value="Via sencilla" />
                <Picker.Item label="Doble calzada" value="Doble calzada" />
              </Picker>
            </View>

            <Text style={styles.label}>Fecha de Inspeccion *</Text>
            <TouchableOpacity style={styles.inputButton} onPress={() => setCalendarVisible(true)}>
              <Text style={styles.inputButtonText}>{fechaInspeccion}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Inspector *</Text>
            <TextInput
              style={styles.input}
              value={inspector}
              onChangeText={setInspector}
              placeholder="Nombre del inspector"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Especie *</Text>
            <TextInput
              style={styles.input}
              value={especie}
              onChangeText={setEspecie}
              placeholder="Ej: Eucalipto"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Medidas Dendrometricas</Text>

            <Text style={styles.label}>Altura del Arbol (m) *</Text>
            <TextInput
              style={styles.input}
              value={alturaMetros}
              onChangeText={setAlturaMetros}
              placeholder="Ej: 8.5"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>DAP (cm) *</Text>
            <TextInput
              style={styles.input}
              value={dapCentimetros}
              onChangeText={setDapCentimetros}
              placeholder="Ej: 35.2"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Distancia a la Via (m) *</Text>
            <TextInput
              style={styles.input}
              value={distanciaViaMetros}
              onChangeText={setDistanciaViaMetros}
              placeholder="Ej: 3.0"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Ubicacion del Arbol</Text>

            <Text style={styles.label}>Ubicacion respecto a la Via *</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={ubicacionVia}
                onValueChange={(itemValue) => setUbicacionVia(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Seleccione una opcion" value="" />
                <Picker.Item label="TALUD SUPERIOR" value="TALUD SUPERIOR" />
                <Picker.Item label="BERMA" value="BERMA" />
                <Picker.Item label="SEPARADOR" value="SEPARADOR" />
                <Picker.Item label="TALUD INFERIOR" value="TALUD INFERIOR" />
              </Picker>
            </View>

            <Text style={styles.label}>Ubicacion actual (coordenadas) *</Text>
            <TextInput
              style={styles.input}
              value={coordenadas}
              editable={false}
              placeholder="Presione ABRIR MAPA GPS"
              placeholderTextColor="#999"
            />

            <TouchableOpacity style={styles.mapButton} onPress={abrirMapaGps} activeOpacity={0.88}>
              {mapLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.mapButtonText}>ABRIR MAPA GPS Y CAPTURAR COORDENADAS</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Foto del Arbol</Text>
            {fotoUri ? (
              <Image source={{ uri: fotoUri }} style={styles.photoPreview} resizeMode="cover" />
            ) : (
              <Text style={styles.helperText}>Aun no se ha seleccionado una foto.</Text>
            )}
            <TouchableOpacity style={styles.photoButton} onPress={abrirSelectorFoto} activeOpacity={0.88}>
              <Text style={styles.mapButtonText}>{fotoUri ? 'CAMBIAR FOTO' : 'AGREGAR FOTO'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Evaluacion de Criticidad</Text>
            <Text style={styles.sectionDescription}>
              Marca solo las condiciones observadas. El sistema suma puntos y calcula el nivel automaticamente.
            </Text>

            <View style={[styles.criticidadSummaryCard, { backgroundColor: criticidadActual.accent, borderColor: criticidadActual.color }] }>
              <View style={styles.criticidadSummaryRow}>
                <Text style={styles.criticidadSummaryLabel}>Puntaje actual</Text>
                <Text style={[styles.criticidadSummaryValue, { color: criticidadActual.color }]}>
                  {criticidadActual.score}/{criticidadActual.maxScore}
                </Text>
              </View>
              <View style={styles.criticidadSummaryRow}>
                <Text style={styles.criticidadSummaryLabel}>Nivel</Text>
                <View style={[styles.criticidadBadge, { backgroundColor: criticidadActual.color }]}>
                  <Text style={styles.criticidadBadgeText}>{criticidadActual.levelLabel}</Text>
                </View>
              </View>
              <Text style={styles.criticidadSummaryFoot}>
                Criterios seleccionados: {criticidadActual.selectedCount}
              </Text>
            </View>

            {CRITICIDAD_CONFIG.groups.map((group) => (
              <View key={group.key} style={styles.criticidadGroupCard}>
                <Text style={styles.criticidadGroupTitle}>{group.title}</Text>
                <View style={styles.criticidadOptionsWrap}>
                  {group.items.map((item) => {
                    const selected = criteriosSeleccionados.includes(item.key);
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.criterioChip,
                          selected && styles.criterioChipSelected,
                          selected && { borderColor: criticidadActual.color, backgroundColor: criticidadActual.accent }
                        ]}
                        onPress={() => toggleCriterioCriticidad(item.key)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.criterioChipText, selected && { color: '#173c73' }]}>{item.label}</Text>
                        <View style={[styles.criterioPointsBadge, selected && { backgroundColor: criticidadActual.color }] }>
                          <Text style={styles.criterioPointsText}>{item.points} pts</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={guardarRegistro}>
            <Text style={styles.buttonText}>GUARDAR REGISTRO</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('Registros')}
          >
            <Text style={styles.secondaryButtonText}>VER REGISTROS</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <Modal visible={calendarVisible} transparent animationType="fade" onRequestClose={() => setCalendarVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => cambiarMes(-1)}>
                <Text style={styles.calendarArrow}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => cambiarMes(1)}>
                <Text style={styles.calendarArrow}>{'>'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {weekDays.map((w, index) => (
                <Text key={`w-${index}`} style={styles.weekDay}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {monthDays.map((day, index) => {
                if (!day) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const dayDate = formatDateISO(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                );
                const selected = dayDate === fechaInspeccion;

                return (
                  <TouchableOpacity
                    key={`${currentMonth.getMonth()}-${day}`}
                    style={[styles.dayCell, selected && styles.daySelected]}
                    onPress={() => seleccionarDia(day)}
                  >
                    <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.closeCalendarButton} onPress={() => setCalendarVisible(false)}>
              <Text style={styles.closeCalendarButtonText}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuBackdrop} onPress={() => setMenuVisible(false)} />
          <View style={styles.sideMenu}>
            <Text style={styles.sideMenuTitle}>Menu</Text>
            <TouchableOpacity
              style={styles.sideMenuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Registros');
              }}
            >
              <Text style={styles.sideMenuItemText}>Ver registros</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sideMenuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('VisorMapaArboles');
              }}
            >
              <Text style={styles.sideMenuItemText}>Visor mapa arboles</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideMenuItemSecondary} onPress={() => setMenuVisible(false)}>
              <Text style={styles.sideMenuItemSecondaryText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f8ff'
  },
  containerContent: {
    padding: 16,
    paddingBottom: 28
  },
  bgOrbTop: {
    position: 'absolute',
    top: -80,
    right: -30,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#d7e7ff'
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: -110,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#c6dcff'
  },
  bgGlow: {
    position: 'absolute',
    top: 70,
    right: -30,
    width: 230,
    height: 230,
    borderRadius: 140,
    backgroundColor: '#9dd3ff'
  },
  screenTopBar: {
    marginTop: 6,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  screenTopTitle: {
    color: '#275493',
    fontSize: 22,
    fontWeight: '800'
  },
  topBarSpacer: {
    width: 40,
    height: 40
  },
  heroCard: {
    marginBottom: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2f6ab8',
    backgroundColor: '#275493',
    shadowColor: '#0f2c57',
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800'
  },
  heroSubtitle: {
    marginTop: 4,
    color: '#dce8fb',
    fontSize: 13
  },
  progressMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  progressMetaText: {
    color: '#e8f0ff',
    fontSize: 12,
    fontWeight: '600'
  },
  progressMetaValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  progressTrack: {
    marginTop: 8,
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.24)',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#72d0ff'
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d6e4fa',
    shadowColor: '#14315a',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  darkTopMenuBar: {
    marginTop: (StatusBar.currentHeight || 0) + 4,
    marginBottom: 12,
    backgroundColor: '#0f376e',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  darkTopMenuTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.2
  },
  darkTopMenuSpacer: {
    width: 40,
    height: 40
  },
  topBarBrandOnly: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d9e5f7',
    alignItems: 'center'
  },
  formIntroTitle: {
    marginTop: 2,
    color: '#143b74',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  formIntroSubtitle: {
    marginTop: 3,
    color: '#5f7fab',
    fontSize: 12,
    fontWeight: '600'
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: '#d8e7ff',
    borderRadius: 14,
    backgroundColor: '#fcfeff',
    padding: 12,
    marginBottom: 12
  },
  sectionTitle: {
    color: '#1e4e92',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  sectionDescription: {
    color: '#5d77a0',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10
  },
  criticidadSummaryCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12
  },
  criticidadSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  criticidadSummaryLabel: {
    color: '#24497f',
    fontSize: 13,
    fontWeight: '700'
  },
  criticidadSummaryValue: {
    fontSize: 22,
    fontWeight: '800'
  },
  criticidadSummaryFoot: {
    marginTop: 2,
    color: '#4f678b',
    fontSize: 12,
    fontWeight: '600'
  },
  criticidadBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  criticidadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800'
  },
  criticidadGroupCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfebff',
    backgroundColor: '#f8fbff',
    padding: 10
  },
  criticidadGroupTitle: {
    color: '#143b74',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8
  },
  criticidadOptionsWrap: {
    gap: 8
  },
  criterioChip: {
    borderWidth: 1,
    borderColor: '#d5e4fb',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  criterioChipSelected: {
    borderWidth: 1.5
  },
  criterioChipText: {
    flex: 1,
    color: '#365785',
    fontSize: 13,
    fontWeight: '700'
  },
  criterioPointsBadge: {
    borderRadius: 999,
    backgroundColor: '#2f6ab8',
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  criterioPointsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800'
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  menuLine: {
    width: 16,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#ffffff'
  },
  brandLogoLarge: {
    width: 150,
    height: 86
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#275493',
    marginBottom: 30,
    textAlign: 'center'
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#275493',
    marginBottom: 6,
    marginTop: 10
  },
  input: {
    borderWidth: 1.2,
    borderColor: '#bfd3f5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#24497f',
    backgroundColor: '#f3f8ff'
  },
  inputButton: {
    borderWidth: 1.2,
    borderColor: '#bfd3f5',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: '#f3f8ff'
  },
  inputButtonText: {
    fontSize: 15,
    color: '#24497f'
  },
  mapButton: {
    marginTop: 10,
    backgroundColor: '#184b92',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2f6ab8',
    shadowColor: '#0f2c57',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6
  },
  photoPreview: {
    marginTop: 8,
    width: '100%',
    height: 190,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfd3f5'
  },
  helperText: {
    marginTop: 6,
    color: '#6b87b2',
    fontSize: 12,
    fontWeight: '600'
  },
  photoButton: {
    marginTop: 10,
    backgroundColor: '#275493',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2f6ab8'
  },
  button: {
    backgroundColor: '#163f7b',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2f6ab8'
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#275493'
  },
  secondaryButtonText: {
    color: '#275493',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4
  },
  pickerWrap: {
    borderWidth: 1.2,
    borderColor: '#bfd3f5',
    borderRadius: 12,
    backgroundColor: '#f6faff',
    overflow: 'hidden'
  },
  picker: {
    color: '#24497f'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#275493'
  },
  calendarArrow: {
    fontSize: 22,
    fontWeight: '700',
    color: '#275493',
    paddingHorizontal: 8
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    color: '#275493'
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999
  },
  dayText: {
    color: '#1f1f1f',
    fontSize: 15
  },
  daySelected: {
    backgroundColor: '#275493'
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700'
  },
  closeCalendarButton: {
    marginTop: 16,
    backgroundColor: '#275493',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center'
  },
  closeCalendarButtonText: {
    color: '#fff',
    fontWeight: '700'
  },
  menuOverlay: {
    flex: 1,
    flexDirection: 'row'
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)'
  },
  sideMenu: {
    width: 260,
    backgroundColor: '#ffffff',
    paddingTop: 52,
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#d9e5f7',
    shadowColor: '#153059',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: -3, height: 0 },
    elevation: 8
  },
  sideMenuTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#275493',
    marginBottom: 18
  },
  sideMenuItem: {
    backgroundColor: '#edf3ff',
    borderWidth: 1,
    borderColor: '#bfd3f5',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 12,
    marginBottom: 10
  },
  sideMenuItemText: {
    color: '#275493',
    fontSize: 15,
    fontWeight: '700'
  },
  sideMenuItemSecondary: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d9e5f7'
  },
  sideMenuItemSecondaryText: {
    color: '#6a86b3',
    fontSize: 14,
    fontWeight: '600'
  },
});

export default FormularioScreen;
