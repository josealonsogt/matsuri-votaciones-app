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
// 💡 CORRECCIÓN 1: Ruta relativa correcta (ya que dashboard.tsx está en /app)
import { theme } from '../styles/theme';


export default function DashboardScreen() {
  const router = useRouter();
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [cargando, setCargando] = useState(true);

  // 💡 CORRECCIÓN 2: Movemos los estilos dentro de la función del componente
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: {
      padding: 30,
      backgroundColor: theme.colors.surface,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      ...theme.shadows.soft,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      marginBottom: 20,
    },
    headerInfo: { flex: 1, paddingRight: 10 },
    saludo: { fontSize: 26, fontWeight: '800', color: theme.colors.textDark },
    subtitulo: { fontSize: 16, color: theme.colors.textMuted, marginTop: 6 },
    btnAdmin: { marginTop: 15, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: theme.colors.textDark, borderRadius: theme.borderRadius.md, alignSelf: 'flex-start' },
    textoAdmin: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
    btnSalir: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md },
    textoSalir: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '700' },
    cuerpo: { paddingHorizontal: 20, paddingBottom: 40 },
    tituloLista: { fontSize: 20, fontWeight: '800', marginBottom: 16, color: theme.colors.textDark },
    vacio: { alignItems: 'center', marginTop: 40, padding: 30, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed' },
    vacioTexto: { fontSize: 16, color: theme.colors.textDark, fontWeight: '700' },
    vacioSubtexto: { fontSize: 14, color: theme.colors.textMuted, marginTop: 6, textAlign: 'center' },
    tarjeta: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: theme.colors.surface, padding: 20, borderRadius: theme.borderRadius.lg, marginBottom: 16,
      ...theme.shadows.soft,
    },
    tarjetaContenido: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    icono: { fontSize: 34, marginRight: 16 },
    textosTarjeta: { flex: 1, paddingRight: 10 },
    tituloTarjeta: { fontSize: 18, fontWeight: '700', color: theme.colors.textDark, marginBottom: 4 },
    descripcionTarjeta: { fontSize: 14, color: theme.colors.textMuted, lineHeight: 20 },
    flecha: { fontSize: 20, color: theme.colors.border, fontWeight: 'bold' },
  });

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