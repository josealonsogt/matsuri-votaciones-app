// ============================================================================
// 🛠️ PANEL ADMIN — SECCIONES — app/admin/index.tsx
//
// Pantalla principal del panel de administración.
// Permite al admin:
//   - Pausar o reanudar TODAS las votaciones del evento con un solo botón
//   - Crear, editar y eliminar secciones (categorías)
//   - Navegar a la gestión de votaciones de cada sección
// ============================================================================

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  actualizarSeccion,
  crearSeccion,
  eliminarSeccion,
  obtenerEstadoEvento,
  obtenerSecciones,
  togglePausaEvento,
} from '../../services/adminService';
import type { Seccion } from '../../types';
import { confirmarAccion } from '../../utils/alert';

const ICONOS_SUGERIDOS = ['🎮', '🎵', '🎭', '🎲', '🎨', '🚗', '👗', '📚', '🎪', '🏆'];

export default function AdminSeccionesScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
  const { showToast } = useToast();

  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [eventoPausado, setEventoPausado] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Campos del formulario de sección
  const [seccionEditando, setSeccionEditando] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [orden, setOrden] = useState('0');

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setCargando(true);
    const [dataSecciones, pausado] = await Promise.all([
      obtenerSecciones(),
      obtenerEstadoEvento(),
    ]);
    setSecciones(dataSecciones);
    setEventoPausado(pausado);
    setCargando(false);
  };

  // ─── Control del Evento ───────────────────────────────────────────────────────

  const handleTogglePausa = async () => {
    const nuevoEstado = !eventoPausado;
    setEventoPausado(nuevoEstado); // Cambio visual inmediato (optimistic update)
    const exito = await togglePausaEvento(nuevoEstado);
    if (exito) {
      showToast(nuevoEstado ? '🛑 Evento PAUSADO' : '✅ Evento ABIERTO', nuevoEstado ? 'error' : 'success');
    } else {
      setEventoPausado(!nuevoEstado); // Revertimos si Firebase falló
      showToast('❌ Error al cambiar estado', 'error');
    }
  };

  // ─── Formulario de Sección ────────────────────────────────────────────────────

  const abrirCrear = () => {
    setSeccionEditando(null);
    setNombre(''); setIcono(''); setDescripcion(''); setOrden('0');
    setModalVisible(true);
  };

  const abrirEditar = (sec: Seccion) => {
    setSeccionEditando(sec.id);
    setNombre(sec.nombre);
    setIcono(sec.icono || '');
    setDescripcion(sec.descripcion || '');
    setOrden(sec.orden.toString());
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setSeccionEditando(null);
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) return showToast('El nombre es obligatorio.', 'error');
    setGuardando(true);

    const datos = {
      nombre: nombre.trim(),
      icono: icono.trim() || undefined,
      descripcion: descripcion.trim() || undefined,
      orden: parseInt(orden) || 0,
    };

    const exito = seccionEditando
      ? await actualizarSeccion(seccionEditando, datos)
      : await crearSeccion(datos);

    setGuardando(false);

    if (exito) {
      showToast(seccionEditando ? '✅ Sección actualizada' : '✅ Sección creada', 'success');
      cerrarModal();
      cargar();
    } else {
      showToast('❌ Error al guardar', 'error');
    }
  };

  const handleEliminar = (id: string, nombreSec: string) => {
    confirmarAccion(
      '⚠️ Eliminar sección',
      `¿Eliminar "${nombreSec}"? Se borrarán todas sus votaciones.`,
      async () => {
        const exito = await eliminarSeccion(id);
        if (exito) {
          showToast('🗑️ Sección eliminada', 'success');
          cargar();
        } else {
          showToast('❌ Error al eliminar', 'error');
        }
      }
    );
  };

  if (cargando) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Botón de volver al dashboard */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.btnVolver} onPress={() => router.push('/dashboard' as any)}>
          <Text style={styles.btnVolverTexto}>← Dashboard</Text>
        </TouchableOpacity>
      </View>

      {/* Banner del interruptor maestro del evento */}
      <View style={[styles.banner, eventoPausado ? styles.bannerPausado : styles.bannerActivo]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.bannerTitulo}>
            {eventoPausado ? '🛑 EVENTO PAUSADO' : '🟢 EVENTO ABIERTO'}
          </Text>
          <Text style={styles.bannerSubtitulo}>
            {eventoPausado
              ? 'Nadie puede votar en ninguna categoría ahora mismo.'
              : 'Los usuarios pueden votar normalmente.'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.btnToggle, eventoPausado ? styles.btnToggleAbrir : styles.btnTogglePausar]}
          onPress={handleTogglePausa}
        >
          <Text style={styles.btnToggleTexto}>
            {eventoPausado ? '🔓 Abrir' : '🔒 Pausar'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.cuerpo}>
        <View style={styles.headerLista}>
          <Text style={styles.tituloLista}>Secciones del Evento</Text>
          <TouchableOpacity style={styles.btnNuevo} onPress={abrirCrear}>
            <Text style={styles.btnNuevoTexto}>+ Nueva Sección</Text>
          </TouchableOpacity>
        </View>

        {secciones.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioTexto}>No hay secciones todavía.</Text>
            <Text style={styles.vacioSubtexto}>Crea la primera sección para empezar.</Text>
          </View>
        ) : (
          secciones.map((sec) => (
            <View key={sec.id} style={styles.tarjeta}>
              <View style={styles.tarjetaContenido}>
                <Text style={styles.iconoGrande}>{sec.icono || '📁'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nombreSeccion}>{sec.nombre}</Text>
                  {sec.descripcion && (
                    <Text style={styles.descripcionSeccion}>{sec.descripcion}</Text>
                  )}
                  <View style={styles.badgeOrdenWrap}>
                    <View style={styles.badgeOrden}>
                      <Text style={styles.badgeOrdenTexto}>Orden: {sec.orden}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.acciones}>
                <TouchableOpacity
                  style={styles.btnAccion}
                  onPress={() => router.push(`/admin/votaciones/${sec.id}` as any)}
                >
                  <Text style={styles.btnAccionTexto}>Votaciones</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnAccion} onPress={() => abrirEditar(sec)}>
                  <Text style={styles.btnAccionTexto}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnAccion, styles.btnEliminar]}
                  onPress={() => handleEliminar(sec.id, sec.nombre)}
                >
                  <Text style={styles.btnEliminarTexto}>Borrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal unificado para crear y editar secciones */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContenido}>
            <Text style={styles.modalTitulo}>
              {seccionEditando ? '✏️ Editar Sección' : '✨ Nueva Sección'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Videojuegos, J-Pop, Cosplay..."
                value={nombre}
                onChangeText={setNombre}
              />

              <Text style={styles.label}>Icono (emoji)</Text>
              <View style={styles.iconosSugeridos}>
                {ICONOS_SUGERIDOS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.btnIcono, icono === e && styles.btnIconoActivo]}
                    onPress={() => setIcono(e)}
                  >
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="O escribe tu propio emoji"
                value={icono}
                onChangeText={setIcono}
                maxLength={2}
              />

              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Breve descripción de la sección"
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Orden</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={orden}
                onChangeText={setOrden}
              />

              <View style={styles.modalAcciones}>
                <TouchableOpacity
                  style={[styles.btnModal, styles.btnCancelar]}
                  onPress={cerrarModal}
                  disabled={guardando}
                >
                  <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnModal, styles.btnGuardar]}
                  onPress={handleGuardar}
                  disabled={guardando}
                >
                  {guardando ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.btnGuardarTexto}>
                      {seccionEditando ? 'Guardar Cambios' : 'Crear Sección'}
                    </Text>
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
  topBar: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 15 },
  btnVolver: {
    alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: '#F8F9FA', borderRadius: 6, borderWidth: 1, borderColor: '#DEE2E6',
  },
  btnVolverTexto: { color: '#495057', fontSize: 14, fontWeight: '600' },
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  bannerActivo: { backgroundColor: '#EBFBEE', borderBottomColor: '#B2F2BB' },
  bannerPausado: { backgroundColor: '#FFF5F5', borderBottomColor: '#FFC9C9' },
  bannerTitulo: { fontSize: 15, fontWeight: 'bold', color: '#212529', marginBottom: 3 },
  bannerSubtitulo: { fontSize: 13, color: '#495057' },
  btnToggle: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  btnTogglePausar: { backgroundColor: '#C92A2A' },
  btnToggleAbrir: { backgroundColor: '#2B8A3E' },
  btnToggleTexto: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  cuerpo: { flex: 1 },
  headerLista: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingBottom: 10,
  },
  tituloLista: { fontSize: 20, fontWeight: 'bold', color: '#212529' },
  btnNuevo: { backgroundColor: '#000', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  btnNuevoTexto: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  vacio: { alignItems: 'center', marginTop: 40, padding: 20 },
  vacioTexto: { fontSize: 16, color: '#6C757D', fontWeight: '600' },
  vacioSubtexto: { fontSize: 14, color: '#ADB5BD', marginTop: 8, textAlign: 'center' },
  tarjeta: {
    backgroundColor: '#FFF', marginHorizontal: 20, marginBottom: 14,
    borderRadius: 12, borderWidth: 1, borderColor: '#DEE2E6', padding: 18,
  },
  tarjetaContenido: { flexDirection: 'row', marginBottom: 14 },
  iconoGrande: { fontSize: 38, marginRight: 14 },
  nombreSeccion: { fontSize: 17, fontWeight: 'bold', color: '#212529', marginBottom: 4 },
  descripcionSeccion: { fontSize: 14, color: '#6C757D', marginBottom: 8 },
  badgeOrdenWrap: { flexDirection: 'row' },
  badgeOrden: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#495057' },
  badgeOrdenTexto: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  acciones: { flexDirection: 'row', gap: 10 },
  btnAccion: {
    flex: 1, backgroundColor: '#F8F9FA', paddingVertical: 11,
    borderRadius: 8, borderWidth: 1, borderColor: '#DEE2E6', alignItems: 'center',
  },
  btnEliminar: { borderColor: '#C92A2A', backgroundColor: '#FFF1F0' },
  btnAccionTexto: { color: '#495057', fontSize: 13, fontWeight: '700' },
  btnEliminarTexto: { color: '#C92A2A', fontSize: 13, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalContenido: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 24,
    width: '100%', maxWidth: 500, maxHeight: '90%',
  },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', color: '#212529', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#495057', marginBottom: 8 },
  input: {
    backgroundColor: '#F8F9FA', padding: 14, borderRadius: 8,
    fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#DEE2E6',
  },
  iconosSugeridos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  btnIcono: {
    width: 50, height: 50, borderRadius: 8, backgroundColor: '#F8F9FA',
    borderWidth: 1, borderColor: '#DEE2E6', justifyContent: 'center', alignItems: 'center',
  },
  btnIconoActivo: { backgroundColor: '#000', borderColor: '#000' },
  modalAcciones: { flexDirection: 'row', gap: 12, marginTop: 10 },
  btnModal: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnCancelar: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#DEE2E6' },
  btnCancelarTexto: { color: '#6C757D', fontSize: 15, fontWeight: '600' },
  btnGuardar: { backgroundColor: '#000' },
  btnGuardarTexto: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
});