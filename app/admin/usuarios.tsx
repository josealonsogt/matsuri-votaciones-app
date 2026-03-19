// ============================================================================
// 👥 ADMIN — USUARIOS — app/admin/usuarios.tsx
// ============================================================================

import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { obtenerTodosLosUsuarios } from '../../services/adminService';

export default function UsuariosScreen() {
  const [usuarios, setUsuarios] = useState<Record<string, unknown>[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setUsuarios(await obtenerTodosLosUsuarios());
      setCargando(false);
    };
    cargar();
  }, []);

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
        <Text style={styles.titulo}>👥 Usuarios registrados</Text>
        <Text style={styles.subtitulo}>Total: {usuarios.length}</Text>
      </View>
      <ScrollView style={styles.cuerpo}>
        {usuarios.map((u, i) => (
          <View key={String(u.id ?? i)} style={styles.tarjeta}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetra}>
                {u.nombre ? String(u.nombre).charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>
                {String(u.nombre || 'Sin nombre')} {u.rol === 'admin' ? '👑' : ''}
              </Text>
              <Text style={styles.email}>{String(u.email || '')}</Text>
              <Text style={styles.dni}>DNI: {String(u.dni || '—')}</Text>
            </View>
            <View style={styles.rolBadge}>
              <Text style={styles.rolTexto}>{u.rol === 'admin' ? 'ADMIN' : 'USUARIO'}</Text>
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { justifyContent: 'center', alignItems: 'center' },
  topBar: { backgroundColor: '#FFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E9ECEF' },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#212529' },
  subtitulo: { fontSize: 13, color: '#6C757D', marginTop: 4, fontWeight: '600' },
  cuerpo: { padding: 16 },
  tarjeta: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#DEE2E6',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#E9ECEF',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  avatarLetra: { fontSize: 18, fontWeight: 'bold', color: '#495057' },
  nombre: { fontSize: 15, fontWeight: 'bold', color: '#212529' },
  email: { fontSize: 13, color: '#6C757D', marginTop: 2 },
  dni: { fontSize: 12, color: '#ADB5BD', marginTop: 2, fontFamily: 'monospace' },
  rolBadge: {
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8,
    backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#DEE2E6',
  },
  rolTexto: { fontSize: 10, fontWeight: 'bold', color: '#495057' },
});