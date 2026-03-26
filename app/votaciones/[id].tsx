// ============================================================================
// VOTACIONES DE UNA SECCIÓN — app/votaciones/[id].tsx
// ============================================================================

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { obtenerVotacionesPorSeccion } from '../../services/adminService';
import type { Votacion } from '../../types';

const C = {
  bg: '#F2F8FF',
  white: '#FFFFFF',
  ink: '#12213F',
  slate: '#4E5F84',
  muted: '#7A89A8',
  border: '#DFE7F6',
  teal: '#0AAE9F',
  tealDark: '#0A7E74',
  tealSoft: '#E5F8F6',
  magenta: '#E43D8C',
  magentaSoft: '#FFE9F3',
  purple: '#6B5AED',
  purpleSoft: '#EFEAFF',
  orange: '#F97316',
  orangeSoft: '#FFF0E6',
  shadow: '#1C2440',
};

const ETIQUETA_METODO: Record<string, string> = {
  unica: 'Voto Único',
  multiple: 'Voto Múltiple',
  puntuacion: 'Puntuación 1-10',
};

const META_METODO: Record<
  string,
  { icon: keyof typeof MaterialCommunityIcons.glyphMap; bg: string; color: string }
> = {
  unica: { icon: 'radiobox-marked', bg: C.tealSoft, color: C.tealDark },
  multiple: { icon: 'checkbox-multiple-marked-outline', bg: C.purpleSoft, color: C.purple },
  puntuacion: { icon: 'star-outline', bg: C.orangeSoft, color: C.orange },
};

