// ============================================================================
// ⚖️ SERVICIO DE VOTACIONES — services/votacionesService.ts
//
// Operaciones que realizan los USUARIOS (no el admin):
//   - Leer datos de una votación y sus participantes
//   - Verificar si ya votaron
//   - Registrar un voto de forma atómica y segura
//
// SEGURIDAD CLAVE: registrarVoto usa una Transacción de Firestore.
// Esto garantiza que un voto sea completamente registrado o completamente
// descartado; nunca queda a medias aunque se corte el internet.
// ============================================================================

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

// ─── Lecturas ─────────────────────────────────────────────────────────────────

/**
 * Comprueba si este usuario ya emitió su voto en esta votación.
 * Usamos un ID determinista "usuarioId_votacionId" para que sea imposible
 * insertar dos documentos con el mismo voto (la colisión de ID lo impide).
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

export const obtenerVotacion = async (votacionId: string): Promise<Votacion | null> => {
  try {
    const snap = await getDoc(doc(db, 'votaciones', votacionId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      ...data,
      visible: data.visible ?? true,
      fechaCreacion: data.fechaCreacion?.toDate() || new Date(),
      fechaCierre: data.fechaCierre?.toDate() || undefined,
    } as Votacion;
  } catch (error) {
    console.error('❌ Error al obtener votación:', error);
    return null;
  }
};

export const obtenerParticipantesVotacion = async (votacionId: string): Promise<Participante[]> => {
  try {
    const q = query(collection(db, 'participantes'), where('votacionId', '==', votacionId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Participante[];
  } catch (error) {
    console.error('❌ Error al obtener participantes:', error);
    return [];
  }
};

// ─── Registrar Voto ───────────────────────────────────────────────────────────

interface RegistrarVotoParams {
  usuarioId: string;
  votacionId: string;
  participantesIds: string[];
  puntuaciones?: Record<string, number>;
  respuestaTexto?: string;
}

/**
 * El núcleo de la seguridad del sistema de votación.
 *
 * La lógica DENTRO de runTransaction sigue el orden obligatorio de Firebase:
 *   PASO 1 — Todas las lecturas primero (verificar duplicado + leer participantes)
 *   PASO 2 — Todas las escrituras después (guardar voto + actualizar contadores)
 *
 * Si alguna lectura detecta un problema (p.ej. voto duplicado), lanzamos un
 * error que aborta la transacción entera sin escribir nada.
 */
export const registrarVoto = async (params: RegistrarVotoParams): Promise<boolean> => {
  try {
    await runTransaction(db, async (transaction) => {
      // ── PASO 1: LEER TODO ────────────────────────────────────────────────

      // Comprobar que el usuario no ha votado ya en esta votación
      const votoRef = doc(db, 'votos', `${params.usuarioId}_${params.votacionId}`);
      const votoExistente = await transaction.get(votoRef);
      if (votoExistente.exists()) {
        throw new Error('VOTO_DUPLICADO');
      }

      // Leer los documentos de todos los participantes afectados
      type ParticipanteLeido = { ref: ReturnType<typeof doc>; data: Record<string, number>; nota?: number };
      const participantesLeidos: ParticipanteLeido[] = [];

      if (params.puntuaciones) {
        // Método puntuación: solo actualizamos los que recibieron nota
        for (const [id, nota] of Object.entries(params.puntuaciones)) {
          const ref = doc(db, 'participantes', id);
          const snap = await transaction.get(ref);
          if (snap.exists()) {
            participantesLeidos.push({ ref, data: snap.data() as Record<string, number>, nota });
          }
        }
      } else if (params.participantesIds && params.participantesIds.length > 0) {
        // Método único o múltiple: actualizamos todos los seleccionados
        for (const id of params.participantesIds) {
          const ref = doc(db, 'participantes', id);
          const snap = await transaction.get(ref);
          if (snap.exists()) {
            participantesLeidos.push({ ref, data: snap.data() as Record<string, number> });
          }
        }
      }

      // ── PASO 2: ESCRIBIR TODO ─────────────────────────────────────────────

      // Guardamos el recibo del voto (prueba de que este usuario ya votó)
      transaction.set(votoRef, {
        usuarioId: params.usuarioId,
        votacionId: params.votacionId,
        participantesIds: params.participantesIds,
        puntuaciones: params.puntuaciones || null,
        respuestaTexto: params.respuestaTexto || null,
        timestamp: serverTimestamp(),
      });

      // Actualizamos los contadores de cada participante
      for (const p of participantesLeidos) {
        if (params.puntuaciones && p.nota !== undefined) {
          // Puntuación: recalculamos la media de forma incremental
          const nuevaSuma = (p.data.sumaPuntuacion || 0) + p.nota;
          const nuevoTotal = (p.data.totalPuntuaciones || 0) + 1;
          const nuevoPromedio = Math.round((nuevaSuma / nuevoTotal) * 10) / 10;
          transaction.update(p.ref, {
            sumaPuntuacion: nuevaSuma,
            totalPuntuaciones: nuevoTotal,
            promedioEstrellas: nuevoPromedio,
          });
        } else {
          // Único/Múltiple: sumamos un voto simple
          transaction.update(p.ref, {
            votos: (p.data.votos || 0) + 1,
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