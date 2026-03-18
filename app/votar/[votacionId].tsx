import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  obtenerParticipantesVotacion,
  obtenerVotacion,
  registrarVoto,
  verificarVotoExistente,
} from '../../services/votacionesService';
import type { Participante, Votacion } from '../../types';

export default function VotarScreen() {
  const router = useRouter();
  const { votacionId } = useLocalSearchParams();
  const { usuario } = useAuth();

  const [votacion, setVotacion] = useState<Votacion | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [yaVoto, setYaVoto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Estados de selección
  const [seleccionUnica, setSeleccionUnica] = useState<string | null>(null);
  const [seleccionMultiple, setSeleccionMultiple] = useState<Set<string>>(new Set());
  const [puntuaciones, setPuntuaciones] = useState<Record<string, number>>({});

  useEffect(() => {
    if (votacionId && usuario) {
      cargarDatos();
    }
  }, [votacionId, usuario]);

  const cargarDatos = async () => {
    setCargando(true);
    const [votacionData, participantesData, votoExiste] = await Promise.all([
      obtenerVotacion(votacionId as string),
      obtenerParticipantesVotacion(votacionId as string),
      verificarVotoExistente(usuario!.uid, votacionId as string),
    ]);
    setVotacion(votacionData);
    setParticipantes(participantesData);
    setYaVoto(votoExiste);
    setCargando(false);
  };

  const toggleMultiple = (id: string) => {
    const nueva = new Set(seleccionMultiple);
    if (nueva.has(id)) {
      nueva.delete(id);
    } else {
      const max = votacion?.maxOpciones ?? 3;
      if (nueva.size >= max) {
        Alert.alert('Límite alcanzado', `Solo puedes elegir hasta ${max} opciones.`);
        return;
      }
      nueva.add(id);
    }
    setSeleccionMultiple(nueva);
  };

  const setPuntuacion = (participanteId: string, nota: number) => {
    setPuntuaciones((prev) => ({ ...prev, [participanteId]: nota }));
  };

  const puedeVotar = (): boolean => {
    if (!votacion) return false;
    if (votacion.metodoVotacion === 'unica') return seleccionUnica !== null;
    if (votacion.metodoVotacion === 'multiple') return seleccionMultiple.size > 0;
    if (votacion.metodoVotacion === 'puntuacion') return Object.keys(puntuaciones).length > 0;
    return false;
  };

  const handleVotar = async () => {
    if (!puedeVotar() || !usuario || !votacion) return;

    setEnviando(true);

    let participantesIds: string[] = [];
    let puntuacionesEnviar: Record<string, number> | undefined;

    if (votacion.metodoVotacion === 'unica') {
      participantesIds = [seleccionUnica!];
    } else if (votacion.metodoVotacion === 'multiple') {
      participantesIds = Array.from(seleccionMultiple);
    } else if (votacion.metodoVotacion === 'puntuacion') {
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
      // Si el voto fue un éxito, volvemos a descargar los datos para tener los resultados reales
      const participantesActualizados = await obtenerParticipantesVotacion(votacion.id);
      setParticipantes(participantesActualizados);
      setYaVoto(true);
    } else {
      Alert.alert('Error', 'No se pudo registrar el voto. Es posible que ya hayas votado.');
    }
    setEnviando(false);
  };

  // --------------------------------------------------------------------------
  // LÓGICA DE RENDERIZADO
  // --------------------------------------------------------------------------

  if (cargando) {
    return (
      <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color="#000" /></View>
    );
  }

  if (!votacion) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorTexto}>Esta votación no existe.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnVolver}><Text style={styles.btnVolverTexto}>← Volver</Text></TouchableOpacity>
      </View>
    );
  }

  // --- PANTALLA DE RESULTADOS (Si ya votó o está cerrada) ---
  if (yaVoto || votacion.estado === 'cerrada') {
    // Calculamos el ranking en tiempo real
    const ranking = [...participantes];
    let totalVotos = 0;

    if (votacion.metodoVotacion === 'puntuacion') {
      ranking.sort((a, b) => (b.promedioEstrellas || 0) - (a.promedioEstrellas || 0));
      totalVotos = 10;
    } else {
      totalVotos = ranking.reduce((sum, p) => sum + p.votos, 0);
      ranking.sort((a, b) => b.votos - a.votos);
    }

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.btnVolver}><Text style={styles.btnVolverTexto}>← Atrás</Text></TouchableOpacity>
          <View style={[styles.badge, styles.badgeCerrada]}><Text style={styles.badgeTexto}>{votacion.estado === 'cerrada' ? 'FINALIZADA' : 'YA VOTASTE'}</Text></View>
        </View>

        <ScrollView style={styles.contenido} showsVerticalScrollIndicator={false}>
          <Text style={styles.titulo}>{votacion.titulo} - Ranking</Text>
          <Text style={styles.descripcion}>Así van los resultados en directo.</Text>

          <View style={styles.zonaResultados}>
            {ranking.map((p, index) => {
              let porcentaje = 0;
              let textoPuntuacion = '';

              if (votacion.metodoVotacion === 'puntuacion') {
                porcentaje = ((p.promedioEstrellas || 0) / 10) * 100;
                textoPuntuacion = `${p.promedioEstrellas || 0}/10`;
              } else {
                porcentaje = totalVotos === 0 ? 0 : (p.votos / totalVotos) * 100;
                textoPuntuacion = `${p.votos} votos (${porcentaje.toFixed(1)}%)`;
              }

              const esGanador = index === 0 && (p.votos > 0 || (p.promedioEstrellas || 0) > 0);

              return (
                <View key={p.id} style={styles.filaRanking}>
                  <Text style={styles.medalla}>{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}</Text>
                  
                  {p.imagenUrl && <Image source={{ uri: p.imagenUrl }} style={styles.imagenMin} />}
                  
                  <View style={styles.infoRankingBox}>
                    <View style={styles.rankingTextoTop}>
                      <Text style={[styles.nombreRanking, esGanador && styles.nombreGanador]} numberOfLines={1}>{p.nombre}</Text>
                      <Text style={styles.puntosRanking}>{textoPuntuacion}</Text>
                    </View>
                    <View style={styles.barraFondo}>
                      <View style={[styles.barraRelleno, { width: `${porcentaje}%` }, esGanador && styles.barraRellenoGanador]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  // --- PANTALLA PARA VOTAR (Si aún no ha votado) ---
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnVolver}><Text style={styles.btnVolverTexto}>← Atrás</Text></TouchableOpacity>
        <View style={styles.badge}><Text style={styles.badgeTexto}>{votacion.metodoVotacion}</Text></View>
      </View>

      <ScrollView style={styles.contenido} showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>{votacion.titulo}</Text>
        {votacion.descripcion && <Text style={styles.descripcion}>{votacion.descripcion}</Text>}

        <View style={styles.instruccionBox}>
          <Text style={styles.instruccionTexto}>
            {votacion.metodoVotacion === 'unica' && 'Elige UNA opción para descubrir el ranking en directo.'}
            {votacion.metodoVotacion === 'multiple' && `Elige hasta ${votacion.maxOpciones ?? 3} opciones.`}
            {votacion.metodoVotacion === 'puntuacion' && 'Puntúa del 1 al 10 a los participantes. Se enviará una única vez.'}
          </Text>
        </View>

        <View style={styles.listaParticipantes}>
          {participantes.map((p) => {
            if (votacion.metodoVotacion === 'unica') return <TarjetaUnica key={p.id} participante={p} seleccionado={seleccionUnica === p.id} onPress={() => setSeleccionUnica(p.id)} />;
            if (votacion.metodoVotacion === 'multiple') return <TarjetaMultiple key={p.id} participante={p} seleccionado={seleccionMultiple.has(p.id)} onPress={() => toggleMultiple(p.id)} />;
            if (votacion.metodoVotacion === 'puntuacion') return <TarjetaPuntuacion key={p.id} participante={p} puntuacion={puntuaciones[p.id] ?? 0} onCambio={(nota) => setPuntuacion(p.id, nota)} />;
            return null;
          })}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footerVotar}>
        <TouchableOpacity style={[styles.btnConfirmar, !puedeVotar() && styles.btnConfirmarDeshabilitado]} onPress={handleVotar} disabled={!puedeVotar() || enviando}>
          {enviando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnConfirmarTexto}>Votar y Ver Resultados</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// COMPONENTES DE LAS TARJETAS (Intactos)
// -----------------------------------------------------------------------------

function TarjetaUnica({ participante, seleccionado, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.tarjeta, seleccionado && styles.tarjetaSeleccionada]} onPress={onPress} activeOpacity={0.8}>
      {participante.imagenUrl && <Image source={{ uri: participante.imagenUrl }} style={styles.imagen} />}
      <View style={styles.infoParticipante}>
        <Text style={[styles.nombreParticipante, seleccionado && styles.nombreSeleccionado]}>{participante.nombre}</Text>
        {participante.descripcion && <Text style={styles.descripcionParticipante}>{participante.descripcion}</Text>}
      </View>
      <View style={[styles.radio, seleccionado && styles.radioSeleccionado]}>{seleccionado && <View style={styles.radioPunto} />}</View>
    </TouchableOpacity>
  );
}

function TarjetaMultiple({ participante, seleccionado, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.tarjeta, seleccionado && styles.tarjetaSeleccionada]} onPress={onPress} activeOpacity={0.8}>
      {participante.imagenUrl && <Image source={{ uri: participante.imagenUrl }} style={styles.imagen} />}
      <View style={styles.infoParticipante}>
        <Text style={[styles.nombreParticipante, seleccionado && styles.nombreSeleccionado]}>{participante.nombre}</Text>
        {participante.descripcion && <Text style={styles.descripcionParticipante}>{participante.descripcion}</Text>}
      </View>
      <View style={[styles.checkbox, seleccionado && styles.checkboxSeleccionado]}>{seleccionado && <Text style={styles.checkmark}>✓</Text>}</View>
    </TouchableOpacity>
  );
}

