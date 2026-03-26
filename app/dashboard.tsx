// ============================================================================
// PANTALLA PRINCIPAL — app/dashboard.tsx
// ============================================================================

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getSectionIconOption, isSectionIconName } from '../constants/sectionIcons';
import { useAuth } from '../contexts/AuthContext';
import { obtenerSeccionesActivas } from '../services/adminService';
import { auth } from '../services/firebaseConfig';
import type { Seccion } from '../types';

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
  shadow: '#062028',
};

// ─── Mapa de iconos por texto de sección ─────────────────────────────────────
const FALLBACK: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; bg: string; color: string }[] = [
  { icon: 'shape-outline',          bg: C.tealSoft,    color: C.tealDark  },
  { icon: 'rocket-launch-outline',  bg: C.purpleSoft,  color: C.purple    },
  { icon: 'trophy-outline',         bg: '#FFF9DB',     color: '#C97F00'   },
  { icon: 'lightning-bolt-outline', bg: C.magentaSoft, color: C.magenta   },
];
const resolverIcono = (s: Seccion, i: number) => {
  if (s.icono && isSectionIconName(s.icono)) {
    const icono = getSectionIconOption(s.icono);
    if (icono) {
      return {
        icon: s.icono as React.ComponentProps<typeof MaterialCommunityIcons>['name'],
        bg: icono.bg,
        color: icono.color,
      };
    }
  }

  const t = `${s.nombre} ${s.descripcion || ''}`.toLowerCase();
  if (t.includes('comida') || t.includes('gastron') || t.includes('cocina'))
    return { icon: 'food-variant' as const, bg: '#FFF3E8', color: '#E8590C' };
  if (t.includes('cosplay') || t.includes('moda') || t.includes('traje'))
    return { icon: 'star-four-points-outline' as const, bg: C.magentaSoft, color: C.magenta };
  if (t.includes('musica') || t.includes('baile') || t.includes('karaoke'))
    return { icon: 'music-note-outline' as const, bg: C.purpleSoft, color: C.purple };
  if (t.includes('arte') || t.includes('dibujo') || t.includes('ilustr'))
    return { icon: 'palette-outline' as const, bg: C.tealSoft, color: C.tealDark };
  if (t.includes('origami') || t.includes('taller') || t.includes('papiroflexia'))
    return { icon: 'paper-cut-vertical' as const, bg: C.tealSoft, color: C.teal };
  return FALLBACK[i % FALLBACK.length];
};

