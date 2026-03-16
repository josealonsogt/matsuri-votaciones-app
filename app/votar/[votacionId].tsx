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

  // Selección para método 'unica'
  const [seleccionUnica, setSeleccionUnica] = useState<string | null>(null);
  // Selección para método 'multiple'
  const [seleccionMultiple, setSeleccionMultiple] = useState<Set<string>>(new Set());
  // Puntuaciones para método 'puntuacion' — { participanteId: nota (1-10) }
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
    if (votacion.metodoVotacion === 'puntuacion') {
      // Debe haber puntuado al menos a un participante
      return Object.keys(puntuaciones).length > 0;
    }
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

    setEnviando(false);

    if (exito) {
      setYaVoto(true);
    } else {
      Alert.alert('Error', 'No se pudo registrar el voto. Es posible que ya hayas votado.');
    }
  };

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
        <Text style={styles.errorTexto}>Esta votación no existe.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnVolver}>
          <Text style={styles.btnVolverTexto}>← Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Pantalla de confirmación post-voto
  if (yaVoto) {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.confirmacionCard}>
          <Text style={styles.confirmacionIcono}>✅</Text>
          <Text style={styles.confirmacionTitulo}>¡Voto registrado!</Text>
          <Text style={styles.confirmacionSubtitulo}>
            Tu voto en {votacion.titulo} ha quedado guardado.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.btnVolverConfirmacion}>
            <Text style={styles.btnVolverConfirmacionTexto}>← Volver a las votaciones</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnVolver}>
          <Text style={styles.btnVolverTexto}>← Atrás</Text>
        </TouchableOpacity>
        <View style={styles.badge}>
          <Text style={styles.badgeTexto}>{etiquetaMetodo(votacion.metodoVotacion)}</Text>
        </View>
      </View>

      <ScrollView style={styles.contenido} showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>{votacion.titulo}</Text>
        {votacion.descripcion && (
          <Text style={styles.descripcion}>{votacion.descripcion}</Text>
        )}

        {/* Instrucción contextual */}
        <View style={styles.instruccionBox}>
          <Text style={styles.instruccionTexto}>
            {votacion.metodoVotacion === 'unica' && 'Elige UNA opción y confirma tu voto.'}
            {votacion.metodoVotacion === 'multiple' &&
              `Elige hasta ${votacion.maxOpciones ?? 3} opciones.`}
            {votacion.metodoVotacion === 'puntuacion' &&
              'Puntúa del 1 al 10 a los participantes que quieras. Solo se enviará una vez.'}
          </Text>
        </View>

        {/* Lista de participantes */}
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
              return (
                <TarjetaMultiple
                  key={p.id}
                  participante={p}
                  seleccionado={seleccionMultiple.has(p.id)}
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
                  onCambio={(nota) => setPuntuacion(p.id, nota)}
                />
              );
            }
            return null;
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botón flotante de confirmar */}
      <View style={styles.footerVotar}>
        <TouchableOpacity
          style={[styles.btnConfirmar, !puedeVotar() && styles.btnConfirmarDeshabilitado]}
          onPress={handleVotar}
          disabled={!puedeVotar() || enviando}
        >
          {enviando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnConfirmarTexto}>Confirmar Voto</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Subcomponentes de tarjeta ────────────────────────────────────────────────

function TarjetaUnica({
  participante,
  seleccionado,
  onPress,
}: {
  participante: Participante;
  seleccionado: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tarjeta, seleccionado && styles.tarjetaSeleccionada]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {participante.imagenUrl && (
        <Image source={{ uri: participante.imagenUrl }} style={styles.imagen} />
      )}
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

function TarjetaMultiple({
  participante,
  seleccionado,
  onPress,
}: {
  participante: Participante;
  seleccionado: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tarjeta, seleccionado && styles.tarjetaSeleccionada]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {participante.imagenUrl && (
        <Image source={{ uri: participante.imagenUrl }} style={styles.imagen} />
      )}
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

function TarjetaPuntuacion({
  participante,
  puntuacion,
  onCambio,
}: {
  participante: Participante;
  puntuacion: number;
  onCambio: (nota: number) => void;
}) {
  return (
    <View style={[styles.tarjeta, puntuacion > 0 && styles.tarjetaSeleccionada]}>
      {participante.imagenUrl && (
        <Image source={{ uri: participante.imagenUrl }} style={styles.imagen} />
      )}
      <View style={styles.infoParticipantePuntuacion}>
        <Text style={[styles.nombreParticipante, puntuacion > 0 && styles.nombreSeleccionado]}>
          {participante.nombre}
        </Text>
        {participante.descripcion && (
          <Text style={styles.descripcionParticipante}>{participante.descripcion}</Text>
        )}
        {/* Selector de nota 1-10 */}
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

// ─── Helper ───────────────────────────────────────────────────────────────────

function etiquetaMetodo(metodo: string): string {
  const map: Record<string, string> = {
    unica: 'Voto Único',
    multiple: 'Voto Múltiple',
    puntuacion: 'Puntuación 1-10',
  };
  return map[metodo] || metodo;
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 30 },
  errorTexto: { fontSize: 16, color: '#6C757D', marginBottom: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  btnVolver: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  btnVolverTexto: { color: '#495057', fontSize: 14, fontWeight: '600' },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  badgeTexto: { color: '#FFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  contenido: { flex: 1, padding: 20 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#212529', marginBottom: 8 },
  descripcion: { fontSize: 15, color: '#6C757D', marginBottom: 16 },

  instruccionBox: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#000',
  },
  instruccionTexto: { fontSize: 14, color: '#495057', fontWeight: '500' },

  listaParticipantes: { gap: 12 },

  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DEE2E6',
  },
  tarjetaSeleccionada: {
    borderColor: '#000',
    backgroundColor: '#FAFAFA',
  },
  imagen: { width: 56, height: 56, borderRadius: 8, marginRight: 14, backgroundColor: '#E9ECEF' },
  infoParticipante: { flex: 1 },
  infoParticipantePuntuacion: { flex: 1 },
  nombreParticipante: { fontSize: 16, fontWeight: '600', color: '#495057' },
  nombreSeleccionado: { color: '#000' },
  descripcionParticipante: { fontSize: 13, color: '#ADB5BD', marginTop: 3 },

  // Radio (unica)
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DEE2E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  radioSeleccionado: { borderColor: '#000' },
  radioPunto: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#000' },

  // Checkbox (multiple)
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#DEE2E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkboxSeleccionado: { backgroundColor: '#000', borderColor: '#000' },
  checkmark: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },

  // Puntuación
  notasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  btnNota: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#DEE2E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnNotaActivo: { backgroundColor: '#000', borderColor: '#000' },
  btnNotaTexto: { fontSize: 13, fontWeight: '600', color: '#6C757D' },
  btnNotaTextoActivo: { color: '#FFF' },
  notaElegida: { fontSize: 13, color: '#2B8A3E', fontWeight: '600', marginTop: 8 },

  // Footer fijo
  footerVotar: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  btnConfirmar: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnConfirmarDeshabilitado: { backgroundColor: '#ADB5BD' },
  btnConfirmarTexto: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },

  // Confirmación
  confirmacionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DEE2E6',
    width: '100%',
    maxWidth: 380,
  },
  confirmacionIcono: { fontSize: 64, marginBottom: 20 },
  confirmacionTitulo: { fontSize: 26, fontWeight: 'bold', color: '#212529', marginBottom: 10 },
  confirmacionSubtitulo: {
    fontSize: 15,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 30,
  },
  btnVolverConfirmacion: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  btnVolverConfirmacionTexto: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
