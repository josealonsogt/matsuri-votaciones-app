// ============================================================================
// PANTALLA DE VOTACIÓN — app/votar/[votacionId].tsx
// ============================================================================

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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

// ─── Paleta Matsuri Toledo 2026 ───────────────────────────────────────────────
const C = {
  bg: '#EEF8F7',
  white: '#FFFFFF',
  ink: '#0D1F2D',
  slate: '#2D4A5A',
  muted: '#6E8FA0',
  border: '#C8E6E4',
  teal: '#00B4A6',
  tealDark: '#00857A',
  tealSoft: '#DFF4F3',
  magenta: '#E91E8C',
  magentaDark: '#C0166F',
  magentaSoft: '#FCE4F3',
  purple: '#6B3FA0',
  purpleSoft: '#EDE5F7',
  gold: '#F59F00',
  goldSoft: '#FFF9DB',
  silver: '#868E96',
  bronze: '#C17830',
  bronzeSoft: '#FFF4E6',
  shadow: '#062028',
};

// ─── Medalla sin emoji ────────────────────────────────────────────────────────
function MedallaIcon({ index }: { index: number }) {
  if (index === 0) return (
    <View style={[mS.wrap, { backgroundColor: C.goldSoft }]}>
      <MaterialCommunityIcons name="trophy" size={20} color={C.gold} />
    </View>
  );
  if (index === 1) return (
    <View style={[mS.wrap, { backgroundColor: C.border }]}>
      <MaterialCommunityIcons name="medal" size={20} color={C.silver} />
    </View>
  );
  if (index === 2) return (
    <View style={[mS.wrap, { backgroundColor: C.bronzeSoft }]}>
      <MaterialCommunityIcons name="medal-outline" size={20} color={C.bronze} />
    </View>
  );
  return (
    <View style={[mS.wrap, { backgroundColor: C.bg }]}>
      <Text style={{ fontSize: 13, fontWeight: '800', color: C.muted }}>{index + 1}</Text>
    </View>
  );
}
const mS = StyleSheet.create({
  wrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

// ─── Tarjeta voto único ───────────────────────────────────────────────────────
function TarjetaUnica({ participante, seleccionado, onPress }: { participante: Participante; seleccionado: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[tS.tarjeta, seleccionado && tS.tarjetaSel]}
      onPress={onPress} activeOpacity={0.8}
    >
      {seleccionado && <View style={tS.accentBar} />}
      <View style={tS.info}>
        <Text style={[tS.nombre, seleccionado && tS.nombreSel]}>{participante.nombre}</Text>
        {participante.descripcion && <Text style={tS.desc}>{participante.descripcion}</Text>}
      </View>
      <View style={[tS.radio, seleccionado && tS.radioSel]}>
        {seleccionado && <View style={tS.radioPunto} />}
      </View>
    </TouchableOpacity>
  );
}

// ─── Tarjeta voto múltiple ────────────────────────────────────────────────────
function TarjetaMultiple({ participante, seleccionado, deshabilitado, onPress }: { participante: Participante; seleccionado: boolean; deshabilitado: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[tS.tarjeta, seleccionado && tS.tarjetaSel, deshabilitado && tS.disabled]}
      onPress={onPress} activeOpacity={0.8} disabled={deshabilitado}
    >
      {seleccionado && <View style={tS.accentBar} />}
      <View style={tS.info}>
        <Text style={[tS.nombre, seleccionado && tS.nombreSel]}>{participante.nombre}</Text>
        {participante.descripcion && <Text style={tS.desc}>{participante.descripcion}</Text>}
      </View>
      <View style={[tS.checkbox, seleccionado && tS.checkboxSel]}>
        {seleccionado && <Feather name="check" size={14} color="#FFF" />}
      </View>
    </TouchableOpacity>
  );
}

