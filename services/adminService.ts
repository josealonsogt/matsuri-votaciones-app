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

// ==================== CONFIGURACIÓN GLOBAL DEL EVENTO ====================

export const obtenerEstadoEvento = async (): Promise<boolean> => {
  try {
    const configRef = doc(db, 'configuracion', 'evento');
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists()) {
      return configSnap.data().votacionesPausadas ?? false;
    } else {
      // Si es la primera vez y no existe, lo creamos abierto (false)
      await setDoc(configRef, { votacionesPausadas: false });
      return false;
    }
  } catch (error) {
    console.error('❌ Error al obtener estado del evento:', error);
    return false;
  }
};

export const togglePausaEvento = async (pausado: boolean): Promise<boolean> => {
  try {
    const configRef = doc(db, 'configuracion', 'evento');
    await updateDoc(configRef, { votacionesPausadas: pausado });
    console.log(`✅ Evento ${pausado ? 'PAUSADO' : 'ABIERTO'}`);
    return true;
  } catch (error) {
    console.error('❌ Error al pausar evento:', error);
    return false;
  }
};

// ==================== GESTIÓN DE USUARIOS Y ROLES ====================

export const obtenerTodosLosUsuarios = async () => {
  try {
    const usuariosRef = collection(db, 'usuarios');
    const q = query(usuariosRef, orderBy('fecha_registro', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
    return [];
  }
};

export const hacerAdmin = async (uid: string): Promise<boolean> => {
  try {
    const usuarioRef = doc(db, 'usuarios', uid);
    await updateDoc(usuarioRef, { rol: 'admin' });
    console.log(`✅ Usuario ${uid} ahora es ADMIN`);
    return true;
  } catch (error) {
    console.error('❌ Error al hacer admin:', error);
    return false;
  }
};

export const quitarAdmin = async (uid: string): Promise<boolean> => {
  try {
    const usuarioRef = doc(db, 'usuarios', uid);
    await updateDoc(usuarioRef, { rol: 'usuario' });
    console.log(`✅ Usuario ${uid} ahora es USUARIO normal`);
    return true;
  } catch (error) {
    console.error('❌ Error al quitar admin:', error);
    return false;
  }
};

// ==================== GESTIÓN DE SECCIONES ====================

interface CrearSeccionParams {
  nombre: string;
  icono?: string;
  descripcion?: string;
  orden?: number;
}

export const crearSeccion = async (params: CrearSeccionParams): Promise<boolean> => {
  try {
    const seccionesRef = collection(db, 'secciones');

    await addDoc(seccionesRef, {
      nombre: params.nombre,
      icono: params.icono || null,
      descripcion: params.descripcion || null,
      orden: params.orden || 0,
      activa: true,
      fechaCreacion: serverTimestamp(),
    });

    console.log('✅ Sección creada con éxito');
    return true;
  } catch (error) {
    console.error('❌ Error al crear sección:', error);
    return false;
  }
};

export const obtenerSecciones = async (): Promise<Seccion[]> => {
  try {
    const seccionesRef = collection(db, 'secciones');
    const q = query(seccionesRef, orderBy('orden', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        nombre: data.nombre,
        icono: data.icono || undefined,
        descripcion: data.descripcion || undefined,
        orden: data.orden || 0,
        activa: data.activa ?? true,
        fechaCreacion: data.fechaCreacion?.toDate() || new Date(),
      } as Seccion;
    });
  } catch (error) {
    console.error('❌ Error al obtener secciones:', error);
    return [];
  }
};

export const obtenerSeccionesActivas = async (): Promise<Seccion[]> => {
  try {
    const seccionesRef = collection(db, 'secciones');
    const q = query(seccionesRef, orderBy('orden', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          nombre: data.nombre,
          icono: data.icono || undefined,
          descripcion: data.descripcion || undefined,
          orden: data.orden || 0,
          activa: data.activa ?? true,
          fechaCreacion: data.fechaCreacion?.toDate() || new Date(),
        } as Seccion;
      })
      .filter((s) => s.activa);
  } catch (error) {
    console.error('❌ Error al obtener secciones activas:', error);
    return [];
  }
};

