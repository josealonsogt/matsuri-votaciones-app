import { FirebaseError } from 'firebase/app';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../services/firebaseConfig';

const esFirebaseError = (error: unknown): error is FirebaseError => error instanceof FirebaseError;

export const useGoogleAuth = () => {
  const { usuario } = useAuth();

  const loginConGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      await signInWithPopup(auth, provider);

    } catch (error: unknown) {
      const errorCode = esFirebaseError(error) ? error.code : '';
      const errorMessage = error instanceof Error ? error.message : '';

      console.error("Error Google:", errorCode || 'UNKNOWN');

      if (errorCode === 'auth/popup-blocked' || errorMessage.includes('popup')) {
        alert("⚠️ Navegador limitado detectado.\n\nPara poder votar, pulsa los 3 puntitos del menú (arriba o abajo) y elige 'Abrir en Chrome' o 'Abrir en Safari'.");
      } else {
        alert("Hubo un problema de conexión. Por favor, asegúrate de abrir la página en Chrome o Safari (sin modo incógnito).");
      }
    }
  };

  return { loginConGoogle, usuarioGoogle: usuario };
};