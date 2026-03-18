import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert, // Lo mantenemos solo para confirmaciones de borrado
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext'; // 👈 Importamos los Toasts
import {
  actualizarSeccion,
  crearSeccion,
  eliminarSeccion,
  obtenerSecciones,
} from '../../services/adminService';
import type { Seccion } from '../../types';

export default function AdminSeccionesScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
  const { showToast } = useToast(); // 👈 Activamos la magia de los Toasts
  const [eventoPausado, setEventoPausado] = useState(false);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Estados del formulario
  const [seccionEditando, setSeccionEditando] = useState<string | null>(null); // Saber si estamos creando o editando
  const [nombreSeccion, setNombreSeccion] = useState('');
  const [iconoSeccion, setIconoSeccion] = useState('');
  const [descripcionSeccion, setDescripcionSeccion] = useState('');
  const [ordenSeccion, setOrdenSeccion] = useState('0');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarSecciones();
  }, []);

  const cargarSecciones = async () => {
    setCargando(true);
    const data = await obtenerSecciones();
    setSecciones(data);
    setCargando(false);
  };

  // 📝 LÓGICA PARA ABRIR MODAL EN MODO EDICIÓN
  const abrirModalEditar = (sec: Seccion) => {
    setSeccionEditando(sec.id);
    setNombreSeccion(sec.nombre);
    setIconoSeccion(sec.icono || '');
    setDescripcionSeccion(sec.descripcion || '');
    setOrdenSeccion(sec.orden.toString());
    setModalVisible(true);
  };

  const limpiarFormulario = () => {
    setNombreSeccion('');
    setIconoSeccion('');
    setDescripcionSeccion('');
    setOrdenSeccion('0');
    setSeccionEditando(null); // Reseteamos el modo edición
  };

  const abrirModalCrear = () => {
    limpiarFormulario();
    setModalVisible(true);
  };

  const cargarSecciones = async () => {
    setCargando(true);
    const data = await obtenerSecciones();
    setSecciones(data);
    
    // 👇 AÑADE ESTO:
    import { obtenerEstadoEvento, togglePausaEvento } from '../../services/adminService'; // (Asegúrate de importar esto arriba)
    const estadoPausa = await obtenerEstadoEvento();
    setEventoPausado(estadoPausa);
    // 👆 HASTA AQUÍ
    
    setCargando(false);
  };

  // 💾 FUNCIÓN UNIFICADA (Guarda si es nueva, o Edita si ya existía)
  const handleGuardarSeccion = async () => {
    if (!nombreSeccion.trim()) {
      return showToast('El nombre de la sección es obligatorio', 'error'); // Usamos Toast
    }

    setGuardando(true);
    let exito = false;

    const datosFormulario = {
      nombre: nombreSeccion.trim(),
      icono: iconoSeccion.trim() || undefined,
      descripcion: descripcionSeccion.trim() || undefined,
      orden: parseInt(ordenSeccion) || 0,
    };

    if (seccionEditando) {
      exito = await actualizarSeccion(seccionEditando, datosFormulario);
    } else {
      exito = await crearSeccion(datosFormulario);
    }
    
    setGuardando(false);

    if (exito) {
      showToast(seccionEditando ? '✅ Sección actualizada' : '✅ Sección creada', 'success');
      setModalVisible(false);
      limpiarFormulario();
      cargarSecciones();
    } else {
      showToast('❌ Hubo un error al guardar', 'error');
    }
  };

  const handleEliminarSeccion = (id: string, nombre: string) => {
    Alert.alert(
      '⚠️ Confirmar Eliminación',
      `¿Estás seguro de eliminar "${nombre}"? Esto eliminará todas sus votaciones.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const exito = await eliminarSeccion(id);
            if (exito) {
              showToast('🗑️ Sección eliminada correctamente', 'success'); // Usamos Toast
              cargarSecciones();
            } else {
              showToast('❌ Error al eliminar la sección', 'error');
            }
          },
        },
      ]
    );
  };

  const iconosSugeridos = ['🎮', '🎵', '🎭', '🎲', '🎨', '🚗', '👗', '📚', '🎪', '🏆'];

  if (cargando) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.push('/dashboard' as any)} style={styles.btnVolver}>
          <Text style={styles.btnVolverTexto}>← Dashboard</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contenido}>
        <View style={styles.seccion}>
          <View style={styles.headerSeccion}>
            <Text style={styles.tituloSeccion}>Secciones del Evento</Text>
            <TouchableOpacity style={styles.btnNuevo} onPress={abrirModalCrear}>
              <Text style={styles.btnNuevoTexto}>+ Nueva Sección</Text>
            </TouchableOpacity>
          </View>

          {secciones.length === 0 ? (
            <View style={styles.vacio}>
              <Text style={styles.vacioTexto}>No hay secciones creadas aún.</Text>
              <Text style={styles.vacioSubtexto}>Crea la primera sección para organizar tus votaciones.</Text>
            </View>
          ) : (
            secciones.map((sec) => (
              <View key={sec.id} style={styles.tarjetaSeccion}>
                <View style={styles.contenidoSeccion}>
                  <Text style={styles.iconoGrande}>{sec.icono || '📁'}</Text>
                  <View style={styles.infoSeccion}>
                    <Text style={styles.nombreSeccion}>{sec.nombre}</Text>
                    {sec.descripcion && (
                      <Text style={styles.descripcionSeccionText}>{sec.descripcion}</Text>
                    )}
                    <View style={styles.metadatos}>
                      <View style={sec.activa ? styles.badgeActiva : styles.badgeInactiva}>
                        <Text style={styles.badgeTexto}>
                          {sec.activa ? '✅ Activa' : '⏸️ Inactiva'}
                        </Text>
                      </View>
                      <View style={styles.badgeOrden}>
                        <Text style={styles.badgeTextoOrden}>Orden: {sec.orden}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                {/* 🛠️ AHORA TENEMOS 3 BOTONES */}
                <View style={styles.accionesSeccion}>
                  <TouchableOpacity
                    style={styles.btnAccion}
                    onPress={() => router.push(`/admin/votaciones/${sec.id}` as any)}
                  >
                    <Text style={styles.btnAccionTexto}>Votaciones</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.btnAccion}
                    onPress={() => abrirModalEditar(sec)}
                  >
                    <Text style={styles.btnAccionTexto}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnAccion, styles.btnEliminar]}
                    onPress={() => handleEliminarSeccion(sec.id, sec.nombre)}
                  >
                    <Text style={styles.btnEliminarTexto}>Borrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal: Unificado para Nueva o Editar */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContenido}>
            <Text style={styles.modalTitulo}>{seccionEditando ? '✏️ Editar Sección' : '✨ Nueva Sección'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Videojuegos, J-Pop, Rolplay..."
                value={nombreSeccion}
                onChangeText={setNombreSeccion}
              />

              <Text style={styles.label}>Icono (emoji)</Text>
              <View style={styles.iconosSugeridos}>
                {iconosSugeridos.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.btnIcono, iconoSeccion === emoji && styles.btnIconoActivo]}
                    onPress={() => setIconoSeccion(emoji)}
                  >
                    <Text style={styles.emojiIcono}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="O escribe tu propio emoji"
                value={iconoSeccion}
                onChangeText={setIconoSeccion}
                maxLength={2}
              />

              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Breve descripción de la sección"
                value={descripcionSeccion}
                onChangeText={setDescripcionSeccion}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Orden (número)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={ordenSeccion}
                onChangeText={setOrdenSeccion}
              />

              <View style={styles.modalAcciones}>
                <TouchableOpacity
                  style={[styles.btnModal, styles.btnCancelar]}
                  onPress={() => {
                    setModalVisible(false);
                    limpiarFormulario();
                  }}
                  disabled={guardando}
                >
                  <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnModal, styles.btnGuardar]}
                  onPress={handleGuardarSeccion}
                  disabled={guardando}
                >
                  {guardando ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.btnGuardarTexto}>{seccionEditando ? 'Guardar Cambios' : 'Crear Sección'}</Text>
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
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  topBar: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  btnVolver: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  btnVolverTexto: { color: '#495057', fontSize: 14, fontWeight: '600' },
  contenido: { flex: 1 },
  seccion: { padding: 20 },
  headerSeccion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tituloSeccion: { fontSize: 20, fontWeight: 'bold', color: '#212529' },
  btnNuevo: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  btnNuevoTexto: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  vacio: { alignItems: 'center', marginTop: 40 },
  vacioTexto: { fontSize: 16, color: '#6C757D', fontWeight: '600' },
  vacioSubtexto: { fontSize: 14, color: '#ADB5BD', marginTop: 8, textAlign: 'center' },
  tarjetaSeccion: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  contenidoSeccion: { flexDirection: 'row', marginBottom: 15 },
  iconoGrande: { fontSize: 40, marginRight: 15 },
  infoSeccion: { flex: 1 },
  nombreSeccion: { fontSize: 18, fontWeight: 'bold', color: '#212529', marginBottom: 5 },
  descripcionSeccionText: { fontSize: 14, color: '#6C757D', marginBottom: 10 },
  metadatos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeActiva: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#2B8A3E' },
  badgeInactiva: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#6C757D' },
  badgeOrden: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#495057' },
  badgeTexto: { color: '#FFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  badgeTextoOrden: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  
  accionesSeccion: { flexDirection: 'row', gap: 10 },
  btnAccion: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    alignItems: 'center',
  },
  btnEliminar: { borderColor: '#C92A2A', backgroundColor: '#FFF1F0' },
  btnAccionTexto: { color: '#495057', fontSize: 13, fontWeight: '700' },
  btnEliminarTexto: { color: '#C92A2A', fontSize: 13, fontWeight: '700' },

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
    padding: 25,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', color: '#212529', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#495057', marginBottom: 8 },
  input: {
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  iconosSugeridos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  btnIcono: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#DEE2E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnIconoActivo: { backgroundColor: '#000', borderColor: '#000' },
  emojiIcono: { fontSize: 24 },
  modalAcciones: { flexDirection: 'row', gap: 12, marginTop: 10 },
  btnModal: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelar: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  btnCancelarTexto: { color: '#6C757D', fontSize: 16, fontWeight: '600' },
  btnGuardar: { backgroundColor: '#000' },
  btnGuardarTexto: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});