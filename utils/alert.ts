// ============================================================================
// 🛠️ UTILIDADES — utils/alerta.ts
//
// Abstrae la diferencia entre Alert (móvil) y window.confirm (web)
// para que ninguna pantalla tenga que repetir el bloque Platform.OS.
// ============================================================================

import { Alert, Platform } from 'react-native';

/**
 * Muestra un diálogo de confirmación con un botón destructivo.
 * En web usa window.confirm; en móvil usa Alert.alert de React Native.
 *
 * @param titulo       Título del diálogo
 * @param mensaje      Cuerpo del diálogo
 * @param onConfirmar  Callback que se ejecuta si el usuario acepta
 */
export const confirmarAccion = (
  titulo: string,
  mensaje: string,
  onConfirmar: () => void
): void => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensaje}`)) {
      onConfirmar();
    }
  } else {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive', onPress: onConfirmar },
    ]);
  }
};