// ============================================================================
// 🔑 HOOK DE AUTENTICACIÓN GOOGLE — hooks/useGoogleAuth.ts
//
// Maneja el login híbrido:
// - PC/Mac: Usa Popup (ventanita emergente rápida).
// - Móviles: Usa Redirect (viaja a Google y vuelve) para evitar los
//   bloqueadores de popups de Safari y navegadores in-app (Instagram, etc).
// ============================================================================

import { FirebaseError } from 'firebase/app';
import {
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect
} from 'firebase/auth';
import { useEffect } from 'react';
import { auth } from '../services/firebaseConfig';

const esFirebaseError = (e: unknown): e is FirebaseError => e instanceof FirebaseError;

export const useGoogleAuth = () => {

  // 👉 EL DETALLE CLAVE PARA MÓVILES: Esperar al usuario en el aeropuerto
  // Cada vez que esta pantalla carga, comprueba si venimos de vuelta de Google.
  useEffect(() => {
    const procesarVueltaDeGoogle = async () => {
      try {
        const resultado = await getRedirectResult(auth);
        if (resultado) {
          console.log("✅ Usuario recogido tras el redirect de Google:", resultado.user.email);
          // No hace falta hacer nada más; el AuthContext detectará el usuario
          // automáticamente y te mandará al Dashboard.
        }
      } catch (error) {
        console.error("❌ Error al volver de Google:", error);
        alert("Hubo un problema al completar el inicio de sesión con Google.");
      }
    };

    procesarVueltaDeGoogle();
  }, []);

  // 👉 LA FUNCIÓN DEL BOTÓN
  const loginConGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Forzamos que siempre pregunte qué cuenta usar (ideal si hay varios usuarios en el mismo PC)
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Detectamos si es un móvil o tablet
      const esMovil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (esMovil) {
        // En móvil: Viajamos a Google (la página se recargará)
        await signInWithRedirect(auth, provider);
      } else {
        // En PC: Abrimos ventanita emergente
        await signInWithPopup(auth, provider);
      }
      
    } catch (error: unknown) {
      const code = esFirebaseError(error) ? error.code : '';
      const msg = error instanceof Error ? error.message : '';

      // Si por algún motivo el popup falla (ej. bloqueador de anuncios estricto en PC)
      if (code === 'auth/popup-blocked' || msg.includes('popup')) {
        alert(
          '⚠️ Ventana bloqueada\n\n' +
          'Tu navegador ha bloqueado la ventana de Google. Por favor, permite los popups o usa un navegador normal (Chrome/Safari).'
        );
      } else if (code !== 'auth/popup-closed-by-user') {
        // Ignoramos el error si el usuario simplemente cerró la ventana a mano
        alert('❌ Error de conexión\nRevisa tu internet e inténtalo de nuevo.');
      }
    }
  };

  return { loginConGoogle };
};