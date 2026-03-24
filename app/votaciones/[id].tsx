// ============================================================================
// 📋 VOTACIONES DE UNA SECCIÓN — app/votaciones/[id].tsx
//
// Lista todas las votaciones de una sección concreta.
// Filtra las votaciones con visible===false para que el público no las vea.
// ============================================================================

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { obtenerVotacionesPorSeccion } from '../../services/adminService';
import type { Votacion } from '../../types';
// 💡 CORRECCIÓN 1: Ruta relativa (2 niveles arriba porque estamos en /app/votaciones)
import { theme } from '../../styles/theme';

// Textos amigables para cada método de votación
const ETIQUETA_METODO: Record<string, string> = {
  unica: 'Voto Único',
  multiple: 'Voto Múltiple',
  puntuacion: 'Puntuación 1-10',
};

export default function VotacionesSeccionScreen() {
  const router = useRouter();
  // Soporte para ambos nombres de parámetro por si el router los interpreta diferente
  const params = useLocalSearchParams();
  const seccionId = (params.id || params.seccionId) as string;

  const [votaciones, setVotaciones] = useState<Votacion[]>([]);
  const [cargando, setCargando] = useState(true);

  // 💡 CORRECCIÓN 2: Estilos movidos al interior del componente
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, backgroundColor: 'transparent' },
    btnVolver: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, ...theme.shadows.soft },
    btnVolverTexto: { color: theme.colors.textDark, fontSize: 15, fontWeight: '700' },
    cuerpo: { paddingHorizontal: 20, paddingBottom: 40 },
    titulo: { fontSize: 28, fontWeight: '800', color: theme.colors.textDark, marginBottom: 20 },
    vacio: { alignItems: 'center', marginTop: 40, padding: 30, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed' },
    vacioTexto: { fontSize: 16, color: theme.colors.textDark, fontWeight: '700', marginBottom: 8 },
    vacioSubtexto: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20 },
    tarjeta: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: theme.colors.surface, padding: 24, borderRadius: theme.borderRadius.lg, marginBottom: 16,
      ...theme.shadows.soft,
    },
    tarjetaCerrada: { opacity: 0.5, backgroundColor: theme.colors.background },
    infoVotacion: { flex: 1 },
    tituloVotacion: { fontSize: 19, fontWeight: '800', color: theme.colors.textDark, marginBottom: 6 },
    descripcionVotacion: { fontSize: 14, color: theme.colors.textMuted, marginBottom: 14, lineHeight: 20 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    badge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: theme.borderRadius.pill, backgroundColor: theme.colors.textDark },
    badgeGris: { backgroundColor: theme.colors.textMuted },
    badgeAbierta: { backgroundColor: theme.colors.primary }, // Rojo Matsuri para "Abierta"
    badgeCerrada: { backgroundColor: theme.colors.border },
    badgeTexto: { color: '#FFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    flecha: { fontSize: 22, color: theme.colors.border, marginLeft: 10, fontWeight: 'bold' },
  });

  useEffect(() => {
    if (!seccionId) return;
    const cargar = async () => {
      setCargando(true);
      const data = await obtenerVotacionesPorSeccion(seccionId);
      setVotaciones(data);
      setCargando(false);
    };
    cargar();
  }, [seccionId]);

  if (!seccionId || cargando) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // Solo mostramos las votaciones que el admin ha marcado como visibles
  const votacionesVisibles = votaciones.filter((v) => v.visible !== false);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnVolver} onPress={() => router.back()}>
          <Text style={styles.btnVolverTexto}>← Atrás</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cuerpo}>
        <Text style={styles.titulo}>Votaciones Disponibles</Text>

        {votacionesVisibles.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioTexto}>No hay votaciones en esta sección</Text>
            <Text style={styles.vacioSubtexto}>Vuelve más tarde para ver si hay novedades.</Text>
          </View>
        ) : (
          votacionesVisibles.map((votacion) => (
            <TouchableOpacity
              key={votacion.id}
              style={[styles.tarjeta, votacion.estado === 'cerrada' && styles.tarjetaCerrada]}
              onPress={() => router.push(`/votar/${votacion.id}` as any)}
            >
              <View style={styles.infoVotacion}>
                <Text style={styles.tituloVotacion}>{votacion.titulo}</Text>
                {votacion.descripcion && (
                  <Text style={styles.descripcionVotacion}>{votacion.descripcion}</Text>
                )}
                <View style={styles.badges}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeTexto}>
                      {ETIQUETA_METODO[votacion.metodoVotacion] ?? votacion.metodoVotacion}
                    </Text>
                  </View>
                  {votacion.metodoVotacion === 'multiple' && votacion.maxOpciones && (
                    <View style={[styles.badge, styles.badgeGris]}>
                      <Text style={styles.badgeTexto}>Máx: {votacion.maxOpciones}</Text>
                    </View>
                  )}
                  <View style={[styles.badge, votacion.estado === 'abierta' ? styles.badgeAbierta : styles.badgeCerrada]}>
                    <Text style={styles.badgeTexto}>
                      {votacion.estado === 'abierta' ? '🟢 Abierta' : '🔴 Cerrada'}
                    </Text>
                  </View>
                </View>
              </View>
              {votacion.estado === 'abierta' && (
                <Text style={styles.flecha}>→</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}