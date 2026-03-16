import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

const ADMIN_EMAILS = [
  'admin@matsuri.com',
];

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Error desconocido';
};

export const verificarDniExistente = async (dni: string): Promise<boolean> => {
  try {
    const dniRef = doc(db, "usuarios_dni", dni);
    const dniSnap = await getDoc(dniRef);
    return dniSnap.exists();
  } catch (error) {
    console.error("Error comprobando DNI:", error);
    return false;
  }
};

export const registrarUsuario = async (uid: string, email: string, nombre: string, dni: string): Promise<boolean> => {
  try {
    const usuarioRef = doc(db, "usuarios", uid);
    const dniRef = doc(db, "usuarios_dni", dni);
    const rolAsignado = ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "usuario";

    await runTransaction(db, async (transaction) => {
      const dniDoc = await transaction.get(dniRef);
      if (dniDoc.exists()) {
        throw new Error("DNI_DUPLICADO");
      }

      transaction.set(usuarioRef, {
        uid, email, nombre, dni,
        rol: rolAsignado,
        fecha_registro: serverTimestamp()
      });

      transaction.set(dniRef, {
        uid_propietario: uid, email_asociado: email
      });
    });

    return true;
  } catch (error: unknown) {
    console.error("Error en BD:", getErrorMessage(error));
    return false;
  }
};