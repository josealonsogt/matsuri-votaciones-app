// ============================================================================
// 🍞 CONTEXTO DE TOASTS — contexts/ToastContext.tsx
//
// Muestra mensajes flotantes (ej: "✅ Voto guardado") que desaparecen solos.
// Se puede invocar desde CUALQUIER pantalla con una sola línea:
//   const { showToast } = useToast();
//   showToast('¡Acción completada!', 'success');
// ============================================================================

import React, { createContext, useCallback, useContext, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (mensaje: string, tipo?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipo, setTipo] = useState<ToastType>('info');
  const [fadeAnim] = useState(new Animated.Value(0));

  const showToast = useCallback(
    (msg: string, t: ToastType = 'info') => {
      setMensaje(msg);
      setTipo(t);
      setVisible(true);

      // Aparecer suavemente
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();

      // Desaparecer automáticamente a los 3 segundos
      setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
          setVisible(false)
        );
      }, 3000);
    },
    [fadeAnim]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {/* El View wrapper es necesario para que position:'absolute' funcione en móvil */}
      <View style={{ flex: 1 }}>
        {children}
        {visible && (
          <Animated.View style={[styles.toast, styles[tipo], { opacity: fadeAnim }]}>
            <Text style={styles.texto}>
              {tipo === 'success' ? '✅ ' : tipo === 'error' ? '❌ ' : 'ℹ️ '}
              {mensaje}
            </Text>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 9999,
    maxWidth: '85%',
  },
  success: { backgroundColor: '#2B8A3E' },
  error: { backgroundColor: '#C92A2A' },
  info: { backgroundColor: '#343A40' },
  texto: { color: '#FFF', fontSize: 15, fontWeight: '600', textAlign: 'center' },
});