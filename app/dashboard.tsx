// ============================================================================
// 🏠 PANTALLA PRINCIPAL — app/dashboard.tsx
//
// Lo primero que ve el usuario tras registrarse. Muestra las secciones
// activas del evento cargadas en tiempo real desde Firebase.
//
// Protección de ruta: si el usuario no tiene DNI registrado, lo expulsa
// al login. Esto impide acceder a la URL directamente.
// ============================================================================

import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { obtenerSeccionesActivas } from '../services/adminService';
import { auth } from '../services/firebaseConfig';
import type { Seccion } from '../types';

export default function DashboardScreen() {
  const router = useRouter();
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [cargando, setCargando] = useState(true);

  // Protección de ruta — sin DNI no se puede ver el dashboard
  useEffect(() => {
    if (!cargandoAuth && (!usuario || !usuario.dniRegistrado)) {
      router.replace('/' as any);
    }
  }, [usuario, cargandoAuth, router]);

  // Cargamos las secciones solo cuando el usuario está confirmado
  useEffect(() => {
    if (!usuario?.dniRegistrado) return;
    const cargar = async () => {
      setCargando(true);
      const datos = await obtenerSeccionesActivas();
      setSecciones(datos);
      setCargando(false);
    };
    cargar();
  }, [usuario]);

  const cerrarSesion = async () => {
    try {
      await signOut(auth);
      router.replace('/' as any);
    } catch {
      alert('Error al cerrar sesión. Inténtalo de nuevo.');
    }
  };

  if (cargandoAuth) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!usuario?.dniRegistrado) return null;

  // Nombre de saludo: prioriza el nombre del perfil, luego el de Google, luego el email
  const nombre =
    usuario.datosUsuario?.nombre?.split(' ')[0] ||
    usuario.displayName?.split(' ')[0] ||
    usuario.email?.split('@')[0] ||
    'Votante';

  return (
    <ScrollView style={styles.container}>
      {/* ── Cabecera ── */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.saludo}>Hola, {nombre} 👋</Text>
          <Text style={styles.subtitulo}>¿Qué vas a votar hoy?</Text>
          {usuario.esAdmin && (
            <TouchableOpacity
              style={styles.btnAdmin}
              onPress={() => router.push('/admin' as any)}
            >
              <Text style={styles.textoAdmin}>⚙️ Panel de Control Admin</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.btnSalir} onPress={cerrarSesion}>
          <Text style={styles.textoSalir}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* ── Lista de secciones ── */}
      <View style={styles.cuerpo}>
        <Text style={styles.tituloLista}>Categorías del Matsuri</Text>

        {cargando ? (
          <ActivityIndicator size="large" color="#000" style={{ marginTop: 40 }} />
        ) : secciones.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioTexto}>Aún no hay votaciones activas.</Text>
            <Text style={styles.vacioSubtexto}>Disfruta del evento, las abriremos pronto.</Text>
          </View>
        ) : (
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
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 28,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: { flex: 1, paddingRight: 10 },
  saludo: { fontSize: 24, fontWeight: 'bold', color: '#212529' },
  subtitulo: { fontSize: 16, color: '#6C757D', marginTop: 4 },
  btnAdmin: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFECB5',
  },
  textoAdmin: { color: '#856404', fontWeight: 'bold', fontSize: 13 },
  btnSalir: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  textoSalir: { color: '#6C757D', fontSize: 14, fontWeight: '500' },
  cuerpo: { padding: 20 },
  tituloLista: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#212529' },
  vacio: {
    alignItems: 'center',
    marginTop: 40,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderStyle: 'dashed',
  },
  vacioTexto: { fontSize: 16, color: '#495057', fontWeight: '600' },
  vacioSubtexto: { fontSize: 14, color: '#ADB5BD', marginTop: 5, textAlign: 'center' },
  tarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tarjetaContenido: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  icono: { fontSize: 30, marginRight: 15 },
  textosTarjeta: { flex: 1, paddingRight: 10 },
  tituloTarjeta: { fontSize: 18, fontWeight: '600', color: '#212529', marginBottom: 4 },
  descripcionTarjeta: { fontSize: 13, color: '#6C757D' },
  flecha: { fontSize: 22, color: '#ADB5BD' },
});