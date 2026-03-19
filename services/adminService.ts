// ============================================================================
// 🛠️ SERVICIO DE ADMINISTRACIÓN — services/adminService.ts
//
// Todas las operaciones que SOLO el admin puede realizar:
//   1. Control global del evento (pausar/reanudar todas las votaciones)
//   2. Gestión de usuarios
//   3. CRUD de Secciones
//   4. CRUD de Votaciones (incluyendo visibilidad y estado)
//   5. CRUD de Participantes
//
// PATRÓN: Cada función devuelve un booleano de éxito o el dato solicitado.
// Nunca lanza errores hacia arriba; los captura y los registra en consola.
// ============================================================================

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { MetodoVotacion, Participante, Seccion, Votacion } from '../types';
import { db } from './firebaseConfig';

// ─── 1. Control Global del Evento ────────────────────────────────────────────

/**
 * Lee el "interruptor maestro" del evento.
 * Si está en true, nadie puede votar en ninguna categoría.
 * Crea el documento con valor false si no existía todavía.
 */
export const obtenerEstadoEvento = async (): Promise<boolean> => {
  try {
    const configRef = doc(db, 'configuracion', 'evento');
    const snap = await getDoc(configRef);

    if (snap.exists()) {
      return snap.data().votacionesPausadas ?? false;
    }

    // Primera vez que se accede: creamos el documento con evento abierto por defecto
    await setDoc(configRef, { votacionesPausadas: false });
    return false;
  } catch (error) {
    console.error('❌ Error al obtener estado del evento:', error);
    return false;
  }
};

/**
 * Cambia el "interruptor maestro" del evento.
 * pausado=true  → nadie puede votar
 * pausado=false → votaciones abiertas con normalidad
 */
export const togglePausaEvento = async (pausado: boolean): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'configuracion', 'evento'), { votacionesPausadas: pausado });
    return true;
  } catch (error) {
    console.error('❌ Error al cambiar estado del evento:', error);
    return false;
  }
};

// ─── 2. Gestión de Usuarios ───────────────────────────────────────────────────

/** Devuelve todos los usuarios ordenados por fecha de registro más reciente. */
export const obtenerTodosLosUsuarios = async (): Promise<Record<string, unknown>[]> => {
  try {
    const q = query(collection(db, 'usuarios'), orderBy('fecha_registro', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
    return [];
  }
};

export const hacerAdmin = async (uid: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'usuarios', uid), { rol: 'admin' });
    return true;
  } catch {
    return false;
  }
};

export const quitarAdmin = async (uid: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'usuarios', uid), { rol: 'usuario' });
    return true;
  } catch {
    return false;
  }
};

// ─── 3. Gestión de Secciones ──────────────────────────────────────────────────

interface CrearSeccionParams {
  nombre: string;
  icono?: string;
  descripcion?: string;
  orden?: number;
}

export const crearSeccion = async (params: CrearSeccionParams): Promise<boolean> => {
  try {
    await addDoc(collection(db, 'secciones'), {
      ...params,
      activa: true,
      fechaCreacion: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('❌ Error al crear sección:', error);
    return false;
  }
};

export const actualizarSeccion = async (
  seccionId: string,
  params: Partial<CrearSeccionParams>
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'secciones', seccionId), params);
    return true;
  } catch {
    return false;
  }
};

/**
 * Elimina una sección y todas sus votaciones e hijos en cascada.
 * El orden importa: primero los hijos, luego el padre, para no dejar
 * documentos huérfanos que ocupen espacio en Firestore.
 */
export const eliminarSeccion = async (seccionId: string): Promise<boolean> => {
  try {
    // Borramos las votaciones hijas primero (y sus participantes, en cascada)
    const q = query(collection(db, 'votaciones'), where('seccionId', '==', seccionId));
    const snap = await getDocs(q);
    for (const votacionDoc of snap.docs) {
      await eliminarVotacion(votacionDoc.id);
    }
    // Ahora sí borramos la sección
    await deleteDoc(doc(db, 'secciones', seccionId));
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar sección:', error);
    return false;
  }
};

/** Todas las secciones ordenadas por el campo "orden" (para controlar la posición en pantalla). */
export const obtenerSecciones = async (): Promise<Seccion[]> => {
  try {
    const q = query(collection(db, 'secciones'), orderBy('orden', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      fechaCreacion: d.data().fechaCreacion?.toDate() || new Date(),
    })) as Seccion[];
  } catch {
    return [];
  }
};