export const actualizarSeccion = async (
  seccionId: string,
  params: Partial<CrearSeccionParams>
): Promise<boolean> => {
  try {
    const seccionRef = doc(db, 'secciones', seccionId);
    await updateDoc(seccionRef, params as any);
    console.log(`✅ Sección ${seccionId} actualizada`);
    return true;
  } catch (error) {
    console.error('❌ Error al actualizar sección:', error);
    return false;
  }
};

export const eliminarSeccion = async (seccionId: string): Promise<boolean> => {
  try {
    const votacionesRef = collection(db, 'votaciones');
    const q = query(votacionesRef, where('seccionId', '==', seccionId));
    const snapshot = await getDocs(q);

    for (const votacionDoc of snapshot.docs) {
      await eliminarVotacion(votacionDoc.id);
    }

    const seccionRef = doc(db, 'secciones', seccionId);
    await deleteDoc(seccionRef);

    console.log(`✅ Sección ${seccionId} y sus votaciones eliminadas`);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar sección:', error);
    return false;
  }
};

// ==================== GESTIÓN DE VOTACIONES ====================

interface CrearVotacionParams {
  seccionId: string;
  titulo: string;
  descripcion?: string;
  metodoVotacion: MetodoVotacion;
  maxOpciones?: number;
}

export const crearVotacion = async (params: CrearVotacionParams): Promise<boolean> => {
  try {
    const votacionesRef = collection(db, 'votaciones');

    await addDoc(votacionesRef, {
      seccionId: params.seccionId,
      titulo: params.titulo,
      descripcion: params.descripcion || null,
      metodoVotacion: params.metodoVotacion,
      maxOpciones: params.maxOpciones || null,
      estado: 'abierta',
      visible: true, // 👈 AÑADIMOS ESTO
      fechaCreacion: serverTimestamp(),
      fechaCierre: null,
    });

    console.log('✅ Votación creada con éxito');
    return true;
  } catch (error) {
    console.error('❌ Error al crear votación:', error);
    return false;
  }
};

export const actualizarVisibilidadVotacion = async (votacionId: string, visible: boolean): Promise<boolean> => {
  try {
    const votacionRef = doc(db, 'votaciones', votacionId);
    await updateDoc(votacionRef, { visible });
    return true;
  } catch (error) {
    console.error('❌ Error al actualizar visibilidad:', error);
    return false;
  }
};

export const obtenerVotacionesPorSeccion = async (seccionId: string): Promise<Votacion[]> => {
  try {
    const votacionesRef = collection(db, 'votaciones');
    const q = query(votacionesRef, where('seccionId', '==', seccionId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        seccionId: data.seccionId,
        titulo: data.titulo,
        descripcion: data.descripcion || undefined,
        metodoVotacion: data.metodoVotacion,
        maxOpciones: data.maxOpciones || undefined,
        estado: data.estado,
        visible: data.visible ?? true, // 👈 AÑADIMOS ESTA LÍNEA
        fechaCreacion: data.fechaCreacion?.toDate() || new Date(),
        fechaCierre: data.fechaCierre?.toDate() || undefined,
      } as Votacion;
    });
  } catch (error) {
    console.error('❌ Error al obtener votaciones:', error);
    return [];
  }
};

export const obtenerTodasLasVotaciones = async (): Promise<Votacion[]> => {
  try {
    const votacionesRef = collection(db, 'votaciones');
    const q = query(votacionesRef, orderBy('fechaCreacion', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        seccionId: data.seccionId,
        titulo: data.titulo,
        descripcion: data.descripcion || undefined,
        metodoVotacion: data.metodoVotacion,
        maxOpciones: data.maxOpciones || undefined,
        estado: data.estado,
        visible: data.visible ?? true, // 👈 Y AÑADIMOS ESTA LÍNEA AQUÍ TAMBIÉN
        fechaCreacion: data.fechaCreacion?.toDate() || new Date(),
        fechaCierre: data.fechaCierre?.toDate() || undefined,
      } as Votacion;
    });
  } catch (error) {
    console.error('❌ Error al obtener todas las votaciones:', error);
    return [];
  }
};

