import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db } from '../services/firebaseConfig';
import type { DatosUsuario, Rol } from '../types';

interface UsuarioCompleto extends User {
  dniRegistrado: boolean;
  datosUsuario?: DatosUsuario;
  esAdmin: boolean;
}

interface AuthContextType {
  usuario: UsuarioCompleto | null;
  cargando: boolean;
  actualizarDni: () => Promise<void>;
}

const noopAsync = async (): Promise<void> => {};

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  cargando: true,
  actualizarDni: noopAsync,
});

export const useAuth = () => useContext(AuthContext);

const obtenerRol = (valor: unknown): Rol => (valor === 'admin' ? 'admin' : 'usuario');

const usuarioSinDni = (user: User): UsuarioCompleto => ({
  ...user,
  dniRegistrado: false,
  esAdmin: false,
});

const usuarioConDni = (user: User, datos: Record<string, unknown>): UsuarioCompleto => {
  const rol = obtenerRol(datos.rol);

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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [usuario, setUsuario] = useState<UsuarioCompleto | null>(null);
  const [cargando, setCargando] = useState(true);

  const verificarDniUsuario = useCallback(async (user: User): Promise<UsuarioCompleto> => {
    try {
      const usuarioRef = doc(db, 'usuarios', user.uid);
      const usuarioSnap = await getDoc(usuarioRef);

      if (!usuarioSnap.exists()) {
        return usuarioSinDni(user);
      }

      const datos = usuarioSnap.data() as Record<string, unknown>;
      return usuarioConDni(user, datos);
    } catch (error) {
      console.error('Error verificando DNI:', error);
      return usuarioSinDni(user);
    }
  }, []);

  const actualizarDni = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const usuarioActualizado = await verificarDniUsuario(currentUser);
    setUsuario(usuarioActualizado);
  }, [verificarDniUsuario]);

  useEffect(() => {
    let activo = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!activo) return;

      if (user) {
        const usuarioCompleto = await verificarDniUsuario(user);
        if (!activo) return;
        setUsuario(usuarioCompleto);
      } else {
        setUsuario(null);
      }

      setCargando(false);
    });

    return () => {
      activo = false;
      unsubscribe();
    };
  }, [verificarDniUsuario]);

  const value = useMemo(
    () => ({
      usuario,
      cargando,
      actualizarDni,
    }),
    [usuario, cargando, actualizarDni]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};