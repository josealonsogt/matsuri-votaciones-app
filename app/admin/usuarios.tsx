import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { obtenerTodosLosUsuarios } from '../../services/adminService';

export default function UsuariosScreen() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarUsuarios = async () => {
      setCargando(true);
      const datos = await obtenerTodosLosUsuarios();
      setUsuarios(datos);
      setCargando(false);
    };
    cargarUsuarios();
  }, []);

  if (cargando) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color="#000" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.titulo}>👥 Gestión de Usuarios</Text>
        <Text style={styles.subtitulo}>Total registrados: {usuarios.length}</Text>
      </View>

      <ScrollView style={styles.contenido}>
        {usuarios.map((user, index) => (
          <View key={user.id || index} style={styles.tarjetaUsuario}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{user.nombre ? user.nombre.charAt(0).toUpperCase() : '?'}</Text>
            </View>
            
            <View style={styles.info}>
              <Text style={styles.nombre}>
                {user.nombre || 'Sin nombre'} {user.rol === 'admin' ? '👑' : ''}
              </Text>
              <Text style={styles.email}>{user.email}</Text>
              <Text style={styles.dni}>DNI: {user.dni}</Text>
            </View>

            <View style={styles.rolBadge}>
              <Text style={styles.rolTexto}>{user.rol === 'admin' ? 'ADMIN' : 'USUARIO'}</Text>
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
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#212529' },
  subtitulo: { fontSize: 14, color: '#6C757D', marginTop: 5, fontWeight: '600' },
  contenido: { padding: 20 },
  
  tarjetaUsuario: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', 
    padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#DEE2E6' 
  },
  avatar: { 
    width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#E9ECEF', 
    justifyContent: 'center', alignItems: 'center', marginRight: 15 
  },
  avatarTexto: { fontSize: 18, fontWeight: 'bold', color: '#495057' },
  info: { flex: 1 },
  nombre: { fontSize: 16, fontWeight: 'bold', color: '#212529' },
  email: { fontSize: 13, color: '#6C757D', marginTop: 2 },
  dni: { fontSize: 12, color: '#ADB5BD', marginTop: 2, fontFamily: 'monospace' },
  
  rolBadge: { 
    backgroundColor: '#F8F9FA', paddingVertical: 4, paddingHorizontal: 8, 
    borderRadius: 8, borderWidth: 1, borderColor: '#DEE2E6' 
  },
  rolTexto: { fontSize: 10, fontWeight: 'bold', color: '#495057' }
});