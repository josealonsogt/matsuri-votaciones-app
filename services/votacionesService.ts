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
      // ==========================================
      // FASE 1: TODAS LAS LECTURAS (READS) PRIMERO
      // ==========================================

      // 1.1 Leer si el voto ya existe
      const votoRef = doc(db, 'votos', `${params.usuarioId}_${params.votacionId}`);
      const votoExistente = await transaction.get(votoRef);
      if (votoExistente.exists()) {
        throw new Error('VOTO_DUPLICADO');
      }

      // 1.2 Leer todos los participantes que van a ser actualizados
      // Guardamos sus referencias y sus datos actuales en la memoria temporal
      const participantesLeidos: { ref: any, data: any, nota?: number }[] = [];

      if (params.puntuaciones) {
        // Método puntuacion
        for (const [participanteId, nota] of Object.entries(params.puntuaciones)) {
          const participanteRef = doc(db, 'participantes', participanteId);
          const participanteSnap = await transaction.get(participanteRef);
          if (participanteSnap.exists()) {
            participantesLeidos.push({ ref: participanteRef, data: participanteSnap.data(), nota });
          }
        }
      } else {
        // Método unica o multiple
        for (const participanteId of params.participantesIds) {
          const participanteRef = doc(db, 'participantes', participanteId);
          const participanteSnap = await transaction.get(participanteRef);
          if (participanteSnap.exists()) {
            participantesLeidos.push({ ref: participanteRef, data: participanteSnap.data() });
          }
        }
      }

      // ==========================================
      // FASE 2: TODAS LAS ESCRITURAS (WRITES) AL FINAL
      // ==========================================

      // 2.1 Guardar el documento del voto
      transaction.set(votoRef, {
        usuarioId: params.usuarioId,
        votacionId: params.votacionId,
        participantesIds: params.participantesIds,
        puntuaciones: params.puntuaciones || null,
        timestamp: serverTimestamp(),
      });

      // 2.2 Actualizar los contadores de los participantes usando los datos ya leídos
      for (const participante of participantesLeidos) {
        if (params.puntuaciones && participante.nota !== undefined) {
          // Actualización para "puntuacion"
          const nuevaSuma = (participante.data.sumaPuntuacion || 0) + participante.nota;
          const nuevoTotal = (participante.data.totalPuntuaciones || 0) + 1;
          const nuevoPromedio = Math.round((nuevaSuma / nuevoTotal) * 10) / 10;

          transaction.update(participante.ref, {
            sumaPuntuacion: nuevaSuma,
            totalPuntuaciones: nuevoTotal,
            promedioEstrellas: nuevoPromedio,
          });
        } else {
          // Actualización para "unica" o "multiple"
          transaction.update(participante.ref, {
            votos: (participante.data.votos || 0) + 1,
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