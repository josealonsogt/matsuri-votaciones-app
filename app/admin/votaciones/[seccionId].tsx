import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  agregarParticipante,
  crearVotacion,
  eliminarParticipante,
  eliminarVotacion,
  obtenerParticipantes,
  obtenerVotacionesPorSeccion,
} from '../../../services/adminService';
import type { MetodoVotacion, Participante, Votacion } from '../../../types';

export default function AdminVotacionesSeccionScreen() {
  const router = useRouter();
  const { seccionId } = useLocalSearchParams();

  const [votaciones, setVotaciones] = useState<Votacion[]>([]);
  const [cargando, setCargando] = useState(true);

  // Tarjeta expandida actualmente
  const [expandida, setExpandida] = useState<string | null>(null);
  const [participantesPorVotacion, setParticipantesPorVotacion] = useState<
    Record<string, Participante[]>
  >({});
  const [cargandoParticipantes, setCargandoParticipantes] = useState<Record<string, boolean>>({});

  // Formulario inline para añadir participante
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [descripcionNueva, setDescripcionNueva] = useState('');
  const [imagenNueva, setImagenNueva] = useState('');
  const [guardandoParticipante, setGuardandoParticipante] = useState(false);

  // Modal para crear nueva votación
  const [modalCrear, setModalCrear] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [metodo, setMetodo] = useState<MetodoVotacion>('unica');
  const [maxOpciones, setMaxOpciones] = useState('3');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (seccionId) cargarVotaciones();
  }, [seccionId]);

  const cargarVotaciones = async () => {
    setCargando(true);
    const data = await obtenerVotacionesPorSeccion(seccionId as string);
    setVotaciones(data);
    setCargando(false);
  };

  const toggleExpandir = async (votacionId: string) => {
    if (expandida === votacionId) {
      setExpandida(null);
      return;
    }
    setExpandida(votacionId);
    limpiarFormularioParticipante();

    if (!participantesPorVotacion[votacionId]) {
      setCargandoParticipantes((prev) => ({ ...prev, [votacionId]: true }));
      const parts = await obtenerParticipantes(votacionId);
      setParticipantesPorVotacion((prev) => ({ ...prev, [votacionId]: parts }));
      setCargandoParticipantes((prev) => ({ ...prev, [votacionId]: false }));
    }
  };

  const handleAgregarParticipante = async (votacionId: string) => {
    if (!nombreNuevo.trim()) {
      return Alert.alert('Campo obligatorio', 'El nombre del participante no puede estar vacío.');
    }

    setGuardandoParticipante(true);
    const exito = await agregarParticipante(votacionId, {
      nombre: nombreNuevo.trim(),
      descripcion: descripcionNueva.trim() || undefined,
      imagenUrl: imagenNueva.trim() || undefined,
    });
    setGuardandoParticipante(false);

    if (exito) {
      limpiarFormularioParticipante();
      // Recargar participantes de esta votación
      const parts = await obtenerParticipantes(votacionId);
      setParticipantesPorVotacion((prev) => ({ ...prev, [votacionId]: parts }));
    } else {
      Alert.alert('Error', 'No se pudo añadir el participante.');
    }
  };

  const handleEliminarParticipante = (votacionId: string, participanteId: string, nombre: string) => {
    Alert.alert(
      'Eliminar participante',
      `¿Quitar "${nombre}" de esta votación?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await eliminarParticipante(participanteId);
            const parts = await obtenerParticipantes(votacionId);
            setParticipantesPorVotacion((prev) => ({ ...prev, [votacionId]: parts }));
          },
        },
      ]
    );
  };

  const handleEliminarVotacion = (id: string, tituloVot: string) => {
    Alert.alert(
      '⚠️ Eliminar votación',
      `¿Eliminar "${tituloVot}" y todos sus participantes?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await eliminarVotacion(id);
            if (expandida === id) setExpandida(null);
            cargarVotaciones();
          },
        },
      ]
    );
  };

  const handleCrearVotacion = async () => {
    if (!titulo.trim()) return Alert.alert('Campo obligatorio', 'El título es necesario.');
    setGuardando(true);
    const exito = await crearVotacion({
      seccionId: seccionId as string,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || undefined,
      metodoVotacion: metodo,
      maxOpciones: metodo === 'multiple' ? parseInt(maxOpciones) || 3 : undefined,
    });
    setGuardando(false);

    if (exito) {
      setModalCrear(false);
      limpiarFormularioVotacion();
      cargarVotaciones();
    } else {
      Alert.alert('Error', 'No se pudo crear la votación.');
    }
  };

  const limpiarFormularioParticipante = () => {
    setNombreNuevo('');
    setDescripcionNueva('');
    setImagenNueva('');
  };

  const limpiarFormularioVotacion = () => {
    setTitulo('');
    setDescripcion('');
    setMetodo('unica');
    setMaxOpciones('3');
  };

  const etiquetaMetodo = (m: MetodoVotacion) =>
    ({ unica: 'Voto Único', multiple: 'Voto Múltiple', puntuacion: 'Puntuación 1-10' }[m]);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.btnVolver}>
          <Text style={styles.btnVolverTexto}>← Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnNuevo} onPress={() => setModalCrear(true)}>
          <Text style={styles.btnNuevoTexto}>+ Nueva Votación</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contenido} keyboardShouldPersistTaps="handled">
        {votaciones.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioTexto}>No hay votaciones en esta sección.</Text>
            <Text style={styles.vacioSubtexto}>Pulsa "+ Nueva Votación" para crear la primera.</Text>
          </View>
        ) : (
          votaciones.map((vot) => {
            const abierta = expandida === vot.id;
            const parts = participantesPorVotacion[vot.id] ?? [];
            const cargandoParts = cargandoParticipantes[vot.id] ?? false;

            return (
              <View key={vot.id} style={styles.tarjeta}>
                {/* Cabecera de la tarjeta — siempre visible */}
                <TouchableOpacity
                  style={styles.cabeceraTarjeta}
                  onPress={() => toggleExpandir(vot.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.infoCabecera}>
                    <Text style={styles.tituloVot}>{vot.titulo}</Text>
                    <View style={styles.badges}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeTexto}>{etiquetaMetodo(vot.metodoVotacion)}</Text>
                      </View>
                      <View style={[styles.badge, vot.estado === 'abierta' ? styles.badgeAbierta : styles.badgeCerrada]}>
                        <Text style={styles.badgeTexto}>
                          {vot.estado === 'abierta' ? '🟢 Abierta' : '🔴 Cerrada'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.cabeceraDerecha}>
                    <Text style={styles.contParticipantes}>
                      {parts.length} {parts.length === 1 ? 'opción' : 'opciones'}
                    </Text>
                    <Text style={styles.chevron}>{abierta ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>

                {/* Sección expandida — participantes + formulario inline */}
                {abierta && (
                  <View style={styles.expansion}>
                    {/* Lista de participantes actuales */}
                    {cargandoParts ? (
                      <ActivityIndicator color="#000" style={{ marginVertical: 12 }} />
                    ) : parts.length === 0 ? (
                      <Text style={styles.sinOpciones}>
                        Aún no hay opciones. Añade la primera abajo.
                      </Text>
                    ) : (
                      parts.map((p) => (
                        <View key={p.id} style={styles.itemParticipante}>
                          <View style={styles.infoParticipante}>
                            <Text style={styles.nombreParticipante}>{p.nombre}</Text>
                            {p.descripcion && (
                              <Text style={styles.descripcionParticipante}>{p.descripcion}</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            onPress={() => handleEliminarParticipante(vot.id, p.id, p.nombre)}
                            style={styles.btnEliminarParticipante}
                          >
                            <Text style={styles.btnEliminarParticipanteTexto}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}

                    {/* Separador */}
                    <View style={styles.separador} />

                    {/* Formulario rápido para añadir */}
                    <Text style={styles.labelFormulario}>Añadir opción / participante</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nombre *"
                      value={nombreNuevo}
                      onChangeText={setNombreNuevo}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Descripción (opcional)"
                      value={descripcionNueva}
                      onChangeText={setDescripcionNueva}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="URL de imagen (opcional)"
                      value={imagenNueva}
                      onChangeText={setImagenNueva}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.btnAnadir}
                      onPress={() => handleAgregarParticipante(vot.id)}
                      disabled={guardandoParticipante}
                    >
                      {guardandoParticipante ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.btnAnadirTexto}>+ Añadir</Text>
                      )}
                    </TouchableOpacity>

                    {/* Eliminar votación */}
                    <TouchableOpacity
                      style={styles.btnEliminarVotacion}
                      onPress={() => handleEliminarVotacion(vot.id, vot.titulo)}
                    >
                      <Text style={styles.btnEliminarVotacionTexto}>🗑 Eliminar esta votación</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal: Crear votación */}
      <Modal visible={modalCrear} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContenido}>
            <Text style={styles.modalTitulo}>Nueva Votación</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Mejor juego del año"
                value={titulo}
                onChangeText={setTitulo}
              />

              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descripción breve"
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Método de votación *</Text>
              <View style={styles.metodosContainer}>
                {(['unica', 'multiple', 'puntuacion'] as MetodoVotacion[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.btnMetodo, metodo === m && styles.btnMetodoActivo]}
                    onPress={() => setMetodo(m)}
                  >
                    <Text style={metodo === m ? styles.btnMetodoTextoActivo : styles.btnMetodoTexto}>
                      {etiquetaMetodo(m)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {metodo === 'multiple' && (
                <>
                  <Text style={styles.label}>Máximo de opciones</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="3"
                    keyboardType="numeric"
                    value={maxOpciones}
                    onChangeText={setMaxOpciones}
                  />
                </>
              )}

              <View style={styles.modalAcciones}>
                <TouchableOpacity
                  style={[styles.btnModal, styles.btnCancelar]}
                  onPress={() => { setModalCrear(false); limpiarFormularioVotacion(); }}
                  disabled={guardando}
                >
                  <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnModal, styles.btnGuardar]}
                  onPress={handleCrearVotacion}
                  disabled={guardando}
                >
                  {guardando ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.btnGuardarTexto}>Crear</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
  btnNuevo: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  btnNuevoTexto: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  contenido: { flex: 1, padding: 16 },
  vacio: {
    alignItems: 'center',
    marginTop: 60,
    padding: 30,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderStyle: 'dashed',
  },
  vacioTexto: { fontSize: 16, color: '#495057', fontWeight: '600', marginBottom: 8 },
  vacioSubtexto: { fontSize: 14, color: '#ADB5BD', textAlign: 'center' },

  // Tarjeta votación
  tarjeta: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    overflow: 'hidden',
  },
  cabeceraTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  infoCabecera: { flex: 1 },
  tituloVot: { fontSize: 16, fontWeight: 'bold', color: '#212529', marginBottom: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#000',
  },
  badgeAbierta: { backgroundColor: '#2B8A3E' },
  badgeCerrada: { backgroundColor: '#C92A2A' },
  badgeTexto: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  cabeceraDerecha: { alignItems: 'flex-end', marginLeft: 10 },
  contParticipantes: { fontSize: 12, color: '#6C757D', marginBottom: 6 },
  chevron: { fontSize: 14, color: '#6C757D' },

  // Sección expandida
  expansion: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  sinOpciones: {
    color: '#ADB5BD',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
  },
  itemParticipante: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  infoParticipante: { flex: 1 },
  nombreParticipante: { fontSize: 15, fontWeight: '600', color: '#212529' },
  descripcionParticipante: { fontSize: 13, color: '#6C757D' },
  btnEliminarParticipante: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF1F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  btnEliminarParticipanteTexto: { color: '#C92A2A', fontSize: 14, fontWeight: 'bold' },
  separador: { height: 1, backgroundColor: '#E9ECEF', marginVertical: 16 },
  labelFormulario: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C757D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  btnAnadir: {
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnAnadirTexto: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  btnEliminarVotacion: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD8D8',
    backgroundColor: '#FFF8F8',
  },
  btnEliminarVotacionTexto: { color: '#C92A2A', fontSize: 14, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContenido: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: '#212529', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#495057', marginBottom: 8 },
  textArea: { height: 80, textAlignVertical: 'top' },
  metodosContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  btnMetodo: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#DEE2E6',
    alignItems: 'center',
  },
  btnMetodoActivo: { backgroundColor: '#000', borderColor: '#000' },
  btnMetodoTexto: { color: '#6C757D', fontSize: 13, fontWeight: '600' },
  btnMetodoTextoActivo: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  modalAcciones: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnModal: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCancelar: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  btnCancelarTexto: { color: '#6C757D', fontSize: 15, fontWeight: '600' },
  btnGuardar: { backgroundColor: '#000' },
  btnGuardarTexto: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
});
