// ============================================================================
// 🗳️ PANTALLA DE VOTACIÓN — app/votar/[votacionId].tsx
//
// Flujo:
//   1. Carga la votación y sus participantes
//   2. Muestra la interfaz de voto (único, múltiple o puntuación)
//   3. Al confirmar, registra el voto y TRANSICIONA DIRECTAMENTE a resultados
//      (sin pantalla de éxito intermedia, como pide el requisito UX)
//
// Los resultados se actualizan en TIEMPO REAL gracias a onSnapshot de Firestore.
// ============================================================================

import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { obtenerEstadoEvento } from '../../services/adminService';
import { db } from '../../services/firebaseConfig';
import {
  obtenerVotacion,
  registrarVoto,
  verificarVotoExistente,
} from '../../services/votacionesService';
import type { Participante, Votacion } from '../../types';

// 💡 CORRECCIÓN 1: Ruta relativa (2 niveles arriba)

// ─── Componentes de tarjeta ───────────────────────────────────────────────────

interface PropsTarjetaUnica {
  participante: Participante;
  seleccionado: boolean;
  onPress: () => void;
}
function TarjetaUnica({ participante, seleccionado, onPress }: PropsTarjetaUnica) {
  return (
    <TouchableOpacity
      style={[styles.tarjeta, seleccionado && styles.tarjetaSeleccionada]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.infoParticipante}>
        <Text style={[styles.nombreParticipante, seleccionado && styles.nombreSeleccionado]}>
          {participante.nombre}
        </Text>
        {participante.descripcion && (
          <Text style={styles.descripcionParticipante}>{participante.descripcion}</Text>
        )}
      </View>
      <View style={[styles.radio, seleccionado && styles.radioSeleccionado]}>
        {seleccionado && <View style={styles.radioPunto} />}
      </View>
    </TouchableOpacity>
  );
}

