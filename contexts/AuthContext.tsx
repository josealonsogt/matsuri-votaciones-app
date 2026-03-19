// ============================================================================
// 🔐 CONTEXTO DE AUTENTICACIÓN — contexts/AuthContext.tsx
//
// Mantiene a toda la app sincronizada sobre quién está logueado.
// Cualquier pantalla puede saber en un instante si el usuario existe,
// si ya registró su DNI y si tiene permisos de administrador.
//
// PATRÓN: Context + hook personalizado (useAuth) para un acceso limpio.
// ============================================================================

import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db } from '../services/firebaseConfig';
import type { DatosUsuario, Rol } from '../types';

// ─── Tipos del Contexto ───────────────────────────────────────────────────────

// Extiende el User de Firebase con los datos extra que guardamos en Firestore
export interface UsuarioCompleto extends User {
  dniRegistrado: boolean;
  datosUsuario?: DatosUsuario;
  esAdmin: boolean;
}

interface AuthContextType {
  usuario: UsuarioCompleto | null;
  cargando: boolean;
  // Fuerza una re-lectura de Firestore (útil justo después de registrar el DNI)
  actualizarDni: () => Promise<void>;
}

// Valor por defecto seguro para cuando el contexto se usa fuera del Provider
const AuthContext = createContext<AuthContextType>({
  usuario: null,
  cargando: true,
  actualizarDni: async () => {},
});

// Hook para consumir el contexto — más limpio que useContext en cada componente
export const useAuth = () => useContext(AuthContext);

// ─── Helpers privados ─────────────────────────────────────────────────────────

const parseRol = (valor: unknown): Rol => (valor === 'admin' ? 'admin' : 'usuario');

/** Usuario de Firebase Auth que aún no ha completado el registro con DNI. */
const sinDni = (user: User): UsuarioCompleto => ({
  ...user,
  dniRegistrado: false,
  esAdmin: false,
});

/** Usuario que ya tiene perfil completo en Firestore. */
const conDni = (user: User, datos: Record<string, unknown>): UsuarioCompleto => {
  const rol = parseRol(datos.rol);
  return {
    ...user,
    dniRegistrado: true,
    datosUsuario: {
      dni: String(datos.dni ?? ''),
      nombre: String(datos.nombre ?? ''),
      email: String(datos.email ?? user.email ?? ''),
      rol,
    },
    esAdmin: rol === 'admin',
  };
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [usuario, setUsuario] = useState<UsuarioCompleto | null>(null);
  const [cargando, setCargando] = useState(true);

  /**
   * Consulta Firestore para saber si este usuario de Google
   * ya completó el segundo paso (vincular su DNI).
   */
  const verificarPerfil = useCallback(async (user: User): Promise<UsuarioCompleto> => {
    try {
      const snap = await getDoc(doc(db, 'usuarios', user.uid));
      if (!snap.exists()) return sinDni(user);
      return conDni(user, snap.data() as Record<string, unknown>);
    } catch (error) {
      console.error('❌ Error verificando perfil en Firestore:', error);
      // Ante error de red, asumimos sin DNI para que no pase el filtro de seguridad
      return sinDni(user);
    }
  }, []);

  /** Refresca el estado del usuario — llamar después de registrar el DNI. */
  const actualizarDni = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    const actualizado = await verificarPerfil(user);
    setUsuario(actualizado);
  }, [verificarPerfil]);

  // Escuchamos los cambios de sesión de Firebase Auth en tiempo real.
  // onAuthStateChanged se dispara al abrir la app, al hacer login y al hacer logout.
  useEffect(() => {
    let montado = true; // Evita actualizar el estado si el componente ya se desmontó

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!montado) return;

      if (user) {
        const usuarioCompleto = await verificarPerfil(user);
        if (montado) setUsuario(usuarioCompleto);
      } else {
        if (montado) setUsuario(null);
      }
      if (montado) setCargando(false);
    });

    return () => {
      montado = false;
      unsubscribe();
    };
  }, [verificarPerfil]);

  // useMemo evita que el objeto de contexto se recree en cada render,
  // lo que causaría re-renders innecesarios en todos los consumidores.
  const value = useMemo(
    () => ({ usuario, cargando, actualizarDni }),
    [usuario, cargando, actualizarDni]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};