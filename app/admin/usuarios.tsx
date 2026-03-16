import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function UsuariosScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.push('/dashboard' as any)} style={styles.btnVolver}>
          <Text style={styles.btnVolverTexto}>← Dashboard</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contenido}>
        <Text style={styles.titulo}>Gestión de Usuarios</Text>
        <Text style={styles.subtitulo}>Próximamente: Lista de usuarios registrados y gestión de roles</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
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
  contenido: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#212529', marginBottom: 10 },
  subtitulo: { fontSize: 16, color: '#6C757D', textAlign: 'center' },
});
