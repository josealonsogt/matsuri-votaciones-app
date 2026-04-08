// ============================================================================
// 🛠️ PANEL ADMIN — VOTACIONES — app/admin/votaciones/[seccionId].tsx
//
// Gestión completa de las votaciones de una sección:
//   - Ver y expandir votaciones
//   - Crear, editar y eliminar votaciones
//   - Gestionar participantes (opciones)
//   - Abrir/cerrar votaciones y cambiar visibilidad
//   - Generar QR dinámico para cada votación
// ============================================================================

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useToast } from '../../../contexts/ToastContext';
import {
  actualizarEstadoVotacion,
  actualizarParticipante,
  actualizarVisibilidadVotacion,
  actualizarVotacion,
  agregarParticipante,
  crearVotacion,
  eliminarParticipante,
  eliminarVotacion,
  obtenerParticipantes,
  obtenerVotacionesPorSeccion,
} from '../../../services/adminService';
import type { MetodoVotacion, Participante, Votacion } from '../../../types';
import { confirmarAccion } from '../../../utils/alert';

// URL base de la web para los QR (ajustar al dominio real del proyecto)
const WEB_BASE_URL = 'https://votaciones-matsuri.web.app';

// ─── Skeleton de carga animado ────────────────────────────────────────────────

function SkeletonItem() {
  const opacidad = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 0.7, duration: 600, useNativeDriver: true }),
        Animated.timing(opacidad, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [opacidad]);

  return (
    <Animated.View style={[styles.tarjeta, { padding: 16, opacity: opacidad }]}>
      <View style={{ height: 18, backgroundColor: '#E9ECEF', borderRadius: 4, width: '70%', marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={{ height: 16, backgroundColor: '#E9ECEF', borderRadius: 8, width: 70 }} />
        <View style={{ height: 16, backgroundColor: '#E9ECEF', borderRadius: 8, width: 70 }} />
      </View>
    </Animated.View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function AdminVotacionesSeccionScreen() {
  const router = useRouter();
  const { seccionId } = useLocalSearchParams();
  const { showToast } = useToast();

  const [votaciones, setVotaciones] = useState<Votacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [participantesPorVotacion, setParticipantesPorVotacion] = useState<Record<string, Participante[]>>({});
  const [cargandoParticipantes, setCargandoParticipantes] = useState<Record<string, boolean>>({});

  // Formulario de participante (inline, dentro de la tarjeta expandida)
  const [participanteEditando, setParticipanteEditando] = useState<string | null>(null);
  const [nombreParticipante, setNombreParticipante] = useState('');
  const [descripcionParticipante, setDescripcionParticipante] = useState('');
  const [guardandoParticipante, setGuardandoParticipante] = useState(false);

  // Modal de votación (crear / editar)
  const [modalVotacion, setModalVotacion] = useState(false);
  const [votacionEditando, setVotacionEditando] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [metodo, setMetodo] = useState<MetodoVotacion>('unica');
  const [maxOpciones, setMaxOpciones] = useState('3');
  const [guardandoVotacion, setGuardandoVotacion] = useState(false);

  // Modal del QR
  const [qrUrl, setQrUrl] = useState('');
  const [modalQR, setModalQR] = useState(false);

  useEffect(() => {
    if (seccionId) cargarVotaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionId]);

  const cargarVotaciones = async () => {
    setCargando(true);
    const data = await obtenerVotacionesPorSeccion(seccionId as string);
    setVotaciones(data);
    setCargando(false);
  };

  // ─── Expandir / colapsar votación ─────────────────────────────────────────────

  const toggleExpandir = async (votacionId: string) => {
    if (expandida === votacionId) {
      setExpandida(null);
      return;
    }
    setExpandida(votacionId);
    limpiarFormParticipante();

    // Solo cargamos participantes si no los tenemos ya en memoria
    if (!participantesPorVotacion[votacionId]) {
      setCargandoParticipantes((prev) => ({ ...prev, [votacionId]: true }));
      const parts = await obtenerParticipantes(votacionId);
      setParticipantesPorVotacion((prev) => ({ ...prev, [votacionId]: parts }));
      setCargandoParticipantes((prev) => ({ ...prev, [votacionId]: false }));
    }
  };

  // ─── Gestión de votaciones ────────────────────────────────────────────────────

  const abrirModalVotacion = (vot?: Votacion) => {
    if (vot) {
      setVotacionEditando(vot.id);
      setTitulo(vot.titulo);
      setDescripcion(vot.descripcion || '');
      setMetodo(vot.metodoVotacion);
      setMaxOpciones(vot.maxOpciones?.toString() ?? '3');
    } else {
      setVotacionEditando(null);
      setTitulo(''); setDescripcion(''); setMetodo('unica'); setMaxOpciones('3');
    }
    setModalVotacion(true);
  };

  const handleGuardarVotacion = async () => {
    if (!titulo.trim()) return showToast('El título es necesario.', 'error');
    setGuardandoVotacion(true);

    const datos = {
      seccionId: seccionId as string,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      metodoVotacion: metodo,
      maxOpciones: metodo === 'multiple' ? parseInt(maxOpciones) || null : null,
    };

    const exito = votacionEditando
      ? await actualizarVotacion(votacionEditando, datos)
      : await crearVotacion(datos);

    setGuardandoVotacion(false);
    if (exito) {
      showToast(votacionEditando ? '✅ Votación actualizada' : '✅ Votación creada', 'success');
      setModalVotacion(false);
      cargarVotaciones();
    } else {
      showToast('❌ No se pudo guardar', 'error');
    }
  };

  const handleToggleEstado = async (vot: Votacion) => {
    const nuevo = vot.estado === 'abierta' ? 'cerrada' : 'abierta';
    const exito = await actualizarEstadoVotacion(vot.id, nuevo);
    if (exito) {
      showToast(nuevo === 'abierta' ? 'Votación abierta 🟢' : 'Votación cerrada 🔴', 'success');
      cargarVotaciones();
    }
  };

  const handleToggleVisibilidad = async (vot: Votacion) => {
    const esVisible = vot.visible !== false;
    const exito = await actualizarVisibilidadVotacion(vot.id, !esVisible);
    if (exito) {
      showToast(esVisible ? '🙈 Oculta al público' : '👁️ Visible al público', 'success');
      cargarVotaciones();
    }
  };

  const handleEliminarVotacion = (id: string, tituloVot: string) => {
    confirmarAccion(
      '⚠️ Eliminar votación',
      `¿Eliminar "${tituloVot}" y todos sus participantes?`,
      async () => {
        await eliminarVotacion(id);
        showToast('🗑️ Votación eliminada', 'success');
        if (expandida === id) setExpandida(null);
        cargarVotaciones();
      }
    );
  };

  // ─── Gestión de participantes ─────────────────────────────────────────────────

  const limpiarFormParticipante = () => {
    setParticipanteEditando(null);
    setNombreParticipante('');
    setDescripcionParticipante('');
  };

  const cargarParticipantes = async (votacionId: string) => {
    const parts = await obtenerParticipantes(votacionId);
    setParticipantesPorVotacion((prev) => ({ ...prev, [votacionId]: parts }));
  };

  const handleGuardarParticipante = async (votacionId: string) => {
    if (!nombreParticipante.trim()) return showToast('El nombre no puede estar vacío.', 'error');
    setGuardandoParticipante(true);

    const datos: {
      nombre: string;
      descripcion?: string;
    } = {
      nombre: nombreParticipante.trim(),
    };

    const descripcionLimpia = descripcionParticipante.trim();
    if (descripcionLimpia) datos.descripcion = descripcionLimpia;

    const exito = participanteEditando
      ? await actualizarParticipante(participanteEditando, datos)
      : await agregarParticipante(votacionId, datos);

    setGuardandoParticipante(false);
    if (exito) {
      showToast(participanteEditando ? '✅ Opción actualizada' : '✅ Opción añadida', 'success');
      limpiarFormParticipante();
      await cargarParticipantes(votacionId);
    } else {
      showToast('❌ Error al guardar', 'error');
    }
  };

  const handleEliminarParticipante = (votacionId: string, participanteId: string, nombre: string) => {
    confirmarAccion('Eliminar opción', `¿Quitar "${nombre}"?`, async () => {
      await eliminarParticipante(participanteId);
      showToast('🗑️ Opción eliminada', 'success');
      await cargarParticipantes(votacionId);
    });
  };

  // ─── QR ───────────────────────────────────────────────────────────────────────

  const abrirQR = (votacionId: string) => {
    setQrUrl(`${WEB_BASE_URL}/votar/${votacionId}`);
    setModalQR(true);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={[styles.btnVolver, { opacity: 0 }]} />
        </View>
        <View style={{ padding: 16 }}>
          <SkeletonItem /><SkeletonItem /><SkeletonItem />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.btnVolver} onPress={() => router.back()}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="arrow-left" size={14} color="#495057" />
            <Text style={styles.btnVolverTexto}>Atrás</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnNuevo} onPress={() => abrirModalVotacion()}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="plus" size={14} color="#FFF" />
            <Text style={styles.btnNuevoTexto}>Nueva votación</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.cuerpo} keyboardShouldPersistTaps="handled">
        {votaciones.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioTexto}>No hay votaciones en esta sección.</Text>
            <Text style={styles.vacioSubtexto}>Pulsa + Nueva Votación para crear la primera.</Text>
          </View>
        ) : (
          votaciones.map((vot) => {
            const abierta = expandida === vot.id;
            const partsCount = participantesPorVotacion[vot.id]?.length ?? 0;

            return (
              <View key={vot.id} style={styles.tarjeta}>
                {/* Cabecera de la tarjeta (siempre visible) */}
                <TouchableOpacity
                  style={styles.cabecera}
                  onPress={() => toggleExpandir(vot.id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tituloVot}>{vot.titulo}</Text>
                    <View style={styles.badges}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeTexto}>{vot.metodoVotacion}</Text>
                      </View>
                      <View style={[styles.badge, vot.estado === 'abierta' ? styles.badgeAbierta : styles.badgeCerrada]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <MaterialCommunityIcons
                            name={vot.estado === 'abierta' ? 'check-circle-outline' : 'close-circle-outline'}
                            size={11}
                            color="#FFF"
                          />
                          <Text style={styles.badgeTexto}>{vot.estado === 'abierta' ? 'Abierta' : 'Cerrada'}</Text>
                        </View>
                      </View>
                      {vot.visible === false && (
                        <View style={[styles.badge, styles.badgeGris]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Feather name="eye-off" size={10} color="#FFF" />
                            <Text style={styles.badgeTexto}>Oculta</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                    {abierta && <Text style={styles.contOpciones}>{partsCount} opciones</Text>}
                    <Text style={styles.chevron}>{abierta ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>

                {/* Panel expandido de la votación */}
                {abierta && (
                  <View style={styles.expansion}>
                    {/* Botonera de acciones */}
                    <View style={styles.botonera}>
                      <TouchableOpacity style={styles.btnAccionPeq} onPress={() => abrirModalVotacion(vot)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Feather name="edit-2" size={12} color="#495057" />
                          <Text style={styles.btnAccionPeqTexto}>Editar</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnAccionPeq} onPress={() => handleToggleEstado(vot)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Feather name={vot.estado === 'abierta' ? 'lock' : 'unlock'} size={12} color="#495057" />
                          <Text style={styles.btnAccionPeqTexto}>{vot.estado === 'abierta' ? 'Cerrar' : 'Reabrir'}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnAccionPeq} onPress={() => handleToggleVisibilidad(vot)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Feather name={vot.visible !== false ? 'eye-off' : 'eye'} size={12} color="#495057" />
                          <Text style={styles.btnAccionPeqTexto}>{vot.visible !== false ? 'Ocultar' : 'Mostrar'}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnAccionPeq} onPress={() => abrirQR(vot.id)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <MaterialCommunityIcons name="qrcode" size={12} color="#495057" />
                          <Text style={styles.btnAccionPeqTexto}>QR</Text>
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Lista de participantes */}
                    {vot.metodoVotacion === 'texto_libre' ? (
                      <View style={{ padding: 16, backgroundColor: '#F8F9FA', borderRadius: 8, marginBottom: 16 }}>
                        <Text style={{ color: '#495057', fontSize: 13, textAlign: 'center' }}>
                          Esta votación es de respuesta libre, los usuarios escribirán su propia respuesta. ¡No se necesitan opciones!
                        </Text>
                      </View>
                    ) : cargandoParticipantes[vot.id] ? (
                      <ActivityIndicator color="#000" style={{ marginVertical: 12 }} />
                    ) : (
                      (participantesPorVotacion[vot.id] ?? []).map((p) => (
                        <View key={p.id} style={styles.itemParticipante}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.nombreP}>{p.nombre}</Text>
                            {p.descripcion && (
                              <Text style={styles.descripcionP}>{p.descripcion}</Text>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              style={styles.btnIconoP}
                              onPress={() => {
                                setParticipanteEditando(p.id);
                                setNombreParticipante(p.nombre);
                                setDescripcionParticipante(p.descripcion || '');
                              }}
                            >
                              <Feather name="edit-2" size={13} color="#495057" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.btnEliminarP}
                              onPress={() => handleEliminarParticipante(vot.id, p.id, p.nombre)}
                            >
                              <Text style={styles.btnEliminarPTexto}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}

                    <View style={styles.separador} />

                    {/* Formulario para añadir/editar participante */}
                    {vot.metodoVotacion !== 'texto_libre' && (
                      <View style={[styles.formP, participanteEditando && styles.formPEditando]}>
                        <Text style={styles.labelFormP}>
                          {participanteEditando ? 'Editando opción' : 'Añadir nueva opción'}
                        </Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Nombre *"
                          value={nombreParticipante}
                          onChangeText={setNombreParticipante}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Descripción (opcional)"
                          value={descripcionParticipante}
                          onChangeText={setDescripcionParticipante}
                        />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          {participanteEditando && (
                            <TouchableOpacity
                              style={[styles.btnAnadir, { backgroundColor: '#6C757D', flex: 1 }]}
                              onPress={limpiarFormParticipante}
                            >
                              <Text style={styles.btnAnadirTexto}>Cancelar</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.btnAnadir, { flex: 2 }]}
                            onPress={() => handleGuardarParticipante(vot.id)}
                            disabled={guardandoParticipante}
                          >
                            {guardandoParticipante ? (
                              <ActivityIndicator color="#FFF" />
                            ) : (
                              <Text style={styles.btnAnadirTexto}>
                                {participanteEditando ? 'Guardar Cambios' : '+ Añadir'}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Botón peligroso al final */}
                    <TouchableOpacity
                      style={styles.btnEliminarVot}
                      onPress={() => handleEliminarVotacion(vot.id, vot.titulo)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="trash-2" size={13} color="#C92A2A" />
                        <Text style={styles.btnEliminarVotTexto}>Eliminar esta votación entera</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal: Crear / Editar Votación ── */}
      <Modal visible={modalVotacion} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContenido}>
            <Text style={styles.modalTitulo}>
              {votacionEditando ? 'Editar votación' : 'Nueva votación'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Título *</Text>
              <TextInput style={styles.input} placeholder="Ej: Mejor juego del año" value={titulo} onChangeText={setTitulo} />

              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Breve descripción"
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Método de votación *</Text>
              <View style={styles.metodosWrap}>
                {(['unica', 'multiple', 'puntuacion', 'texto_libre'] as MetodoVotacion[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.btnMetodo, metodo === m && styles.btnMetodoActivo]}
                    onPress={() => setMetodo(m)}
                  >
                    <Text style={metodo === m ? styles.btnMetodoTextoActivo : styles.btnMetodoTexto}>
                      {m}
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
                  onPress={() => setModalVotacion(false)}
                >
                  <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnModal, styles.btnGuardar]} onPress={handleGuardarVotacion}>
                  {guardandoVotacion ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.btnGuardarTexto}>
                      {votacionEditando ? 'Guardar Cambios' : 'Crear'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Código QR ── */}
      <Modal visible={modalQR} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContenido, { alignItems: 'center' }]}>
            <Text style={styles.modalTitulo}>Código QR</Text>
            <Text style={{ marginBottom: 20, textAlign: 'center', color: '#6C757D' }}>
              Escanea este código para ir directamente a votar.
            </Text>
            {/* QR generado externamente via API; sin dependencias adicionales */}
            <Image
              source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}` }}
              style={{ width: 250, height: 250, marginBottom: 20 }}
            />
            <TouchableOpacity
              style={[styles.btnModal, styles.btnGuardar, { width: '100%' }]}
              onPress={() => setModalQR(false)}
            >
              <Text style={styles.btnGuardarTexto}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E9ECEF',
  },
  btnVolver: {
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: '#F8F9FA', borderRadius: 6, borderWidth: 1, borderColor: '#DEE2E6',
  },
  btnVolverTexto: { color: '#495057', fontSize: 14, fontWeight: '600' },
  btnNuevo: { backgroundColor: '#000', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  btnNuevoTexto: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  cuerpo: { flex: 1, padding: 16 },
  vacio: {
    alignItems: 'center', marginTop: 60, padding: 30,
    backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1,
    borderColor: '#DEE2E6', borderStyle: 'dashed',
  },
  vacioTexto: { fontSize: 16, color: '#495057', fontWeight: '600', marginBottom: 8 },
  vacioSubtexto: { fontSize: 14, color: '#ADB5BD', textAlign: 'center' },
  tarjeta: {
    backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#DEE2E6', overflow: 'hidden',
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  tituloVot: { fontSize: 16, fontWeight: 'bold', color: '#212529', marginBottom: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#000' },
  badgeAbierta: { backgroundColor: '#2B8A3E' },
  badgeCerrada: { backgroundColor: '#C92A2A' },
  badgeGris: { backgroundColor: '#6C757D' },
  badgeTexto: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  contOpciones: { fontSize: 11, color: '#6C757D', marginBottom: 4 },
  chevron: { fontSize: 13, color: '#6C757D' },
  expansion: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F1F3F5' },
  botonera: { flexDirection: 'row', gap: 8, marginVertical: 14 },
  btnAccionPeq: {
    flex: 1, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#DEE2E6',
    paddingVertical: 8, borderRadius: 6, alignItems: 'center',
  },
  btnAccionPeqTexto: { fontSize: 12, fontWeight: '600', color: '#495057' },
  itemParticipante: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F3F5',
  },
  nombreP: { fontSize: 15, fontWeight: '600', color: '#212529' },
  descripcionP: { fontSize: 13, color: '#6C757D' },
  btnIconoP: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8F9FA',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E9ECEF',
  },
  btnEliminarP: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF1F0',
    justifyContent: 'center', alignItems: 'center',
  },
  btnEliminarPTexto: { color: '#C92A2A', fontSize: 14, fontWeight: 'bold' },
  separador: { height: 1, backgroundColor: '#E9ECEF', marginVertical: 14 },
  formP: {
    backgroundColor: '#F8F9FA', padding: 14, borderRadius: 8,
    marginBottom: 12, borderWidth: 1, borderColor: '#E9ECEF',
  },
  formPEditando: { backgroundColor: '#FFF3CD', borderColor: '#FFEEBA' },
  labelFormP: { fontSize: 12, fontWeight: '700', color: '#495057', textTransform: 'uppercase', marginBottom: 10 },
  input: {
    backgroundColor: '#FFF', padding: 12, borderRadius: 8,
    fontSize: 15, marginBottom: 10, borderWidth: 1, borderColor: '#DEE2E6',
  },
  btnAnadir: { backgroundColor: '#000', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnAnadirTexto: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  btnEliminarVot: {
    paddingVertical: 10, alignItems: 'center', borderRadius: 8,
    borderWidth: 1, borderColor: '#FFD8D8', backgroundColor: '#FFF8F8',
  },
  btnEliminarVotTexto: { color: '#C92A2A', fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalContenido: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 24,
    width: '100%', maxWidth: 500, maxHeight: '90%',
  },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: '#212529', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#495057', marginBottom: 8 },
  metodosWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  btnMetodo: {
    flex: 1, minWidth: 90, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#DEE2E6', alignItems: 'center',
  },
  btnMetodoActivo: { backgroundColor: '#000', borderColor: '#000' },
  btnMetodoTexto: { color: '#6C757D', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  btnMetodoTextoActivo: { color: '#FFF', fontSize: 13, fontWeight: 'bold', textTransform: 'capitalize' },
  modalAcciones: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnModal: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnCancelar: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#DEE2E6' },
  btnCancelarTexto: { color: '#6C757D', fontSize: 15, fontWeight: '600' },
  btnGuardar: { backgroundColor: '#000' },
  btnGuardarTexto: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
});