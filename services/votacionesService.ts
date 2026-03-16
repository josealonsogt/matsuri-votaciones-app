import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    runTransaction,
    serverTimestamp,
    where,
} from 'firebase/firestore';
import type { Participante, Votacion } from '../types';
import { db } from './firebaseConfig';

/**
 * Verifica si un usuario ya emitió su voto en una votación concreta.
 * Usa ID determinista (usuarioId_votacionId) para evitar consultas compuestas
 * que requerirían un índice compuesto en Firestore.
 */
export const verificarVotoExistente = async (
  usuarioId: string,
  votacionId: string
): Promise<boolean> => {
  try {
    const votoRef = doc(db, 'votos', `${usuarioId}_${votacionId}`);
    const snap = await getDoc(votoRef);
    return snap.exists();
  } catch (error) {
    console.error('❌ Error al verificar voto:', error);
    return false;
  }
};

/**
 * Obtiene los participantes de una votación con sus contadores actualizados.
 */
export const obtenerParticipantesVotacion = async (votacionId: string): Promise<Participante[]> => {
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
        sumaPuntuacion: data.sumaPuntuacion || 0,
        totalPuntuaciones: data.totalPuntuaciones || 0,
        promedioEstrellas: data.promedioEstrellas || 0,
      } as Participante;
    });
  } catch (error) {
    console.error('❌ Error al obtener participantes:', error);
    return [];
  }
};

/**
 * Obtiene los datos de una votación por su ID.
 */
export const obtenerVotacion = async (votacionId: string): Promise<Votacion | null> => {
  try {
    const votacionRef = doc(db, 'votaciones', votacionId);
    const snap = await getDoc(votacionRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      id: snap.id,
      seccionId: data.seccionId,
      titulo: data.titulo,
      descripcion: data.descripcion || undefined,
      metodoVotacion: data.metodoVotacion,
      maxOpciones: data.maxOpciones || undefined,
      estado: data.estado,
      fechaCreacion: data.fechaCreacion?.toDate() || new Date(),
      fechaCierre: data.fechaCierre?.toDate() || undefined,
    } as Votacion;
  } catch (error) {
    console.error('❌ Error al obtener votación:', error);
    return null;
  }
};

interface RegistrarVotoParams {
  usuarioId: string;
  votacionId: string;
  participantesIds: string[];          // unica → 1 id, multiple → N ids
  puntuaciones?: Record<string, number>; // puntuacion → { participanteId: nota }
}

/**
 * Registra el voto de un usuario usando una transacción atómica.
 *
 * La transacción garantiza:
 * 1. Que el usuario no haya votado ya (doble voto imposible).
 * 2. Que los contadores de participantes se actualicen de forma consistente.
 * 3. Que todo ocurra o nada ocurra (atomicidad).
 */
export const registrarVoto = async (params: RegistrarVotoParams): Promise<boolean> => {
  try {
    await runTransaction(db, async (transaction) => {
      // --- 1. Verificar que el usuario no haya votado ya ---
      // ID determinista elimina la necesidad de índice compuesto en Firestore
      const votoRef = doc(db, 'votos', `${params.usuarioId}_${params.votacionId}`);
      const votoExistente = await transaction.get(votoRef);
      if (votoExistente.exists()) {
        throw new Error('VOTO_DUPLICADO');
      }

      // --- 2. Guardar el documento del voto con el mismo ID determinista ---
      transaction.set(votoRef, {
        usuarioId: params.usuarioId,
        votacionId: params.votacionId,
        participantesIds: params.participantesIds,
        puntuaciones: params.puntuaciones || null,
        timestamp: serverTimestamp(),
      });

      // --- 3. Actualizar contadores según el método de votación ---
      if (params.puntuaciones) {
        // Método puntuacion: recalcular promedio de cada participante puntuado
        for (const [participanteId, nota] of Object.entries(params.puntuaciones)) {
          const participanteRef = doc(db, 'participantes', participanteId);
          const participanteSnap = await transaction.get(participanteRef);
          if (!participanteSnap.exists()) continue;

          const datos = participanteSnap.data();
          const nuevaSuma = (datos.sumaPuntuacion || 0) + nota;
          const nuevoTotal = (datos.totalPuntuaciones || 0) + 1;
          const nuevoPromedio = Math.round((nuevaSuma / nuevoTotal) * 10) / 10;

          transaction.update(participanteRef, {
            sumaPuntuacion: nuevaSuma,
            totalPuntuaciones: nuevoTotal,
            promedioEstrellas: nuevoPromedio,
          });
        }
      } else {
        // Método unica o multiple: incrementar contador de votos
        for (const participanteId of params.participantesIds) {
          const participanteRef = doc(db, 'participantes', participanteId);
          const participanteSnap = await transaction.get(participanteRef);
          if (!participanteSnap.exists()) continue;

          transaction.update(participanteRef, {
            votos: (participanteSnap.data().votos || 0) + 1,
          });
        }
      }
    });

    console.log('✅ Voto registrado correctamente');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message === 'VOTO_DUPLICADO') {
      console.warn('⚠️ El usuario ya votó en esta votación');
      return false;
    }
    console.error('❌ Error al registrar voto:', error);
    return false;
  }
};
