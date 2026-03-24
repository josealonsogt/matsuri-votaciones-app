// ============================================================================
// 🔑 HOOK DE AUTENTICACIÓN GOOGLE — hooks/useGoogleAuth.ts
//
// Usamos signInWithPopup para todos. En Vercel, usar Redirect en móviles
// causa bucles infinitos por el bloqueo de cookies de terceros de Safari/iOS.
// ============================================================================

import { FirebaseError } from 'firebase/app';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

const esFirebaseError = (e: unknown): e is FirebaseError => e instanceof FirebaseError;

export const useGoogleAuth = () => {

  const loginConGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Usamos Popup SIEMPRE. En navegadores móviles (Safari/Chrome) abrirá
      // una pestaña nueva segura y volverá sin romper las cookies de Vercel.
      await signInWithPopup(auth, provider);
      
    } catch (error: unknown) {
      const code = esFirebaseError(error) ? error.code : '';
      const msg = error instanceof Error ? error.message : '';

      // Si se bloquea (ej. in-app browsers de Instagram o bloqueadores agresivos)
      if (code === 'auth/popup-blocked' || msg.includes('popup')) {
        alert(
          '⚠️ Ventana emergente bloqueada\n\n' +
          'Si estás viendo esto desde Instagram o una app similar, por favor, abre el enlace en Safari o Chrome para poder votar.'
        );
      } else if (code !== 'auth/popup-closed-by-user') {
        alert('❌ Error de conexión\nRevisa tu internet e inténtalo de nuevo.');
      }
    }
  };

  return { loginConGoogle };
};