export const actualizarEstadoVotacion = async (
  votacionId: string,
  estado: 'abierta' | 'cerrada'
): Promise<boolean> => {
  try {
    const votacionRef = doc(db, 'votaciones', votacionId);
    await updateDoc(votacionRef, {
      estado,
      fechaCierre: estado === 'cerrada' ? serverTimestamp() : null,
    });
    console.log(`✅ Votación ${votacionId} ahora está ${estado}`);
    return true;
  } catch (error) {
    console.error('❌ Error al actualizar estado de votación:', error);
    return false;
  }
};

export const eliminarVotacion = async (votacionId: string): Promise<boolean> => {
  try {
    const participantesRef = collection(db, 'participantes');
    const q = query(participantesRef, where('votacionId', '==', votacionId));
    const snapshot = await getDocs(q);

    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    const votacionRef = doc(db, 'votaciones', votacionId);
    await deleteDoc(votacionRef);

    console.log(`✅ Votación ${votacionId} y sus participantes eliminados`);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar votación:', error);
    return false;
  }
};

// ==================== GESTIÓN DE PARTICIPANTES ====================

interface AgregarParticipanteParams {
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
}

export const agregarParticipante = async (
  votacionId: string,
  params: AgregarParticipanteParams
): Promise<boolean> => {
  try {
    const participantesRef = collection(db, 'participantes');

    await addDoc(participantesRef, {
      votacionId,
      nombre: params.nombre,
      descripcion: params.descripcion || null,
      imagenUrl: params.imagenUrl || null,
      votos: 0,
      sumaPuntuacion: 0,
      totalPuntuaciones: 0,
      promedioEstrellas: 0,
      fechaCreacion: serverTimestamp(),
    });

    console.log('✅ Participante agregado con éxito');
    return true;
  } catch (error) {
    console.error('❌ Error al agregar participante:', error);
    return false;
  }
};

export const obtenerParticipantes = async (votacionId: string): Promise<Participante[]> => {
  try {
    const participantesRef = collection(db, 'participantes');
    const q = query(participantesRef, where('votacionId', '==', votacionId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        votacionId: data.votacionId,
        nombre: data.nombre,
        descripcion: data.descripcion || undefined,
        imagenUrl: data.imagenUrl || undefined,
        votos: data.votos || 0,
        sumaPuntuacion: data.sumaPuntuacion || undefined,
        totalPuntuaciones: data.totalPuntuaciones || undefined,
        promedioEstrellas: data.promedioEstrellas || undefined,
      } as Participante;
    });
  } catch (error) {
    console.error('❌ Error al obtener participantes:', error);
    return [];
  }
};

export const eliminarParticipante = async (participanteId: string): Promise<boolean> => {
  try {
    const participanteRef = doc(db, 'participantes', participanteId);
    await deleteDoc(participanteRef);
    console.log(`✅ Participante ${participanteId} eliminado`);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar participante:', error);
    return false;
  }
};

// Añade esto al final de services/adminService.ts

export const actualizarVotacion = async (votacionId: string, params: Partial<CrearVotacionParams>): Promise<boolean> => {
  try {
    const votacionRef = doc(db, 'votaciones', votacionId);
    await updateDoc(votacionRef, params as any);
    return true;
  } catch (error) {
    console.error('❌ Error al actualizar votación:', error);
    return false;
  }
};

export const actualizarParticipante = async (participanteId: string, params: Partial<AgregarParticipanteParams>): Promise<boolean> => {
  try {
    const participanteRef = doc(db, 'participantes', participanteId);
    await updateDoc(participanteRef, params as any);
    return true;
  } catch (error) {
    console.error('❌ Error al actualizar participante:', error);
    return false;
  }
};