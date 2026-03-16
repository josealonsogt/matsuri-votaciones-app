import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { obtenerSeccionesActivas } from '../services/adminService'; // 👈 Importamos la función que lee de Firebase
import { auth } from '../services/firebaseConfig';
import type { Seccion } from '../types';

export default function DashboardScreen() {
  const router = useRouter();
  const { usuario, cargando: cargandoAuth } = useAuth();
  
  // 📦 Estados para guardar la información real de Firebase
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [cargandoSecciones, setCargandoSecciones] = useState(true);

  // 🔒 1. PROTECCIÓN DE RUTA
  useEffect(() => {
    if (!cargandoAuth && (!usuario || !usuario.dniRegistrado)) {
      router.replace('/' as any);
    }
  }, [usuario, cargandoAuth, router]);

  // 📡 2. CARGAR DATOS DE FIREBASE
  useEffect(() => {
    const cargarDatos = async () => {
      // Solo cargamos si el usuario ya está verificado
      if (usuario && usuario.dniRegistrado) {
        setCargandoSecciones(true);
        const datos = await obtenerSeccionesActivas(); // Llama a Firebase
        setSecciones(datos); // Guarda los datos en la memoria de la pantalla
        setCargandoSecciones(false);
      }
    };
    
    cargarDatos();
  }, [usuario]); // Se ejecuta cuando el usuario entra a la pantalla

  // 🚪 3. CERRAR SESIÓN
  const cerrarSesion = async () => {
    try {
      await signOut(auth);
      router.replace('/' as any);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      alert('Error al cerrar sesión');
    }
  };

  // ⏳ Pantalla de carga mientras comprueba quién eres
  if (cargandoAuth) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // Si no hay usuario, no renderiza nada (el useEffect de arriba lo expulsará)
  if (!usuario || !usuario.dniRegistrado) return null;

  return (
    <ScrollView style={styles.container}>
      {/* --- CABECERA --- */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.saludo}>
            Hola, {
              usuario.datosUsuario?.nombre?.split(' ')[0] ||
              usuario.displayName?.split(' ')[0] ||
              usuario.email?.split('@')[0] ||
              'Votante'
            } 👋
          </Text>
          <Text style={styles.subtitulo}>¿Qué vas a votar hoy?</Text>
          
          {/* 👑 BOTÓN SECRETO PARA EL ADMIN */}
          {usuario.esAdmin && (
            <TouchableOpacity onPress={() => router.push('/admin' as any)} style={styles.btnAdmin}>
              <Text style={styles.textoAdmin}>⚙️ Panel de Control Admin</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity onPress={cerrarSesion} style={styles.btnCerrarSesion}>
          <Text style={styles.textoCerrarSesion}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* --- LISTA DE SECCIONES REALES --- */}
      <View style={styles.lista}>
        <Text style={styles.tituloSeccion}>Categorías del Matsuri</Text>
        
        {cargandoSecciones ? (
          <ActivityIndicator size="large" color="#000" style={{ marginTop: 40 }} />
        ) : secciones.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioTexto}>Aún no hay votaciones activas.</Text>
            <Text style={styles.vacioSubtexto}>Disfruta del evento, las abriremos pronto.</Text>
          </View>
        ) : (
          // Dibujamos una tarjeta por cada sección que haya en la base de datos
          secciones.map((seccion) => (
            <TouchableOpacity
              key={seccion.id}
              style={styles.tarjeta}
              onPress={() => router.push(`/votaciones/${seccion.id}` as any)} 
            >
              <View style={styles.tarjetaContenido}>
                <Text style={styles.icono}>{seccion.icono || '📌'}</Text>
                <View style={styles.textosTarjeta}>
                  <Text style={styles.tituloTarjeta}>{seccion.nombre}</Text>
                  {seccion.descripcion && (
                    <Text style={styles.descripcionTarjeta}>{seccion.descripcion}</Text>
                  )}
                </View>
              </View>
              <Text style={styles.flecha}>→</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    padding: 30,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  headerInfo: { flex: 1, paddingRight: 10 },
  saludo: { fontSize: 24, fontWeight: 'bold', color: '#212529' },
  subtitulo: { fontSize: 16, color: '#6C757D', marginTop: 5 },
  btnAdmin: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#FFF3CD', borderRadius: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#FFECB5' },
  textoAdmin: { color: '#856404', fontWeight: 'bold', fontSize: 13 },
  btnCerrarSesion: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F8F9FA', borderRadius: 4, borderWidth: 1, borderColor: '#DEE2E6' },
  textoCerrarSesion: { color: '#6C757D', fontSize: 14, fontWeight: '500' },
  
  lista: { padding: 20 },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#212529' },
  
  vacio: { alignItems: 'center', marginTop: 40, padding: 20, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#DEE2E6', borderStyle: 'dashed' },
  vacioTexto: { fontSize: 16, color: '#495057', fontWeight: '600' },
  vacioSubtexto: { fontSize: 14, color: '#ADB5BD', marginTop: 5, textAlign: 'center' },
  
  tarjeta: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 15,
    borderWidth: 1, borderColor: '#DEE2E6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  tarjetaContenido: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  icono: { fontSize: 30, marginRight: 15 },
  textosTarjeta: { flex: 1, paddingRight: 10 },
  tituloTarjeta: { fontSize: 18, fontWeight: '600', color: '#212529', marginBottom: 4 },
  descripcionTarjeta: { fontSize: 13, color: '#6C757D' },
  flecha: { fontSize: 24, color: '#ADB5BD' }
});