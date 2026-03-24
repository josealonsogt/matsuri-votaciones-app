// ============================================================================
// 🔑 HOOK DE AUTENTICACIÓN GOOGLE — hooks/useGoogleAuth.ts
//
// Al estar alojados en Firebase Hosting nativo, usamos signInWithPopup SIEMPRE.
// Es la experiencia más fluida: no recarga la página y funciona perfecto
// tanto en PC como en navegadores móviles (Safari/Chrome).
// ============================================================================

import { FirebaseError } from 'firebase/app';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

const esFirebaseError = (e: unknown): e is FirebaseError => e instanceof FirebaseError;

export const useGoogleAuth = () => {

  const loginConGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Hemos quitado el "select_account" forzado para que, si el usuario
      // ya tiene su Google abierto en el móvil, entre con 1 solo clic.
      
      // Popup es instantáneo y no recarga tu página web
      await signInWithPopup(auth, provider);
      
    } catch (error: unknown) {
      const code = esFirebaseError(error) ? error.code : '';
      const msg = error instanceof Error ? error.message : '';

      // Si el usuario abre el enlace desde dentro de Instagram/TikTok,
      // estas apps a veces bloquean los popups por seguridad.
      if (code === 'auth/popup-blocked' || msg.includes('popup')) {
        alert(
          '⚠️ Navegador bloqueado\n\n' +
          'Si estás abriendo esto desde Instagram, pulsa los 3 puntitos arriba y elige "Abrir en el navegador (Safari/Chrome)".'
        );
      } else if (code !== 'auth/popup-closed-by-user') {
        alert('❌ Error de conexión\nInténtalo de nuevo.');
      }
    }
  };

  return { loginConGoogle };
};