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

export const verificarVotoExistente = async (usuarioId: string, votacionId: string): Promise<boolean> => {
  try {
    const votoRef = doc(db, 'votos', `${usuarioId}_${votacionId}`);
    const snap = await getDoc(votoRef);
    return snap.exists();
  } catch (error) {
    console.error('❌ Error al verificar voto:', error);
    return false;
  }
};

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
  participantesIds: string[];
  puntuaciones?: Record<string, number>;
}

export const registrarVoto = async (params: RegistrarVotoParams): Promise<boolean> => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. LEER PRIMERO
      const votoRef = doc(db, 'votos', `${params.usuarioId}_${params.votacionId}`);
      const votoExistente = await transaction.get(votoRef);
      if (votoExistente.exists()) {
        throw new Error('VOTO_DUPLICADO');
      }

      const participantesLeidos: { ref: any, data: any, nota?: number }[] = [];

      if (params.puntuaciones) {
        for (const [participanteId, nota] of Object.entries(params.puntuaciones)) {
          const participanteRef = doc(db, 'participantes', participanteId);
          const participanteSnap = await transaction.get(participanteRef);
          if (participanteSnap.exists()) {
            participantesLeidos.push({ ref: participanteRef, data: participanteSnap.data(), nota });
          }
        }
      } else {
        for (const participanteId of params.participantesIds) {
          const participanteRef = doc(db, 'participantes', participanteId);
          const participanteSnap = await transaction.get(participanteRef);
          if (participanteSnap.exists()) {
            participantesLeidos.push({ ref: participanteRef, data: participanteSnap.data() });
          }
        }
      }

      // 2. ESCRIBIR DESPUÉS
      transaction.set(votoRef, {
        usuarioId: params.usuarioId,
        votacionId: params.votacionId,
        participantesIds: params.participantesIds,
        puntuaciones: params.puntuaciones || null,
        timestamp: serverTimestamp(),
      });

      for (const participante of participantesLeidos) {
        if (params.puntuaciones && participante.nota !== undefined) {
          const nuevaSuma = (participante.data.sumaPuntuacion || 0) + participante.nota;
          const nuevoTotal = (participante.data.totalPuntuaciones || 0) + 1;
          const nuevoPromedio = Math.round((nuevaSuma / nuevoTotal) * 10) / 10;

          transaction.update(participante.ref, {
            sumaPuntuacion: nuevaSuma,
            totalPuntuaciones: nuevoTotal,
            promedioEstrellas: nuevoPromedio,
          });
        } else {
          transaction.update(participante.ref, {
            votos: (participante.data.votos || 0) + 1,
          });
        }
      }
    });

    return true;
  } catch (error) {
    console.error('❌ Error al registrar voto:', error);
    return false;
  }
};