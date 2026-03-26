// ============================================================================
// 🛠️ PANEL ADMIN — SECCIONES — app/admin/index.tsx
//
// Pantalla principal del panel de administración.
// Permite al admin:
//   - Pausar o reanudar TODAS las votaciones del evento con un solo botón
//   - Crear, editar y eliminar secciones (categorías)
//   - Navegar a la gestión de votaciones de cada sección
// ============================================================================

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SECTION_ICON_OPTIONS, isSectionIconName } from '../../constants/sectionIcons';
import { useToast } from '../../contexts/ToastContext';
import {
    actualizarSeccion,
    crearSeccion,
    eliminarSeccion,
    obtenerEstadoEvento,
    obtenerSecciones,
    togglePausaEvento,
} from '../../services/adminService';
import { globalStyles } from '../../styles/globalStyles';
import type { Seccion } from '../../types';
import { confirmarAccion } from '../../utils/alert';

export default function AdminSeccionesScreen() {
  const router = useRouter();
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

  // 💡 ESTILOS DENTRO DEL COMPONENTE Y FUERA DEL FLUJO DE RENDER
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    center: { justifyContent: 'center', alignItems: 'center' },
    topBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
    btnVolver: { alignSelf: 'flex-start', paddingVertical: 6 },
    btnVolverTexto: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
    
    // Banner Premium
    banner: { 
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 20, marginHorizontal: 20, borderRadius: 16, marginBottom: 10,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
    },
    bannerActivo: { backgroundColor: '#EBFBEE' },
    bannerPausado: { backgroundColor: '#FFF5F5' },
    bannerTitulo: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
    bannerSubtitulo: { fontSize: 13, color: '#495057', lineHeight: 18 },
    btnToggle: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    btnTogglePausar: { backgroundColor: '#E03131' },
    btnToggleAbrir: { backgroundColor: '#2F9E44' },
    btnToggleTexto: { color: '#FFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  
    // Listado
    headerLista: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  
    // Tarjetas Evolucionadas
    tarjetaHeader: { flexDirection: 'row', marginBottom: 20, alignItems: 'center' },
    iconoContainer: { 
      width: 60, height: 60, borderRadius: 16, backgroundColor: '#F8F9FA', 
      justifyContent: 'center', alignItems: 'center', marginRight: 16 
    },
    iconoGrande: { fontSize: 32 },
    tarjetaInfo: { flex: 1 },
    badgeOrden: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 100, backgroundColor: '#F1F3F5' },
    badgeOrdenTexto: { color: '#495057', fontSize: 12, fontWeight: '700' },
  
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center', alignItems: 'center', padding: 20,
    },
    modalContenido: {
      backgroundColor: '#FFF', borderRadius: 12, padding: 24,
      width: '100%', maxWidth: 500, maxHeight: '90%',
    },
    modalTitulo: { fontSize: 22, fontWeight: 'bold', color: '#212529', marginBottom: 20 },
    iconosSugeridos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    btnIcono: {
      width: 50, height: 50, borderRadius: 8, backgroundColor: '#F8F9FA',
      borderWidth: 1, borderColor: '#DEE2E6', justifyContent: 'center', alignItems: 'center',
    },
    btnIconoActivo: { borderColor: '#212529', borderWidth: 2 },
    modalAcciones: { flexDirection: 'row', gap: 12, marginTop: 10 },
  });

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

    const datos: {
      nombre: string;
      orden: number;
      icono?: string;
      descripcion?: string;
    } = {
      nombre: nombre.trim(),
      orden: parseInt(orden) || 0,
    };

    const iconoLimpio = icono.trim();
    const descripcionLimpia = descripcion.trim();
    if (iconoLimpio) datos.icono = iconoLimpio;
    if (descripcionLimpia) datos.descripcion = descripcionLimpia;

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

  const renderSeccion = ({ item: sec }: { item: Seccion }) => (
    <View style={globalStyles.card}>
      <View style={styles.tarjetaHeader}>
        <View style={styles.iconoContainer}>
          {sec.icono && isSectionIconName(sec.icono) ? (
            <MaterialCommunityIcons name={sec.icono as ComponentProps<typeof MaterialCommunityIcons>['name']} size={28} color="#495057" />
          ) : sec.icono ? (
            <Text style={styles.iconoGrande}>{sec.icono}</Text>
          ) : (
            <MaterialCommunityIcons name="folder-outline" size={28} color="#495057" />
          )}
        </View>
        <View style={styles.tarjetaInfo}>
          <Text style={[globalStyles.title, { fontSize: 18, marginBottom: 4 }]}>{sec.nombre}</Text>
          {sec.descripcion && (
            <Text style={[globalStyles.subtitle, { marginBottom: 8 }]} numberOfLines={2}>
              {sec.descripcion}
            </Text>
          )}
          <View style={styles.badgeOrden}>
            <Text style={styles.badgeOrdenTexto}>Orden: {sec.orden}</Text>
          </View>
        </View>
      </View>

      <View style={globalStyles.rowBetween}>
        {/* Acción Primaria Destacada */}
        <TouchableOpacity
          style={[globalStyles.btnPrimary, { flex: 1, backgroundColor: '#E7F5FF' }]}
          onPress={() =>
            router.push({
              pathname: '/admin/votaciones/[seccionId]' as any,
              params: { seccionId: sec.id, seccionNombre: sec.nombre },
            } as any)
          }
        >
          <View style={[globalStyles.rowCenter, { gap: 6 }]}>
            <MaterialCommunityIcons name="ballot-outline" size={16} color="#1971C2" />
            <Text style={[globalStyles.btnPrimaryText, { color: '#1971C2' }]}>Ver votaciones</Text>
          </View>
        </TouchableOpacity>
        
        <View style={[globalStyles.rowCenter, { gap: 8, marginLeft: 12 }]}>
          {/* Acción Secundaria */}
          <TouchableOpacity style={[globalStyles.btnSecondary, { paddingHorizontal: 16 }]} onPress={() => abrirEditar(sec)}>
            <View style={[globalStyles.rowCenter, { gap: 6 }]}>
              <Feather name="edit-2" size={14} color="#1C1E21" />
              <Text style={globalStyles.btnSecondaryText}>Editar</Text>
            </View>
          </TouchableOpacity>
          {/* Acción Destructiva más discreta */}
          <TouchableOpacity
            style={[globalStyles.btnDanger, { paddingHorizontal: 16 }]}
            onPress={() => handleEliminar(sec.id, sec.nombre)}
          >
            <Feather name="trash-2" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={globalStyles.container}>
        {/* Botón de volver al dashboard */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.btnVolver} onPress={() => router.push('/dashboard' as any)}>
            <View style={globalStyles.rowCenter}>
              <Feather name="arrow-left" size={15} color="#007AFF" />
              <Text style={[styles.btnVolverTexto, { marginLeft: 6 }]}>Volver al Dashboard</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Banner del interruptor maestro del evento */}
        <View style={[styles.banner, eventoPausado ? styles.bannerPausado : styles.bannerActivo]}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.bannerTitulo, eventoPausado ? { color: '#C92A2A' } : { color: '#2B8A3E' }]}>
              {eventoPausado ? 'EVENTO PAUSADO' : 'EVENTO ABIERTO'}
            </Text>
            <Text style={styles.bannerSubtitulo}>
              {eventoPausado
                ? 'Las votaciones están bloqueadas para los asistentes.'
                : 'El evento transcurre con normalidad.'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.btnToggle, eventoPausado ? styles.btnToggleAbrir : styles.btnTogglePausar]}
            onPress={handleTogglePausa}
          >
            <View style={[globalStyles.rowCenter, { gap: 6 }]}>
              <Feather name={eventoPausado ? 'unlock' : 'lock'} size={13} color="#FFF" />
              <Text style={styles.btnToggleTexto}>{eventoPausado ? 'Abrir' : 'Pausar'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <FlatList
          data={secciones}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={renderSeccion}
          ListHeaderComponent={
            <View style={styles.headerLista}>
              <Text style={globalStyles.title}>Categorías / Secciones</Text>
              <TouchableOpacity style={globalStyles.btnPrimary} onPress={abrirCrear}>
                <View style={[globalStyles.rowCenter, { gap: 6 }]}>
                  <Feather name="plus" size={14} color="#FFF" />
                  <Text style={globalStyles.btnPrimaryText}>Nueva</Text>
                </View>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            !cargando ? (
              <View style={globalStyles.emptyContainer}>
                <MaterialCommunityIcons name="inbox-arrow-down-outline" size={46} color="#ADB5BD" />
                <Text style={globalStyles.emptyTitle}>No hay secciones creadas</Text>
                <Text style={globalStyles.emptyText}>Crea la primera categoría para empezar a organizar tu evento.</Text>
                <TouchableOpacity style={[globalStyles.btnPrimary, { marginTop: 20 }]} onPress={abrirCrear}>
                  <Text style={globalStyles.btnPrimaryText}>Crear mi primera sección</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />

        {/* Modal unificado para crear y editar secciones */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContenido}>
              <Text style={styles.modalTitulo}>
                {seccionEditando ? 'Editar sección' : 'Nueva sección'}
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={globalStyles.inputLabel}>Nombre *</Text>
                <TextInput
                  style={globalStyles.input}
                  placeholder="Ej: Videojuegos, J-Pop, Cosplay..."
                  value={nombre}
                  onChangeText={setNombre}
                />

                <Text style={globalStyles.inputLabel}>Icono (librería)</Text>
                <View style={styles.iconosSugeridos}>
                  {SECTION_ICON_OPTIONS.map((i) => (
                    <TouchableOpacity
                      key={i.name}
                      style={[
                        styles.btnIcono,
                        { backgroundColor: i.bg },
                        icono === i.name && styles.btnIconoActivo,
                      ]}
                      onPress={() => setIcono(i.name)}
                    >
                      <MaterialCommunityIcons name={i.name as ComponentProps<typeof MaterialCommunityIcons>['name']} size={24} color={i.color} />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[globalStyles.subtitle, { marginBottom: 12 }]}>Si no eliges uno, se usará icono por defecto.</Text>

                <Text style={globalStyles.inputLabel}>Descripción (opcional)</Text>
                <TextInput
                  style={[globalStyles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Breve descripción de la sección"
                  value={descripcion}
                  onChangeText={setDescripcion}
                  multiline
                  numberOfLines={3}
                />

                <Text style={globalStyles.inputLabel}>Orden</Text>
                <TextInput
                  style={globalStyles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={orden}
                  onChangeText={setOrden}
                />

                <View style={styles.modalAcciones}>
                  <TouchableOpacity
                    style={[globalStyles.btnSecondary, { flex: 1 }]}
                    onPress={cerrarModal}
                    disabled={guardando}
                  >
                    <Text style={globalStyles.btnSecondaryText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[globalStyles.btnPrimary, { flex: 1 }]}
                    onPress={handleGuardar}
                    disabled={guardando}
                  >
                    {guardando ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={globalStyles.btnPrimaryText}>
                        {seccionEditando ? 'Guardar' : 'Crear'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}