/** Solo las secciones visibles al público (activa === true). */
export const obtenerSeccionesActivas = async (): Promise<Seccion[]> => {
  const todas = await obtenerSecciones();
  return todas.filter((s) => s.activa);
};

// ─── 4. Gestión de Votaciones ─────────────────────────────────────────────────

interface CrearVotacionParams {
  seccionId: string;
  titulo: string;
  descripcion?: string | null;
  metodoVotacion: MetodoVotacion;
  maxOpciones?: number | null;
}

export const crearVotacion = async (params: CrearVotacionParams): Promise<boolean> => {
  try {
    await addDoc(collection(db, 'votaciones'), {
      ...params,
      estado: 'abierta',
      visible: true,
      fechaCreacion: serverTimestamp(),
      fechaCierre: null,
    });
    return true;
  } catch (error) {
    console.error('❌ Error al crear votación:', error);
    return false;
  }
};

export const actualizarVotacion = async (
  votacionId: string,
  params: Partial<CrearVotacionParams>
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'votaciones', votacionId), params);
    return true;
  } catch {
    return false;
  }
};

export const actualizarEstadoVotacion = async (
  votacionId: string,
  estado: 'abierta' | 'cerrada'
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'votaciones', votacionId), {
      estado,
      fechaCierre: estado === 'cerrada' ? serverTimestamp() : null,
    });
    return true;
  } catch {
    return false;
  }
};

/** Modo Ninja: ocultar o mostrar una votación al público sin cambiar su estado. */
export const actualizarVisibilidadVotacion = async (
  votacionId: string,
  visible: boolean
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'votaciones', votacionId), { visible });
    return true;
  } catch {
    return false;
  }
};

/**
 * Elimina una votación y todos sus participantes.
 * Usamos Promise.all para borrar los participantes en paralelo (más rápido).
 */
export const eliminarVotacion = async (votacionId: string): Promise<boolean> => {
  try {
    const q = query(collection(db, 'participantes'), where('votacionId', '==', votacionId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'votaciones', votacionId));
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar votación:', error);
    return false;
  }
};

/** Mapea un documento de Firestore a nuestro tipo Votacion, convirtiendo Timestamps. */
const mapearVotacion = (d: { id: string; data: () => Record<string, unknown> }): Votacion => ({
  id: d.id,
  ...(d.data() as Omit<Votacion, 'id' | 'fechaCreacion' | 'fechaCierre'>),
  visible: (d.data().visible as boolean) ?? true,
  fechaCreacion: (d.data().fechaCreacion as { toDate: () => Date })?.toDate?.() || new Date(),
  fechaCierre: (d.data().fechaCierre as { toDate: () => Date })?.toDate?.() || undefined,
});

export const obtenerVotacionesPorSeccion = async (seccionId: string): Promise<Votacion[]> => {
  try {
    const q = query(collection(db, 'votaciones'), where('seccionId', '==', seccionId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapearVotacion({ id: d.id, data: d.data.bind(d) }));
  } catch {
    return [];
  }
};

export const obtenerTodasLasVotaciones = async (): Promise<Votacion[]> => {
  try {
    const q = query(collection(db, 'votaciones'), orderBy('fechaCreacion', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapearVotacion({ id: d.id, data: d.data.bind(d) }));
  } catch {
    return [];
  }
};

// ─── 5. Gestión de Participantes ──────────────────────────────────────────────

interface AgregarParticipanteParams {
  nombre: string;
  descripcion?: string;
}

export const agregarParticipante = async (
  votacionId: string,
  params: AgregarParticipanteParams
): Promise<boolean> => {
  try {
    await addDoc(collection(db, 'participantes'), {
      votacionId,
      nombre: params.nombre,
      descripcion: params.descripcion || null,
      votos: 0,
      sumaPuntuacion: 0,
      totalPuntuaciones: 0,
      promedioEstrellas: 0,
      fechaCreacion: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('❌ Error al agregar participante:', error);
    return false;
  }
};

export const actualizarParticipante = async (
  participanteId: string,
  params: Partial<AgregarParticipanteParams>
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'participantes', participanteId), params);
    return true;
  } catch {
    return false;
  }
};

export const eliminarParticipante = async (participanteId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'participantes', participanteId));
    return true;
  } catch {
    return false;
  }
};

export const obtenerParticipantes = async (votacionId: string): Promise<Participante[]> => {
  try {
    const q = query(collection(db, 'participantes'), where('votacionId', '==', votacionId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Participante[];
  } catch {
    return [];
  }
};