function TarjetaPuntuacion({ participante, puntuacion, onCambio }: any) {
  return (
    <View style={[styles.tarjeta, puntuacion > 0 && styles.tarjetaSeleccionada]}>
      {participante.imagenUrl && <Image source={{ uri: participante.imagenUrl }} style={styles.imagen} />}
      <View style={styles.infoParticipante}>
        <Text style={[styles.nombreParticipante, puntuacion > 0 && styles.nombreSeleccionado]}>{participante.nombre}</Text>
        {participante.descripcion && <Text style={styles.descripcionParticipante}>{participante.descripcion}</Text>}
        <View style={styles.notasContainer}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((nota) => (
            <TouchableOpacity key={nota} style={[styles.btnNota, puntuacion === nota && styles.btnNotaActivo]} onPress={() => onCambio(nota)}>
              <Text style={[styles.btnNotaTexto, puntuacion === nota && styles.btnNotaTextoActivo]}>{nota}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {puntuacion > 0 && <Text style={styles.notaElegida}>Tu puntuación: {puntuacion}/10</Text>}
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// ESTILOS UNIFICADOS
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 30 },
  errorTexto: { fontSize: 16, color: '#6C757D', marginBottom: 20 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E9ECEF' },
  btnVolver: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F8F9FA', borderRadius: 6, borderWidth: 1, borderColor: '#DEE2E6' },
  btnVolverTexto: { color: '#495057', fontSize: 14, fontWeight: '600' },
  badge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#000' },
  badgeCerrada: { backgroundColor: '#6C757D' },
  badgeTexto: { color: '#FFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  contenido: { flex: 1, padding: 20 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#212529', marginBottom: 8 },
  descripcion: { fontSize: 15, color: '#6C757D', marginBottom: 16 },

  instruccionBox: { backgroundColor: '#FFF', padding: 14, borderRadius: 8, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#000' },
  instruccionTexto: { fontSize: 14, color: '#495057', fontWeight: '500' },

  listaParticipantes: { gap: 12 },

  // Tarjetas para votar
  tarjeta: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#DEE2E6' },
  tarjetaSeleccionada: { borderColor: '#000', backgroundColor: '#FAFAFA' },
  imagen: { width: 56, height: 56, borderRadius: 8, marginRight: 14, backgroundColor: '#E9ECEF' },
  infoParticipante: { flex: 1 },
  nombreParticipante: { fontSize: 16, fontWeight: '600', color: '#495057' },
  nombreSeleccionado: { color: '#000' },
  descripcionParticipante: { fontSize: 13, color: '#ADB5BD', marginTop: 3 },

  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#DEE2E6', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  radioSeleccionado: { borderColor: '#000' },
  radioPunto: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#000' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#DEE2E6', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  checkboxSeleccionado: { backgroundColor: '#000', borderColor: '#000' },
  checkmark: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },

  notasContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  btnNota: { width: 34, height: 34, borderRadius: 6, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#DEE2E6', justifyContent: 'center', alignItems: 'center' },
  btnNotaActivo: { backgroundColor: '#000', borderColor: '#000' },
  btnNotaTexto: { fontSize: 13, fontWeight: '600', color: '#6C757D' },
  btnNotaTextoActivo: { color: '#FFF' },
  notaElegida: { fontSize: 13, color: '#2B8A3E', fontWeight: '600', marginTop: 8 },

  footerVotar: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E9ECEF' },
  btnConfirmar: { backgroundColor: '#000', paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  btnConfirmarDeshabilitado: { backgroundColor: '#ADB5BD' },
  btnConfirmarTexto: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },

  // Estilos del Ranking/Resultados
  zonaResultados: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#DEE2E6', marginTop: 10 },
  filaRanking: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  medalla: { fontSize: 24, width: 35, textAlign: 'center', marginRight: 10 },
  imagenMin: { width: 40, height: 40, borderRadius: 6, marginRight: 12, backgroundColor: '#E9ECEF' },
  infoRankingBox: { flex: 1 },
  rankingTextoTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  nombreRanking: { fontSize: 15, fontWeight: '600', color: '#495057', flex: 1, marginRight: 10 },
  nombreGanador: { color: '#000', fontWeight: 'bold' },
  puntosRanking: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  barraFondo: { height: 8, backgroundColor: '#E9ECEF', borderRadius: 4, overflow: 'hidden' },
  barraRelleno: { height: '100%', backgroundColor: '#6C757D', borderRadius: 4 },
  barraRellenoGanador: { backgroundColor: '#F59E0B' } // Naranja/Dorado para el primero
});