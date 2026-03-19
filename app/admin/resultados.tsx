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
import type { Participante, Votacion } from '../../types';

export default function ResultadosScreen() {
  const [votaciones, setVotaciones] = useState<Votacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [ranking, setRanking] = useState<Participante[]>([]);
  const [totalVotos, setTotalVotos] = useState(0);
  const [cargandoRanking, setCargandoRanking] = useState(false);

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
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.titulo}>📊 Ranking y Resultados</Text>
      </View>
      <ScrollView style={styles.cuerpo}>
        <Text style={styles.instruccion}>
          Pulsa una votación para ver la clasificación en tiempo real.
        </Text>
        {votaciones.map((vot) => {
          const abierta = expandida === vot.id;
          return (
            <View key={vot.id} style={styles.tarjeta}>
              <TouchableOpacity style={styles.cabecera} onPress={() => toggleExpandir(vot)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tituloVot}>{vot.titulo}</Text>
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
                    <Text style={styles.textoVacio}>Aún no hay participantes.</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { justifyContent: 'center', alignItems: 'center' },
  topBar: { backgroundColor: '#FFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E9ECEF' },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#212529' },
  cuerpo: { padding: 16 },
  instruccion: { fontSize: 14, color: '#6C757D', marginBottom: 16 },
  tarjeta: {
    backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#DEE2E6', overflow: 'hidden',
  },
  cabecera: {
    flexDirection: 'row', padding: 18,
    justifyContent: 'space-between', alignItems: 'center',
  },
  tituloVot: { fontSize: 17, fontWeight: 'bold', color: '#212529', marginBottom: 4 },
  estadoVot: { fontSize: 13, color: '#6C757D', textTransform: 'capitalize' },
  chevron: { fontSize: 16, color: '#ADB5BD' },
  zonaResultados: {
    padding: 18, paddingTop: 4,
    backgroundColor: '#FAFAFA', borderTopWidth: 1, borderTopColor: '#F1F3F5',
  },
  textoVacio: { textAlign: 'center', color: '#ADB5BD', marginTop: 16, marginBottom: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  medalla: { fontSize: 20, width: 34, textAlign: 'center', marginRight: 10 },
  filaTextos: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  nombreP: { fontSize: 15, fontWeight: '600', color: '#212529', flex: 1, marginRight: 8 },
  puntosPrincipal: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  puntosSecundario: { fontSize: 11, color: '#6C757D', marginTop: 2 },
  barraFondo: { height: 8, backgroundColor: '#E9ECEF', borderRadius: 4, overflow: 'hidden' },
  barraRelleno: { height: '100%', backgroundColor: '#000', borderRadius: 4 },
  totalVotos: {
    textAlign: 'right', marginTop: 16, fontSize: 11,
    color: '#ADB5BD', fontWeight: 'bold',
  },
});