export default function VotacionesSeccionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const seccionId = (params.id || params.seccionId) as string;
  const seccionNombreParam = params.seccionNombre;
  const seccionNombre = Array.isArray(seccionNombreParam)
    ? seccionNombreParam[0]
    : seccionNombreParam;

  const [votaciones, setVotaciones] = useState<Votacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargarDatos = useCallback(
    async (ocultarCargando = false) => {
      if (!seccionId) return;
      if (!ocultarCargando) setCargando(true);
      const data = await obtenerVotacionesPorSeccion(seccionId);
      setVotaciones(data);
      if (!ocultarCargando) setCargando(false);
    },
    [seccionId]
  );

  useEffect(() => {
    if (seccionId) cargarDatos();
  }, [seccionId, cargarDatos]);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargarDatos(true);
    setRefrescando(false);
  };

  if (!seccionId || cargando) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={C.teal} />
      </View>
    );
  }

  const votacionesVisibles = votaciones.filter((v) => v.visible !== false);

  return (
    <View style={styles.container}>
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={onRefresh}
            colors={[C.teal]}
            tintColor={C.teal}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.btnVolver} onPress={() => router.back()} activeOpacity={0.85}>
            <Feather name="arrow-left" size={16} color={C.ink} />
            <Text style={styles.btnVolverTexto}>Atrás</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cuerpo}>
          <View style={styles.toolbar}>
            <View style={styles.titleRow}>
              <View style={styles.titleIcon}>
                <MaterialCommunityIcons name="ballot-outline" size={16} color={C.tealDark} />
              </View>
              <Text style={styles.titulo}>{seccionNombre || 'Votaciones Disponibles'}</Text>
            </View>
            <TouchableOpacity onPress={onRefresh} disabled={refrescando} style={styles.btnRefrescar}>
              {refrescando ? (
                <ActivityIndicator size="small" color={C.teal} />
              ) : (
                <MaterialCommunityIcons name="refresh" size={20} color={C.teal} />
              )}
            </TouchableOpacity>
          </View>

          {votacionesVisibles.length === 0 ? (
            <View style={styles.vacio}>
              <View style={styles.vacioIconWrap}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={24} color={C.muted} />
              </View>
              <Text style={styles.vacioTexto}>No hay votaciones en esta sección</Text>
              <Text style={styles.vacioSubtexto}>
                Desliza hacia abajo para actualizar si esperas novedades.
              </Text>
            </View>
          ) : (
            votacionesVisibles.map((votacion) => {
              const abierta = votacion.estado === 'abierta';
              const meta = META_METODO[votacion.metodoVotacion] ?? {
                icon: 'help-circle-outline',
                bg: C.tealSoft,
                color: C.tealDark,
              };

              return (
                <TouchableOpacity
                  key={votacion.id}
                  style={[styles.tarjeta, !abierta && styles.tarjetaCerrada]}
                  onPress={() => router.push(`/votar/${votacion.id}` as any)}
                  disabled={!abierta}
                  activeOpacity={0.86}
                >
                  <View style={[styles.iconBadge, { backgroundColor: meta.bg }]}>
                    <MaterialCommunityIcons name={meta.icon} size={20} color={meta.color} />
                  </View>

                  <View style={styles.infoVotacion}>
                    <Text style={styles.tituloVotacion}>{votacion.titulo}</Text>
                    {votacion.descripcion ? (
                      <Text style={styles.descripcionVotacion}>{votacion.descripcion}</Text>
                    ) : null}

                    <View style={styles.badges}>
                      <View style={styles.badgeMetodo}>
                        <Text style={styles.badgeMetodoTexto}>
                          {ETIQUETA_METODO[votacion.metodoVotacion] ?? votacion.metodoVotacion}
                        </Text>
                      </View>

                      {votacion.metodoVotacion === 'multiple' && votacion.maxOpciones ? (
                        <View style={styles.badgeLimite}>
                          <MaterialCommunityIcons name="numeric" size={11} color={C.slate} />
                          <Text style={styles.badgeLimiteTexto}>Máx {votacion.maxOpciones}</Text>
                        </View>
                      ) : null}

                      <View style={[styles.badgeEstado, abierta ? styles.badgeAbierta : styles.badgeCerrada]}>
                        <MaterialCommunityIcons
                          name={abierta ? 'check-circle-outline' : 'lock-outline'}
                          size={12}
                          color="#FFFFFF"
                        />
                        <Text style={styles.badgeEstadoTexto}>{abierta ? 'Abierta' : 'Cerrada'}</Text>
                      </View>
                    </View>
                  </View>

                  {abierta ? <Feather name="chevron-right" size={20} color={C.muted} /> : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 36 },
  center: { justifyContent: 'center', alignItems: 'center' },

  orbTop: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#E6F8F5',
    opacity: 0.8,
  },
  orbBottom: {
    position: 'absolute',
    bottom: -120,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#F2EBFF',
    opacity: 0.85,
  },

  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  btnVolver: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: C.white,
    borderRadius: 14,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  btnVolverTexto: { color: C.ink, fontSize: 14, fontWeight: '700' },

  cuerpo: { paddingHorizontal: 16, paddingBottom: 24 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  titleIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontSize: 26, fontWeight: '900', color: C.ink },
  btnRefrescar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },

  vacio: {
    marginTop: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: C.white,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  vacioIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F4F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  vacioTexto: { fontSize: 16, color: C.ink, fontWeight: '800', marginBottom: 6 },
  vacioSubtexto: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 },

  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  tarjetaCerrada: { opacity: 0.58 },

  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  infoVotacion: { flex: 1, paddingRight: 8 },
  tituloVotacion: { fontSize: 17, fontWeight: '800', color: C.ink, marginBottom: 4 },
  descripcionVotacion: { fontSize: 13, color: C.muted, lineHeight: 18, marginBottom: 10 },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeMetodo: {
    backgroundColor: '#EEF3FF',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeMetodoTexto: {
    color: '#4D5F84',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  badgeLimite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F4F6FA',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeLimiteTexto: { color: C.slate, fontSize: 11, fontWeight: '700' },

  badgeEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeAbierta: { backgroundColor: C.teal },
  badgeCerrada: { backgroundColor: C.muted },
  badgeEstadoTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});