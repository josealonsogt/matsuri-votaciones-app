// ============================================================================
// 📊 ADMIN — RESULTADOS — app/admin/resultados.tsx
//
// Vista de solo lectura con el ranking de todas las votaciones.
// El admin puede expandir cualquier votación para ver los resultados
// actuales, sin necesidad de que esté cerrada.
// ============================================================================

import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { obtenerParticipantes, obtenerTodasLasVotaciones } from '../../services/adminService';

import { globalStyles } from '../../styles/globalStyles';
import { theme } from '../../styles/theme';
import type { Participante, Votacion } from '../../types';

export default function ResultadosScreen() {
  const [votaciones, setVotaciones] = useState<Votacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [ranking, setRanking] = useState<Participante[]>([]);
  const [totalVotos, setTotalVotos] = useState(0);
  const [cargandoRanking, setCargandoRanking] = useState(false);

  // 💡 ESTILOS DENTRO DEL COMPONENTE
  const styles = StyleSheet.create({
    topBar: { backgroundColor: theme.colors.surface, padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    cabecera: {
      flexDirection: 'row', padding: 18,
      justifyContent: 'space-between', alignItems: 'center',
    },
    estadoVot: { fontSize: 13, color: theme.colors.textMuted, textTransform: 'capitalize' },
    chevron: { fontSize: 16, color: theme.colors.textMuted },
    zonaResultados: {
      padding: 18, paddingTop: 4,
      backgroundColor: theme.colors.background, borderTopWidth: 1, borderTopColor: theme.colors.border,
    },
    fila: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
    medalla: { fontSize: 20, width: 34, textAlign: 'center', marginRight: 10 },
    filaTextos: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    nombreP: { fontSize: 15, fontWeight: '600', color: theme.colors.textDark, flex: 1, marginRight: 8 },
    puntosPrincipal: { fontSize: 14, fontWeight: 'bold', color: theme.colors.textDark },
    puntosSecundario: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
    barraFondo: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4, overflow: 'hidden' },
    barraRelleno: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
    totalVotos: {
      textAlign: 'right', marginTop: 16, fontSize: 11,
      color: theme.colors.textMuted, fontWeight: 'bold',
    },
  });

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setVotaciones(await obtenerTodasLasVotaciones());
      setCargando(false);
    };
    cargar();
  }, []);

  const toggleExpandir = async (votacion: Votacion) => {
    // Si ya estaba expandida, la colapsamos
    if (expandida === votacion.id) {
      setExpandida(null);
      return;
    }
    setExpandida(votacion.id);
    setCargandoRanking(true);

    const participantes = await obtenerParticipantes(votacion.id);

    if (votacion.metodoVotacion === 'puntuacion') {
      participantes.sort((a, b) => (b.promedioEstrellas || 0) - (a.promedioEstrellas || 0));
      setTotalVotos(10); // Referencia para la barra (escala 0–10)
    } else {
      const total = participantes.reduce((s, p) => s + p.votos, 0);
      setTotalVotos(total);
      participantes.sort((a, b) => b.votos - a.votos);
    }

    setRanking(participantes);
    setCargandoRanking(false);
  };

  const medalla = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `${i + 1}º`;

  if (cargando) {
    return (
      <View style={[globalStyles.safeArea, globalStyles.center]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={globalStyles.safeArea}>
      <View style={styles.topBar}>
        <Text style={[globalStyles.title, { marginBottom: 0 }]}>📊 Ranking y Resultados</Text>
      </View>
      <ScrollView style={globalStyles.container}>
        <Text style={[globalStyles.subtitle, { marginVertical: 16 }]}>
          Pulsa una votación para ver la clasificación en tiempo real.
        </Text>
        {votaciones.map((vot) => {
          const abierta = expandida === vot.id;
          return (
            <View key={vot.id} style={[globalStyles.card, { padding: 0, overflow: 'hidden' }]}>
              <TouchableOpacity style={styles.cabecera} onPress={() => toggleExpandir(vot)}>
                <View style={{ flex: 1 }}>
                  <Text style={[globalStyles.title, { fontSize: 18, marginBottom: 4 }]}>{vot.titulo}</Text>
                  <Text style={styles.estadoVot}>
                    {vot.estado === 'abierta' ? '🟢 En curso' : '🔴 Finalizada'}
                    {' • '}{vot.metodoVotacion}
                    {vot.visible === false ? ' • 🙈 Oculta' : ''}
                  </Text>
                </View>
                <Text style={styles.chevron}>{abierta ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {abierta && (
                <View style={styles.zonaResultados}>
                  {cargandoRanking ? (
                    <ActivityIndicator color="#000" style={{ margin: 20 }} />
                  ) : ranking.length === 0 ? (
                    <Text style={globalStyles.emptyText}>Aún no hay participantes.</Text>
                  ) : (
                    ranking.map((p, i) => {
                      let porcentaje = 0;
                      let textoPrincipal = '';
                      let textoSecundario = '';

                      if (vot.metodoVotacion === 'puntuacion') {
                        porcentaje = ((p.promedioEstrellas || 0) / 10) * 100;
                        textoPrincipal = `${p.promedioEstrellas || 0} / 10`;
                        textoSecundario = `${p.totalPuntuaciones || 0} valoraciones`;
                      } else {
                        porcentaje = totalVotos === 0 ? 0 : (p.votos / totalVotos) * 100;
                        textoPrincipal = `${p.votos} votos`;
                        textoSecundario = `${porcentaje.toFixed(1)}%`;
                      }

                      return (
                        <View key={p.id} style={styles.fila}>
                          <Text style={styles.medalla}>{medalla(i)}</Text>
                          <View style={{ flex: 1 }}>
                            <View style={styles.filaTextos}>
                              <Text style={styles.nombreP} numberOfLines={1}>{p.nombre}</Text>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.puntosPrincipal}>{textoPrincipal}</Text>
                                <Text style={styles.puntosSecundario}>{textoSecundario}</Text>
                              </View>
                            </View>
                            <View style={styles.barraFondo}>
                              <View style={[styles.barraRelleno, { width: `${porcentaje}%` }]} />
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                  {vot.metodoVotacion !== 'puntuacion' && (
                    <Text style={styles.totalVotos}>Total emitidos: {totalVotos}</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}