// ─── Tarjeta puntuación ───────────────────────────────────────────────────────
function TarjetaPuntuacion({ participante, puntuacion, onCambio }: { participante: Participante; puntuacion: number; onCambio: (n: number) => void }) {
  return (
    <View style={[tS.tarjeta, puntuacion > 0 && tS.tarjetaSel]}>
      {puntuacion > 0 && <View style={tS.accentBar} />}
      <View style={tS.info}>
        <Text style={[tS.nombre, puntuacion > 0 && tS.nombreSel]}>{participante.nombre}</Text>
        {participante.descripcion && <Text style={tS.desc}>{participante.descripcion}</Text>}
        <View style={tS.notasRow}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <TouchableOpacity
              key={n} onPress={() => onCambio(n)}
              style={[tS.btnNota, puntuacion === n && tS.btnNotaActive]}
            >
              <Text style={[tS.btnNotaTxt, puntuacion === n && tS.btnNotaActiveTxt]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {puntuacion > 0 && (
          <View style={tS.notaElegidaRow}>
            <MaterialCommunityIcons name="star" size={13} color={C.gold} />
            <Text style={tS.notaElegida}>Tu puntuación: {puntuacion}/10</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const tS = StyleSheet.create({
  tarjeta: {
    backgroundColor: C.white, padding: 18, borderRadius: 20,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06, shadowRadius: 14, elevation: 3,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  tarjetaSel: { borderColor: C.teal, backgroundColor: C.tealSoft },
  disabled: { opacity: 0.35 },
  // Barra izquierda de acento
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: C.teal, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  info: { flex: 1 },
  nombre: { fontSize: 16, fontWeight: '800', color: C.ink, marginBottom: 3 },
  nombreSel: { color: C.tealDark },
  desc: { fontSize: 13, color: C.muted, lineHeight: 18 },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginLeft: 14 },
  radioSel: { borderColor: C.teal },
  radioPunto: { width: 13, height: 13, borderRadius: 7, backgroundColor: C.teal },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginLeft: 14 },
  checkboxSel: { backgroundColor: C.teal, borderColor: C.teal },
  notasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  btnNota: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  btnNotaActive: { backgroundColor: C.teal },
  btnNotaTxt: { fontSize: 14, fontWeight: '700', color: C.muted },
  btnNotaActiveTxt: { color: '#FFF' },
  notaElegidaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  notaElegida: { fontSize: 13, color: C.tealDark, fontWeight: '800' },
});

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

  const [seleccionUnica, setSeleccionUnica] = useState<string | null>(null);
  const [seleccionMultiple, setSeleccionMultiple] = useState<Set<string>>(new Set());
  const [puntuaciones, setPuntuaciones] = useState<Record<string, number>>({});

  useEffect(() => {
    if (cargandoAuth) return;
    if (!usuario) { router.replace('/'); return; }
    if (!votacionId) return;
    let unsub: () => void;

    (async () => {
      setCargando(true);
      const [v, voto, pausado] = await Promise.all([
        obtenerVotacion(votacionId as string),
        verificarVotoExistente(usuario.uid, votacionId as string),
        obtenerEstadoEvento(),
      ]);
      setVotacion(v); setYaVoto(voto); setEventoPausado(pausado);
      setCargando(false);

      const q = query(collection(db, 'participantes'), where('votacionId', '==', votacionId));
      unsub = onSnapshot(q, (snap) => {
        setParticipantes(snap.docs.map((d) => ({
          id: d.id, votacionId: d.data().votacionId,
          nombre: d.data().nombre, descripcion: d.data().descripcion || undefined,
          votos: d.data().votos || 0,
          sumaPuntuacion: d.data().sumaPuntuacion || 0,
          totalPuntuaciones: d.data().totalPuntuaciones || 0,
          promedioEstrellas: d.data().promedioEstrellas || 0,
        })));
      });
    })();

    return () => { if (unsub) unsub(); };
  }, [votacionId, usuario?.uid, cargandoAuth, router, usuario]);

  const toggleMultiple = (id: string) => {
    const n = new Set(seleccionMultiple);
    if (n.has(id)) { n.delete(id); }
    else {
      const max = votacion?.maxOpciones ?? 3;
      if (n.size >= max) {
        const msg = `Solo puedes elegir hasta ${max} opciones.`;
        Platform.OS === 'web' ? alert(msg) : Alert.alert('Límite alcanzado', msg);
        return;
      }
      n.add(id);
    }
    setSeleccionMultiple(n);
  };

  const puedeVotar = (): boolean => {
    if (!votacion || eventoPausado) return false;
    if (votacion.metodoVotacion === 'unica') return seleccionUnica !== null;
    if (votacion.metodoVotacion === 'multiple') return seleccionMultiple.size > 0;
    if (votacion.metodoVotacion === 'puntuacion') return Object.keys(puntuaciones).length > 0;
    return false;
  };

  const handleVotar = async () => {
    if (!puedeVotar() || !usuario || !votacion) return;
    setEnviando(true);
    let ids: string[] = [];
    let pts: Record<string, number> | undefined;
    if (votacion.metodoVotacion === 'unica') ids = [seleccionUnica!];
    else if (votacion.metodoVotacion === 'multiple') ids = Array.from(seleccionMultiple);
    else { ids = Object.keys(puntuaciones); pts = puntuaciones; }
    const ok = await registrarVoto({ usuarioId: usuario.uid, votacionId: votacion.id, participantesIds: ids, puntuaciones: pts });
    if (ok) setYaVoto(true);
    else { const msg = 'No se pudo registrar el voto. Es posible que ya hayas votado.'; Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg); }
    setEnviando(false);
  };

  const handleVolver = () => { router.canGoBack() ? router.back() : router.replace('/dashboard' as any); };

  // ── Cargando ──────────────────────────────────────────────────────────────
  if (cargando) return (
    <View style={[s.container, s.center]}>
      <ActivityIndicator size="large" color={C.teal} />
    </View>
  );

  if (!votacion) return (
    <View style={[s.container, s.center]}>
      <View style={s.errorCard}>
        <View style={[s.errorIconWrap]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={32} color={C.magenta} />
        </View>
        <Text style={s.errorTxt}>Esta votación no existe.</Text>
        <TouchableOpacity style={s.btnVolverError} onPress={handleVolver}>
          <Feather name="arrow-left" size={15} color={C.teal} />
          <Text style={s.btnVolverErrorTxt}>Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Vista de Resultados ───────────────────────────────────────────────────
  if (yaVoto || votacion.estado === 'cerrada' || eventoPausado) {
    const ranking = [...participantes];
    let totalVotos = 0;
    if (votacion.metodoVotacion === 'puntuacion') { ranking.sort((a, b) => (b.promedioEstrellas || 0) - (a.promedioEstrellas || 0)); totalVotos = 10; }
    else { totalVotos = ranking.reduce((sum, p) => sum + p.votos, 0); ranking.sort((a, b) => b.votos - a.votos); }

    const etiqueta = eventoPausado ? 'PAUSADA' : votacion.estado === 'cerrada' ? 'FINALIZADA' : 'YA VOTASTE';
    const badgeBg = eventoPausado ? '#FCC419' : votacion.estado === 'cerrada' ? C.muted : C.teal;

    // Color de barra según posición
    const barColors = [C.teal, C.magenta, C.purple];

    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity style={s.btnVolver} onPress={handleVolver}>
            <Feather name="arrow-left" size={16} color={C.ink} />
            <Text style={s.btnVolverTxt}>Atrás</Text>
          </TouchableOpacity>
          <View style={[s.badge, { backgroundColor: badgeBg }]}>
            <Text style={s.badgeTxt}>{etiqueta}</Text>
          </View>
        </View>

        {eventoPausado && !yaVoto && (
          <View style={s.bannerPausado}>
            <MaterialCommunityIcons name="pause-circle-outline" size={18} color={C.magenta} />
            <Text style={s.bannerTxt}>Las votaciones están temporalmente pausadas.</Text>
          </View>
        )}

        <ScrollView style={s.cuerpo} contentContainerStyle={{ paddingBottom: 100 }}>
          <Text style={s.titulo}>{votacion.titulo}</Text>
          <View style={s.subtituloRow}>
            <MaterialCommunityIcons name="chart-bar" size={14} color={C.teal} />
            <Text style={s.descripcion}>Resultados en directo</Text>
          </View>

          <View style={s.zonaResultados}>
            {ranking.map((p, i) => {
              let pct = 0, txtMain = '', txtSub = '';
              if (votacion.metodoVotacion === 'puntuacion') {
                pct = ((p.promedioEstrellas || 0) / 10) * 100;
                txtMain = `${p.promedioEstrellas || 0}/10`;
                txtSub = `${p.totalPuntuaciones || 0} valoraciones`;
              } else {
                pct = totalVotos === 0 ? 0 : (p.votos / totalVotos) * 100;
                txtMain = `${p.votos} votos`;
                txtSub = `${pct.toFixed(1)}%`;
              }
              const esGanador = i === 0 && (p.votos > 0 || (p.promedioEstrellas || 0) > 0);
              const barColor = barColors[i % 3];

              return (
                <View key={p.id} style={s.filaRanking}>
                  <MedallaIcon index={i} />
                  <View style={s.infoRanking}>
                    <View style={s.rankingRow}>
                      <Text style={[s.nombreRanking, esGanador && { color: C.tealDark }]} numberOfLines={1}>
                        {p.nombre}
                      </Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[s.ptsPrincipal, esGanador && { color: C.tealDark }]}>{txtMain}</Text>
                        <Text style={s.ptsSub}>{txtSub}</Text>
                      </View>
                    </View>
                    <View style={s.barraFondo}>
                      <View style={[s.barraRelleno, { width: `${pct}%` as any, backgroundColor: barColor }]} />
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

  // ── Vista de Votación ─────────────────────────────────────────────────────
  const instrMap: Record<string, { icon: string; txt: string }> = {
    unica:      { icon: 'radiobox-marked',                    txt: 'Elige UNA opción.' },
    multiple:   { icon: 'checkbox-multiple-marked-outline',   txt: `Elige hasta ${votacion.maxOpciones ?? 3} opciones.` },
    puntuacion: { icon: 'star-outline',                       txt: 'Puntúa del 1 al 10 a los participantes.' },
  };
  const instr = instrMap[votacion.metodoVotacion] ?? { icon: 'help-circle-outline', txt: '' };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.btnVolver} onPress={handleVolver}>
          <Feather name="arrow-left" size={16} color={C.ink} />
          <Text style={s.btnVolverTxt}>Atrás</Text>
        </TouchableOpacity>
        <View style={s.badge}>
          <Text style={s.badgeTxt}>{votacion.metodoVotacion}</Text>
        </View>
      </View>

      <ScrollView style={s.cuerpo} contentContainerStyle={{ paddingBottom: 130 }}>
        <Text style={s.titulo}>{votacion.titulo}</Text>
        {votacion.descripcion && <Text style={s.descripcion}>{votacion.descripcion}</Text>}

        <View style={s.instruccionBox}>
          <View style={s.instrIconWrap}>
            <MaterialCommunityIcons name={instr.icon as any} size={18} color={C.teal} />
          </View>
          <Text style={s.instrTxt}>{instr.txt}</Text>
        </View>

        <View style={s.lista}>
          {participantes.map((p) => {
            if (votacion.metodoVotacion === 'unica')
              return <TarjetaUnica key={p.id} participante={p} seleccionado={seleccionUnica === p.id} onPress={() => setSeleccionUnica(p.id)} />;
            if (votacion.metodoVotacion === 'multiple') {
              const lim = seleccionMultiple.size >= (votacion.maxOpciones ?? 3) && !seleccionMultiple.has(p.id);
              return <TarjetaMultiple key={p.id} participante={p} seleccionado={seleccionMultiple.has(p.id)} deshabilitado={lim} onPress={() => toggleMultiple(p.id)} />;
            }
            if (votacion.metodoVotacion === 'puntuacion')
              return <TarjetaPuntuacion key={p.id} participante={p} puntuacion={puntuaciones[p.id] ?? 0} onCambio={(n) => setPuntuaciones((prev) => ({ ...prev, [p.id]: n }))} />;
            return null;
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btnConfirmar, !puedeVotar() && s.btnDisabled]}
          onPress={handleVotar} disabled={!puedeVotar() || enviando} activeOpacity={0.85}
        >
          {enviando ? <ActivityIndicator color="#FFF" /> : (
            <>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#FFF" />
              <Text style={s.btnConfirmarTxt}>Votar y ver resultados</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },

  // Error
  errorCard: { backgroundColor: C.white, padding: 32, borderRadius: 24, alignItems: 'center', gap: 12, shadowColor: C.shadow, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.07, shadowRadius: 24, elevation: 6 },
  errorIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: C.magentaSoft, alignItems: 'center', justifyContent: 'center' },
  errorTxt: { fontSize: 16, color: C.muted, fontWeight: '700' },
  btnVolverError: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingVertical: 10, paddingHorizontal: 18, backgroundColor: C.tealSoft, borderRadius: 12 },
  btnVolverErrorTxt: { color: C.tealDark, fontWeight: '700', fontSize: 14 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  btnVolver: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: C.white, borderRadius: 14, shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  btnVolverTxt: { color: C.ink, fontSize: 14, fontWeight: '700' },
  badge: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.teal },
  badgeTxt: { color: '#FFF', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },

  // Banner pausado
  bannerPausado: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.magentaSoft, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, marginHorizontal: 20, marginBottom: 8 },
  bannerTxt: { color: C.magentaDark, fontWeight: '800', fontSize: 14, flex: 1 },

  // Cuerpo
  cuerpo: { flex: 1, paddingHorizontal: 20 },
  titulo: { fontSize: 26, fontWeight: '900', color: C.ink, marginBottom: 6, marginTop: 10 },
  subtituloRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 18 },
  descripcion: { fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 18 },

  instruccionBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, padding: 16, borderRadius: 14, marginBottom: 22, shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  instrIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.tealSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  instrTxt: { fontSize: 14, color: C.ink, fontWeight: '700', flex: 1 },
  lista: { gap: 12 },

  // Footer
  footer: { padding: 20, paddingBottom: 32, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
  btnConfirmar: { backgroundColor: C.teal, paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, shadowColor: C.teal, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 6 },
  btnDisabled: { backgroundColor: C.border, shadowOpacity: 0 },
  btnConfirmarTxt: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.4 },

  // Resultados
  zonaResultados: { backgroundColor: C.white, padding: 22, borderRadius: 24, shadowColor: C.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 5, marginTop: 4 },
  filaRanking: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, gap: 12 },
  infoRanking: { flex: 1 },
  rankingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  nombreRanking: { fontSize: 15, fontWeight: '700', color: C.ink, flex: 1, marginRight: 10 },
  ptsPrincipal: { fontSize: 14, fontWeight: '900', color: C.ink },
  ptsSub: { fontSize: 12, color: C.muted, marginTop: 2, fontWeight: '600' },
  barraFondo: { height: 8, backgroundColor: C.bg, borderRadius: 4, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: 4 },
});