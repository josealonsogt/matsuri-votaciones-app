import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { obtenerParticipantes, obtenerTodasLasVotaciones } from '../../services/adminService';
import type { Participante, Votacion } from '../../types';

export default function ResultadosScreen() {
  const router = useRouter();
  const [votaciones, setVotaciones] = useState<Votacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [votacionExpandida, setVotacionExpandida] = useState<string | null>(null);
  const [ranking, setRanking] = useState<Participante[]>([]);
  const [totalVotos, setTotalVotos] = useState(0);
  const [cargandoRanking, setCargandoRanking] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      const datos = await obtenerTodasLasVotaciones();
      setVotaciones(datos);
      setCargando(false);
    };
    cargarDatos();
  }, []);

  const calcularResultados = async (votacion: Votacion) => {
    if (votacionExpandida === votacion.id) {
      setVotacionExpandida(null);
      return;
    }
    setVotacionExpandida(votacion.id);
    setCargandoRanking(true);

    const participantesBrutos = await obtenerParticipantes(votacion.id);

    if (votacion.metodoVotacion === 'puntuacion') {
      participantesBrutos.sort((a, b) => (b.promedioEstrellas || 0) - (a.promedioEstrellas || 0));
      setTotalVotos(10); 
    } else {
      const total = participantesBrutos.reduce((sum, p) => sum + p.votos, 0);
      setTotalVotos(total);
      participantesBrutos.sort((a, b) => b.votos - a.votos);
    }

    setRanking(participantesBrutos);
    setCargandoRanking(false);
  };

  const obtenerMedalla = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}º`;
  };

  if (cargando) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color="#000" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}><Text style={styles.titulo}>📊 Ranking y Resultados</Text></View>
      <ScrollView style={styles.contenido}>
        <Text style={styles.instrucciones}>Selecciona una votación para ver cómo va la clasificación en tiempo real.</Text>
        {votaciones.map((votacion) => {
          const estaExpandida = votacionExpandida === votacion.id;
          return (
            <View key={votacion.id} style={styles.tarjeta}>
              <TouchableOpacity style={styles.cabeceraTarjeta} onPress={() => calcularResultados(votacion)}>
                <View style={styles.infoTarjeta}>
                  <Text style={styles.tituloVotacion}>{votacion.titulo}</Text>
                  <Text style={styles.estadoVotacion}>
                    {votacion.estado === 'abierta' ? '🟢 En curso' : '🔴 Finalizada'} • {votacion.metodoVotacion}
                    {votacion.visible === false ? ' • 🙈 Oculta' : ''}
                  </Text>
                </View>
                <Text style={styles.flecha}>{estaExpandida ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {estaExpandida && (
                <View style={styles.zonaResultados}>
                  {cargandoRanking ? (
                    <ActivityIndicator color="#000" style={{ margin: 20 }} />
                  ) : ranking.length === 0 ? (
                    <Text style={styles.textoVacio}>Aún no hay participantes en esta categoría.</Text>
                  ) : (
                    ranking.map((participante, index) => {
                      let porcentaje = 0;
                      let textoPuntuacion = '';
                      let textoSecundario = ''; // 👈 Nuevo: para decir cuántos votos tiene

                      if (votacion.metodoVotacion === 'puntuacion') {
                        porcentaje = ((participante.promedioEstrellas || 0) / 10) * 100;
                        textoPuntuacion = `${participante.promedioEstrellas || 0} / 10`;
                        textoSecundario = `${participante.totalPuntuaciones || 0} valoraciones`;
                      } else {
                        porcentaje = totalVotos === 0 ? 0 : (participante.votos / totalVotos) * 100;
                        textoPuntuacion = `${participante.votos} votos`;
                        textoSecundario = `${porcentaje.toFixed(1)}%`;
                      }

                      return (
                        <View key={participante.id} style={styles.filaRanking}>
                          <Text style={styles.medalla}>{obtenerMedalla(index)}</Text>
                          <View style={styles.infoParticipante}>
                            <View style={styles.nombresYPuntos}>
                              <Text style={styles.nombreParticipante} numberOfLines={1}>{participante.nombre}</Text>
                              <View style={{alignItems: 'flex-end'}}>
                                <Text style={styles.puntosParticipante}>{textoPuntuacion}</Text>
                                <Text style={styles.textoSecundarioPuntos}>{textoSecundario}</Text>
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
                  {votacion.metodoVotacion !== 'puntuacion' && (
                     <Text style={styles.totalVotosFinal}>Total de votos emitidos: {totalVotos}</Text>
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
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#212529' },
  contenido: { padding: 20 },
  instrucciones: { fontSize: 15, color: '#6C757D', marginBottom: 20 },
  tarjeta: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#DEE2E6', overflow: 'hidden' },
  cabeceraTarjeta: { flexDirection: 'row', padding: 20, justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF' },
  infoTarjeta: { flex: 1 },
  tituloVotacion: { fontSize: 18, fontWeight: 'bold', color: '#212529', marginBottom: 4 },
  estadoVotacion: { fontSize: 13, color: '#6C757D', textTransform: 'capitalize' },
  flecha: { fontSize: 18, color: '#ADB5BD' },
  zonaResultados: { padding: 20, paddingTop: 0, backgroundColor: '#FAFAFA', borderTopWidth: 1, borderTopColor: '#F1F3F5' },
  textoVacio: { textAlign: 'center', color: '#ADB5BD', marginTop: 20 },
  filaRanking: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  medalla: { fontSize: 22, width: 35, textAlign: 'center', marginRight: 10, fontWeight: 'bold', color: '#495057' },
  infoParticipante: { flex: 1 },
  nombresYPuntos: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  nombreParticipante: { fontSize: 15, fontWeight: '600', color: '#212529', flex: 1, marginRight: 10 },
  puntosParticipante: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  textoSecundarioPuntos: { fontSize: 11, color: '#6C757D', marginTop: 2 }, // 👈 Estilo para los subtitulos de votos
  barraFondo: { height: 8, backgroundColor: '#E9ECEF', borderRadius: 4, overflow: 'hidden' },
  barraRelleno: { height: '100%', backgroundColor: '#000', borderRadius: 4 },
  totalVotosFinal: { textAlign: 'right', marginTop: 20, fontSize: 12, color: '#ADB5BD', fontWeight: 'bold' }
});