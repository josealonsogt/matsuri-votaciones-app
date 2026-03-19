// ============================================================================
// 🛂 SERVICIO DE AUTENTICACIÓN — services/authService.ts
//
// Responsabilidades:
//   1. Verificar si un DNI ya está ocupado por otro usuario
//   2. Registrar un nuevo usuario vinculando su UID de Firebase con su DNI
//
// SEGURIDAD: usamos una Transacción atómica para evitar la condición de carrera
// donde dos personas intentan registrarse con el mismo DNI al mismo tiempo.
// Si la transacción falla a mitad, Firebase revierte TODOS los cambios.
// ============================================================================

import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { Rol } from '../types';
import { db } from './firebaseConfig';

// Emails que reciben automáticamente permisos de administrador al registrarse.
// Añade aquí el email real del organizador del evento.
const ADMIN_EMAILS: string[] = [
  'admin@matsuri.com',
];

// ─── Verificaciones ──────────────────────────────────────────────────────────

/**
 * Comprueba si un DNI ya está vinculado a alguna cuenta.
 * Usamos una colección separada "usuarios_dni" como índice para búsquedas rápidas
 * sin necesidad de hacer un query costoso sobre toda la colección "usuarios".
 */
export const verificarDniExistente = async (dni: string): Promise<boolean> => {
  try {
    const dniRef = doc(db, 'usuarios_dni', dni);
    const snap = await getDoc(dniRef);
    return snap.exists();
  } catch (error) {
    console.error('❌ Error comprobando DNI:', error);
    // En caso de error de red, devolvemos false para no bloquear al usuario
    // El servidor rechazará el duplicado igualmente gracias a las reglas de Firestore
    return false;
  }
};

// ─── Registro ────────────────────────────────────────────────────────────────

/**
 * Vincula un UID de Firebase Auth con un DNI español en nuestra base de datos.
 *
 * Escribe en DOS colecciones a la vez dentro de una transacción:
 *   - "usuarios/{uid}"     → perfil completo del usuario
 *   - "usuarios_dni/{dni}" → índice de DNIs ocupados (para verificarDniExistente)
 *
 * Si el DNI ya fue tomado por otro usuario justo antes de que llegáramos,
 * la transacción lanza un error y no se escribe nada.
 */
export const registrarUsuario = async (
  uid: string,
  email: string,
  nombre: string,
  dni: string
): Promise<boolean> => {
  try {
    const usuarioRef = doc(db, 'usuarios', uid);
    const dniRef = doc(db, 'usuarios_dni', dni);

    const rolAsignado: Rol = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'usuario';

    await runTransaction(db, async (transaction) => {
      // PASO 1 — LEER: comprobar que nadie se adelantó con este DNI
      const dniDoc = await transaction.get(dniRef);
      if (dniDoc.exists()) {
        throw new Error('DNI_DUPLICADO');
      }

      // PASO 2 — ESCRIBIR: guardar perfil y bloquear el DNI
      transaction.set(usuarioRef, {
        uid,
        email,
        nombre,
        dni,
        rol: rolAsignado,
        fecha_registro: serverTimestamp(),
      });

      transaction.set(dniRef, {
        uid_propietario: uid,
        email_asociado: email,
      });
    });

    console.log(`✅ Usuario "${nombre}" registrado correctamente (rol: ${rolAsignado})`);
    return true;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ Error registrando en BD:', msg);
    return false;
  }
};