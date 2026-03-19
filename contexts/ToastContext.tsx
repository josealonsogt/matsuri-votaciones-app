import React, { createContext, useCallback, useContext, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

// Definimos los 3 colores de nuestros avisos
type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (mensaje: string, tipo?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipo, setTipo] = useState<ToastType>('info');
  const [fadeAnim] = useState(new Animated.Value(0)); // Para la animación suave

  const showToast = useCallback((msg: string, t: ToastType = 'info') => {
    setMensaje(msg);
    setTipo(t);
    setVisible(true);

    // Aparece
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Desaparece a los 3 segundos
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, 3000);
  }, [fadeAnim]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <>
      {children}
      
      {/* El cartelito visual que flota por encima de todo */}
      {visible && (
        <Animated.View style={[styles.toastContainer, styles[tipo], { opacity: fadeAnim }]}>
          <Text style={styles.texto}>
            {tipo === 'success' && '✅ '}
            {tipo === 'error' && '❌ '}
            {tipo === 'info' && 'ℹ️ '}
            {mensaje}
          </Text>
        </Animated.View>
      )}
        </>

    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 50, // Flota en la parte de abajo
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 5, // Sombra en Android
    shadowColor: '#000', // Sombra en iOS/Web
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 9999, // Asegura que esté por encima de TODO
    maxWidth: '80%',
  },
  success: { backgroundColor: '#2B8A3E' }, // Verde Matsuri
  error: { backgroundColor: '#C92A2A' },   // Rojo Matsuri
  info: { backgroundColor: '#343A40' },    // Gris oscuro
  texto: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});