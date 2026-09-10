import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Image } from 'react-native';

const MainScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f8ff" />
      <View style={styles.header}>
        <Image source={require('../assets/logo_vinus.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>VINUS AMBIENTAL</Text>
        <Text style={styles.subtitle}>Seleccione una opción para continuar</Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Formulario')}
        >
          <Text style={styles.buttonText}>Árboles en Riesgo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.disabledButton]}>
          <Text style={styles.buttonText}>Proximamente...</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.disabledButton]}>
          <Text style={styles.buttonText}>Proximamente...</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    width: 150,
    height: 86,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#143b74',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#5f7fab',
    textAlign: 'center',
    marginTop: 5,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    backgroundColor: '#163f7b',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2f6ab8'
  },
  disabledButton: {
    backgroundColor: '#a9a9a9',
    borderColor: '#999999'
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MainScreen;