// ─── SeccionCard ──────────────────────────────────────────────────────────────
interface SeccionCardProps { seccion: Seccion; index: number; onPress: () => void }
function SeccionCard({ seccion, index, onPress }: SeccionCardProps) {
  const ic = resolverIcono(seccion, index);
  // Alterna el acento de la raya izquierda: teal → magenta → purple
  const accentColors = [C.teal, C.magenta, C.purple];
  const accent = accentColors[index % 3];

  return (
    <TouchableOpacity
      style={[cStyles.tarjeta, { borderLeftColor: accent }]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View style={[cStyles.iconoBadge, { backgroundColor: ic.bg }]}>
        <MaterialCommunityIcons name={ic.icon} size={24} color={ic.color} />
      </View>
      <View style={cStyles.textos}>
        <Text style={cStyles.titulo}>{seccion.nombre}</Text>
        {seccion.descripcion ? (
          <Text style={cStyles.desc} numberOfLines={2}>{seccion.descripcion}</Text>
        ) : null}
      </View>
      <View style={[cStyles.arrow, { backgroundColor: ic.bg }]}>
        <Feather name="chevron-right" size={16} color={ic.color} />
      </View>
    </TouchableOpacity>
  );
}
const cStyles = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white,
    paddingVertical: 16, paddingHorizontal: 16,
    borderRadius: 20, marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 4,
  },
  iconoBadge: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  textos: { flex: 1 },
  titulo: { fontSize: 16, fontWeight: '800', color: C.ink, marginBottom: 2 },
  desc: { fontSize: 13, color: C.muted, lineHeight: 18 },
  arrow: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
});

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const onRefresh = async () => {
    setRefrescando(true);
    setSecciones(await obtenerSeccionesActivas());
    setRefrescando(false);
  };

  useEffect(() => {
    if (!cargandoAuth && (!usuario || !usuario.dniRegistrado)) router.replace('/' as any);
  }, [usuario, cargandoAuth, router]);

  useEffect(() => {
    if (!usuario?.dniRegistrado) return;
    (async () => {
      setCargando(true);
      setSecciones(await obtenerSeccionesActivas());
      setCargando(false);
    })();
  }, [usuario]);

  const cerrarSesion = async () => {
    try { await signOut(auth); router.replace('/' as any); }
    catch { alert('Error al cerrar sesión. Inténtalo de nuevo.'); }
  };

  if (cargandoAuth) return (
    <View style={[s.container, s.center]}>
      <ActivityIndicator size="large" color={C.teal} />
    </View>
  );
  if (!usuario?.dniRegistrado) return null;

  const nombre =
    usuario.datosUsuario?.nombre?.split(' ')[0] ||
    usuario.displayName?.split(' ')[0] ||
    usuario.email?.split('@')[0] || 'Votante';

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.scrollContent}
      alwaysBounceVertical
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={[C.teal]} tintColor={C.teal} />}
    >
      {/* Orbes */}
      <View style={s.orbTeal} />
      <View style={s.orbMagenta} />
      <View style={s.orbPurple} />

      {/* ── Hero banner teal ── */}
      <View style={s.hero}>
        <View style={s.heroLeft}>
          <View style={s.avatarBadge}>
            <MaterialCommunityIcons name="account-circle-outline" size={22} color={C.white} />
          </View>
          <View>
            <Text style={s.saludo}>Hola, {nombre}</Text>
            <Text style={s.subtitulo}>¿Qué vas a votar hoy?</Text>
          </View>
        </View>
        <View style={s.heroRight}>
          {usuario.esAdmin && (
            <TouchableOpacity style={s.btnAdmin} onPress={() => router.push('/admin' as any)}>
              <MaterialCommunityIcons name="shield-crown-outline" size={13} color={C.purple} />
              <Text style={s.textoAdmin}>Admin</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.btnSalir} onPress={cerrarSesion}>
            <Feather name="log-out" size={17} color={C.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.cuerpo}>
        {/* Pill de evento */}
        <View style={s.eventoPill}>
          <MaterialCommunityIcons name="calendar-star" size={13} color={C.magenta} />
          <Text style={s.eventoTexto}>Toledo Matsuri 2026  ·  11-12 Abril</Text>
        </View>

        <View style={s.toolbar}>
          <Text style={s.tituloLista}>Categorías del Matsuri</Text>
          <TouchableOpacity onPress={onRefresh} disabled={refrescando} style={s.btnRefrescar}>
            {refrescando
              ? <ActivityIndicator size="small" color={C.teal} />
              : <MaterialCommunityIcons name="refresh" size={20} color={C.teal} />}
          </TouchableOpacity>
        </View>

        {cargando ? (
          <ActivityIndicator size="large" color={C.teal} style={{ marginTop: 48 }} />
        ) : secciones.length === 0 ? (
          <View style={s.vacio}>
            <View style={s.vacioIcon}>
              <MaterialCommunityIcons name="ballot-outline" size={30} color={C.teal} />
            </View>
            <Text style={s.vacioTitulo}>Sin votaciones activas</Text>
            <Text style={s.vacioSub}>Disfruta del evento. Las abriremos muy pronto.</Text>
          </View>
        ) : (
          secciones.map((sec, i) => (
            <SeccionCard key={sec.id} seccion={sec} index={i} onPress={() => router.push(`/votaciones/${sec.id}` as any)} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  orbTeal:    { position: 'absolute', top: -60,   right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: C.teal,    opacity: 0.12 },
  orbMagenta: { position: 'absolute', top: 200,   left: -80,  width: 160, height: 160, borderRadius: 80,  backgroundColor: C.magenta, opacity: 0.07 },
  orbPurple:  { position: 'absolute', bottom: -80, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: C.purple,  opacity: 0.07 },

  hero: {
    marginHorizontal: 16, marginTop: 16, marginBottom: 16,
    paddingVertical: 20, paddingHorizontal: 20,
    backgroundColor: C.teal,
    borderRadius: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.45, shadowRadius: 22, elevation: 10,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  saludo: { fontSize: 18, fontWeight: '900', color: C.white },
  subtitulo: { fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 2 },
  heroRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnAdmin: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: C.white, borderRadius: 12 },
  textoAdmin: { color: C.purple, fontWeight: '800', fontSize: 12 },
  btnSalir: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  cuerpo: { paddingHorizontal: 16 },
  eventoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: C.magentaSoft, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, marginBottom: 16 },
  eventoTexto: { fontSize: 12, color: C.magentaDark, fontWeight: '700', letterSpacing: 0.2 },

  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingHorizontal: 2 },
  tituloLista: { fontSize: 20, fontWeight: '900', color: C.ink },
  btnRefrescar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.tealSoft, alignItems: 'center', justifyContent: 'center', shadowColor: C.teal, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 3 },

  vacio: { alignItems: 'center', marginTop: 20, paddingVertical: 36, paddingHorizontal: 24, backgroundColor: C.white, borderRadius: 22, shadowColor: C.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 4 },
  vacioIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: C.tealSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  vacioTitulo: { fontSize: 17, color: C.ink, fontWeight: '800', marginBottom: 6 },
  vacioSub: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 },
});