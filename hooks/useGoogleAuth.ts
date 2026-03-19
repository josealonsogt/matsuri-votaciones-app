// ============================================================================
// 🔑 HOOK DE AUTENTICACIÓN GOOGLE — hooks/useGoogleAuth.ts
//
// Encapsula la lógica del login con Google para que LoginScreen
// no tenga que conocer los detalles de Firebase Auth.
//
// Maneja el error más común en entornos móviles: los popups bloqueados
// por navegadores dentro de otras apps (Instagram, WhatsApp, etc.)
// ============================================================================

import { FirebaseError } from 'firebase/app';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

const esFirebaseError = (e: unknown): e is FirebaseError => e instanceof FirebaseError;

export const useGoogleAuth = () => {
  const loginConGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Forzamos el selector de cuenta para que el usuario pueda elegir
      // aunque ya tenga una sesión de Google activa en el navegador
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // En dispositivos móviles web (Safari en iOS, Chrome en Android), los popups suelen dar 
      // muchos fallos de sesión o bloqueos. Usamos redirect en móvil y popup en escritorio.
      const esMovil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (esMovil) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
      
    } catch (error: unknown) {
      const code = esFirebaseError(error) ? error.code : '';
      const msg = error instanceof Error ? error.message : '';

      // El error más frecuente: navegadores embebidos (in-app) bloquean popups
      if (code === 'auth/popup-blocked' || msg.includes('popup')) {
        alert(
          '⚠️ Navegador no compatible\n\n' +
            'Para poder votar, pulsa los 3 puntitos del menú y elige\n' +
            '"Abrir en Chrome" o "Abrir en Safari".'
        );
      } else if (code !== 'auth/popup-closed-by-user') {
        // "popup-closed-by-user" no es un error real; el usuario simplemente cerró la ventana
        alert('❌ Error de conexión\nRevisa tu internet e inténtalo de nuevo.');
      }
    }
  };

  return { loginConGoogle };
};