interface PropsTarjetaMultiple {
  participante: Participante;
  seleccionado: boolean;
  deshabilitado: boolean;
  onPress: () => void;
}
function TarjetaMultiple({ participante, seleccionado, deshabilitado, onPress }: PropsTarjetaMultiple) {
  return (
    <TouchableOpacity
      style={[styles.tarjeta, seleccionado && styles.tarjetaSeleccionada, deshabilitado && styles.tarjetaDeshabilitada]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={deshabilitado}
    >
      <View style={styles.infoParticipante}>
        <Text style={[styles.nombreParticipante, seleccionado && styles.nombreSeleccionado]}>
          {participante.nombre}
        </Text>
        {participante.descripcion && (
          <Text style={styles.descripcionParticipante}>{participante.descripcion}</Text>
        )}
      </View>
      <View style={[styles.checkbox, seleccionado && styles.checkboxSeleccionado]}>
        {seleccionado && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

interface PropsTarjetaPuntuacion {
  participante: Participante;
  puntuacion: number;
  onCambio: (nota: number) => void;
}
function TarjetaPuntuacion({ participante, puntuacion, onCambio }: PropsTarjetaPuntuacion) {
  return (
    <View style={[styles.tarjeta, puntuacion > 0 && styles.tarjetaSeleccionada]}>
      <View style={styles.infoParticipante}>
        <Text style={[styles.nombreParticipante, puntuacion > 0 && styles.nombreSeleccionado]}>
          {participante.nombre}
        </Text>
        {participante.descripcion && (
          <Text style={styles.descripcionParticipante}>{participante.descripcion}</Text>
        )}
        <View style={styles.notasContainer}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((nota) => (
            <TouchableOpacity
              key={nota}
              style={[styles.btnNota, puntuacion === nota && styles.btnNotaActivo]}
              onPress={() => onCambio(nota)}
            >
              <Text style={[styles.btnNotaTexto, puntuacion === nota && styles.btnNotaTextoActivo]}>
                {nota}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {puntuacion > 0 && (
          <Text style={styles.notaElegida}>Tu puntuación: {puntuacion}/10</Text>
        )}
      </View>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function VotarScreen() {
  const router = useRouter();
  const { votacionId } = useLocalSearchParams();
  const { usuario, cargando: cargandoAuth } = useAuth();

  const [votacion, setVotacion] = useState<Votacion | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [yaVoto, setYaVoto] = useState(false);
  const [eventoPausado, setEventoPausado] = useState(false);

  // Estados de selección según método de votación
  const [seleccionUnica, setSeleccionUnica] = useState<string | null>(null);
  const [seleccionMultiple, setSeleccionMultiple] = useState<Set<string>>(new Set());
  const [puntuaciones, setPuntuaciones] = useState<Record<string, number>>({});

  useEffect(() => {
    if (cargandoAuth) return;
    if (!usuario) {
      router.replace('/');
      return;
    }
    if (!votacionId) return;
    let unsubscribe: () => void;

    const inicializar = async () => {
      setCargando(true);
      const [votacionData, votoExiste, pausado] = await Promise.all([
        obtenerVotacion(votacionId as string),
        verificarVotoExistente(usuario.uid, votacionId as string),
        obtenerEstadoEvento(),
      ]);
      setVotacion(votacionData);
      setYaVoto(votoExiste);
      setEventoPausado(pausado);
      setCargando(false);

      // Suscripción en tiempo real a los participantes para ver los resultados actualizarse
      const q = query(collection(db, 'participantes'), where('votacionId', '==', votacionId));
      unsubscribe = onSnapshot(q, (snap) => {
        const lista: Participante[] = snap.docs.map((d) => ({
          id: d.id,
          votacionId: d.data().votacionId,
          nombre: d.data().nombre,
          descripcion: d.data().descripcion || undefined,
          votos: d.data().votos || 0,
          sumaPuntuacion: d.data().sumaPuntuacion || 0,
          totalPuntuaciones: d.data().totalPuntuaciones || 0,
          promedioEstrellas: d.data().promedioEstrellas || 0,
        }));
        setParticipantes(lista);
      });
    };

    inicializar();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [votacionId, usuario?.uid, cargandoAuth, router, usuario]);

  // ─── Lógica de selección ──────────────────────────────────────────────────────

  const toggleMultiple = (id: string) => {
    const nueva = new Set(seleccionMultiple);
    if (nueva.has(id)) {
      nueva.delete(id);
    } else {
      const max = votacion?.maxOpciones ?? 3;
      if (nueva.size >= max) {
        const msg = `Solo puedes elegir hasta ${max} opciones.`;
        if (Platform.OS === 'web') alert(msg); else Alert.alert('Límite alcanzado', msg);
        return;
      }
      nueva.add(id);
    }
    setSeleccionMultiple(nueva);
  };

  const puedeVotar = (): boolean => {
    if (!votacion || eventoPausado) return false;
    if (votacion.metodoVotacion === 'unica') return seleccionUnica !== null;
    if (votacion.metodoVotacion === 'multiple') return seleccionMultiple.size > 0;
    if (votacion.metodoVotacion === 'puntuacion') return Object.keys(puntuaciones).length > 0;
    return false;
  };

  // ─── Enviar voto ──────────────────────────────────────────────────────────────

  const handleVotar = async () => {
    if (!puedeVotar() || !usuario || !votacion) return;
    setEnviando(true);

    let participantesIds: string[] = [];
    let puntuacionesEnviar: Record<string, number> | undefined;

    if (votacion.metodoVotacion === 'unica') {
      participantesIds = [seleccionUnica!];
    } else if (votacion.metodoVotacion === 'multiple') {
      participantesIds = Array.from(seleccionMultiple);
    } else {
      participantesIds = Object.keys(puntuaciones);
      puntuacionesEnviar = puntuaciones;
    }

    const exito = await registrarVoto({
      usuarioId: usuario.uid,
      votacionId: votacion.id,
      participantesIds,
      puntuaciones: puntuacionesEnviar,
    });

    if (exito) {
      setYaVoto(true);
    } else {
      const msg = 'No se pudo registrar el voto. Es posible que ya hayas votado anteriormente.';
      if (Platform.OS === 'web') alert(msg); else Alert.alert('Error', msg);
    }
    setEnviando(false);
  };

  const handleVolver = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/dashboard' as any);
    }
  };

  // ─── Renders de estado ────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!votacion) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.textoError}>Esta votación no existe.</Text>
        <TouchableOpacity style={styles.btnVolver} onPress={handleVolver}>
          <Text style={styles.btnVolverTexto}>← Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Vista de Resultados ──────────────────────────────────────────────────────

  if (yaVoto || votacion.estado === 'cerrada' || eventoPausado) {
    const ranking = [...participantes];
    let totalVotos = 0;

    if (votacion.metodoVotacion === 'puntuacion') {
      ranking.sort((a, b) => (b.promedioEstrellas || 0) - (a.promedioEstrellas || 0));
      totalVotos = 10;
    } else {
      totalVotos = ranking.reduce((sum, p) => sum + p.votos, 0);
      ranking.sort((a, b) => b.votos - a.votos);
    }

    const etiquetaEstado = eventoPausado ? 'PAUSADA' : votacion.estado === 'cerrada' ? 'FINALIZADA' : 'YA VOTASTE';

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.btnVolver} onPress={handleVolver}>
            <Text style={styles.btnVolverTexto}>← Atrás</Text>
          </TouchableOpacity>
          <View style={[styles.badge, styles.badgeGris]}>
            <Text style={styles.badgeTexto}>{etiquetaEstado}</Text>
          </View>
        </View>

        {eventoPausado && !yaVoto && (
          <View style={styles.bannerPausado}>
            <Text style={styles.textoBannerPausado}>🛑 Las votaciones están temporalmente pausadas.</Text>
          </View>
        )}

        <ScrollView style={styles.cuerpo} contentContainerStyle={{ paddingBottom: 100 }}>
          <Text style={styles.titulo}>{votacion.titulo} — Ranking</Text>
          <Text style={styles.descripcion}>Resultados en directo.</Text>

          <View style={styles.zonaResultados}>
            {ranking.map((p, index) => {
              let porcentaje = 0;
              let textoPrincipal = '';
              let textoSecundario = '';

              if (votacion.metodoVotacion === 'puntuacion') {
                porcentaje = ((p.promedioEstrellas || 0) / 10) * 100;
                textoPrincipal = `${p.promedioEstrellas || 0}/10`;
                textoSecundario = `${p.totalPuntuaciones || 0} valoraciones`;
              } else {
                porcentaje = totalVotos === 0 ? 0 : (p.votos / totalVotos) * 100;
                textoPrincipal = `${p.votos} votos`;
                textoSecundario = `${porcentaje.toFixed(1)}%`;
              }

              const esGanador = index === 0 && (p.votos > 0 || (p.promedioEstrellas || 0) > 0);
              const medallaTexto = ['🥇', '🥈', '🥉'][index] ?? `${index + 1}º`;

              return (
                <View key={p.id} style={styles.filaRanking}>
                  <Text style={styles.medalla}>{medallaTexto}</Text>
                  <View style={styles.infoRanking}>
                    <View style={styles.rankingFila}>
                      <Text
                        style={[styles.nombreRanking, esGanador && styles.nombreGanador]}
                        numberOfLines={1}
                      >
                        {p.nombre}
                      </Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.puntosPrincipal}>{textoPrincipal}</Text>
                        <Text style={styles.puntosSecundario}>{textoSecundario}</Text>
                      </View>
                    </View>
                    <View style={styles.barraFondo}>
                      <View
                        style={[
                          styles.barraRelleno,
                          { width: `${porcentaje}%` },
                          esGanador && styles.barraGanador,
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Vista de Votación ────────────────────────────────────────────────────────

  const instruccion =
    votacion.metodoVotacion === 'unica'
      ? 'Elige UNA opción.'
      : votacion.metodoVotacion === 'multiple'
      ? `Elige hasta ${votacion.maxOpciones ?? 3} opciones.`
      : 'Puntúa del 1 al 10 a los participantes.';

  // 💡 INYECTAMOS EL TEMA EN LA RENDERIZACIÓN DE LAS TARJETAS (que están fuera del scope de estilos)
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnVolver} onPress={handleVolver}>
          <Text style={styles.btnVolverTexto}>← Atrás</Text>
        </TouchableOpacity>
        <View style={styles.badge}>
          <Text style={styles.badgeTexto}>{votacion.metodoVotacion}</Text>
        </View>
      </View>

      <ScrollView style={styles.cuerpo} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={styles.titulo}>{votacion.titulo}</Text>
        {votacion.descripcion && <Text style={styles.descripcion}>{votacion.descripcion}</Text>}
        <View style={styles.instruccionBox}>
          <Text style={styles.instruccionTexto}>{instruccion}</Text>
        </View>

        <View style={styles.listaParticipantes}>
          {participantes.map((p) => {
            if (votacion.metodoVotacion === 'unica') {
              return (
                <TarjetaUnica
                  key={p.id}
                  participante={p}
                  seleccionado={seleccionUnica === p.id}
                  onPress={() => setSeleccionUnica(p.id)}
                />
              );
            }
            if (votacion.metodoVotacion === 'multiple') {
              const limiteAlcanzado =
                seleccionMultiple.size >= (votacion.maxOpciones ?? 3) &&
                !seleccionMultiple.has(p.id);
              return (
                <TarjetaMultiple
                  key={p.id}
                  participante={p}
                  seleccionado={seleccionMultiple.has(p.id)}
                  deshabilitado={limiteAlcanzado}
                  onPress={() => toggleMultiple(p.id)}
                />
              );
            }
            if (votacion.metodoVotacion === 'puntuacion') {
              return (
                <TarjetaPuntuacion
                  key={p.id}
                  participante={p}
                  puntuacion={puntuaciones[p.id] ?? 0}
                  onCambio={(nota) => setPuntuaciones((prev) => ({ ...prev, [p.id]: nota }))}
                />
              );
            }
            return null;
          })}
        </View>
      </ScrollView>

      <View style={styles.footerVotar}>
        <TouchableOpacity
          style={[styles.btnConfirmar, !puedeVotar() && styles.btnConfirmarDeshabilitado]}
          onPress={handleVotar}
          disabled={!puedeVotar() || enviando}
        >
          {enviando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnConfirmarTexto}>Votar y Ver Resultados</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 💡 CORRECCIÓN 2: Para evitar el problema de inicialización con componentes externos, 
// hemos sustituido `theme.colors...` por sus valores HEX reales o variables seguras en el StyleSheet.
// Si los colores cambian en el futuro, recuerda actualizarlos aquí.
const PRIMARY = '#E03131';
const BACKGROUND = '#F4F6F8';
const SURFACE = '#FFFFFF';
const TEXT_DARK = '#1C1E21';
const TEXT_MUTED = '#868E96';
const BORDER = '#E9ECEF';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  textoError: { fontSize: 16, color: TEXT_MUTED, marginBottom: 20, fontWeight: '600' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'transparent' },
  btnVolver: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: SURFACE, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  btnVolverTexto: { color: TEXT_DARK, fontSize: 14, fontWeight: '700' },
  badge: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: TEXT_DARK },
  badgeGris: { backgroundColor: TEXT_MUTED },
  badgeTexto: { color: '#FFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  bannerPausado: { backgroundColor: '#FFF5F5', padding: 14, alignItems: 'center', borderRadius: 12, marginHorizontal: 20, marginBottom: 10 },
  textoBannerPausado: { color: PRIMARY, fontWeight: '800' },
  cuerpo: { flex: 1, paddingHorizontal: 20 },
  titulo: { fontSize: 28, fontWeight: '900', color: TEXT_DARK, marginBottom: 8 },
  descripcion: { fontSize: 15, color: TEXT_MUTED, marginBottom: 20, lineHeight: 22 },
  instruccionBox: { backgroundColor: SURFACE, padding: 16, borderRadius: 12, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: PRIMARY, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  instruccionTexto: { fontSize: 15, color: TEXT_DARK, fontWeight: '700' },
  listaParticipantes: { gap: 14 },
  
  // Tarjetas de votación
  tarjeta: { backgroundColor: SURFACE, padding: 20, borderRadius: 20, borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, flexDirection: 'row', alignItems: 'center' },
  tarjetaSeleccionada: { borderColor: PRIMARY, backgroundColor: '#FFF5F5' },
  tarjetaDeshabilitada: { opacity: 0.4 },
  infoParticipante: { flex: 1 },
  nombreParticipante: { fontSize: 17, fontWeight: '800', color: TEXT_DARK, marginBottom: 4 },
  nombreSeleccionado: { color: PRIMARY },
  descripcionParticipante: { fontSize: 14, color: TEXT_MUTED, lineHeight: 20 },
  
  // Controles (Radios y Checkboxes)
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: BORDER, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  radioSeleccionado: { borderColor: PRIMARY },
  radioPunto: { width: 14, height: 14, borderRadius: 7, backgroundColor: PRIMARY },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: BORDER, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  checkboxSeleccionado: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  checkmark: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  
  // Botones de puntuación
  notasContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btnNota: { width: 38, height: 38, borderRadius: 10, backgroundColor: BACKGROUND, justifyContent: 'center', alignItems: 'center' },
  btnNotaActivo: { backgroundColor: PRIMARY },
  btnNotaTexto: { fontSize: 15, fontWeight: '700', color: TEXT_MUTED },
  btnNotaTextoActivo: { color: '#FFF' },
  notaElegida: { fontSize: 14, color: PRIMARY, fontWeight: '800', marginTop: 12 },
  
  // Footer y Botón Confirmar
  footerVotar: { padding: 20, backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER, paddingBottom: 30 },
  btnConfirmar: { backgroundColor: PRIMARY, paddingVertical: 18, borderRadius: 12, alignItems: 'center', shadowColor: PRIMARY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5 },
  btnConfirmarDeshabilitado: { backgroundColor: BORDER, shadowOpacity: 0 },
  btnConfirmarTexto: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  
  // Resultados y Ranking
  zonaResultados: { backgroundColor: SURFACE, padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5, marginTop: 10 },
  filaRanking: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  medalla: { fontSize: 26, width: 40, textAlign: 'center', marginRight: 12 },
  infoRanking: { flex: 1 },
  rankingFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  nombreRanking: { fontSize: 16, fontWeight: '700', color: TEXT_DARK, flex: 1, marginRight: 10 },
  nombreGanador: { color: PRIMARY, fontWeight: '900' },
  puntosPrincipal: { fontSize: 15, fontWeight: '900', color: TEXT_DARK },
  puntosSecundario: { fontSize: 12, color: TEXT_MUTED, marginTop: 2, fontWeight: '600' },
  barraFondo: { height: 10, backgroundColor: BACKGROUND, borderRadius: 5, overflow: 'hidden' },
  barraRelleno: { height: '100%', backgroundColor: TEXT_DARK, borderRadius: 5 },
  barraGanador: { backgroundColor: PRIMARY },
});