// ============================================================================
// 👥 ADMIN — USUARIOS — app/admin/usuarios.tsx
// ============================================================================

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { obtenerTodosLosUsuarios } from '../../services/adminService';
// 💡 CORRECCIÓN 1: Usamos la ruta relativa igual que en el _layout.tsx
import { theme } from '../../styles/theme';

export default function UsuariosScreen() {
  const [usuarios, setUsuarios] = useState<Record<string, unknown>[]>([]);
  const [cargando, setCargando] = useState(true);

  // 💡 CORRECCIÓN 2: Movemos los estilos dentro del componente
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    topBar: { backgroundColor: theme.colors.surface, padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    titulo: { fontSize: 22, fontWeight: 'bold', color: theme.colors.textDark },
    subtitulo: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4, fontWeight: '600' },
    cuerpo: { padding: 16 },
    tarjeta: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
      padding: 14, borderRadius: theme.borderRadius.md, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border,
    },
    avatar: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.background,
      justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    avatarLetra: { fontSize: 18, fontWeight: 'bold', color: theme.colors.textDark },
    nombre: { fontSize: 15, fontWeight: 'bold', color: theme.colors.textDark },
    email: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
    dni: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    rolBadge: {
      paddingVertical: 4, paddingHorizontal: 8, borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border,
    },
    rolTexto: { fontSize: 10, fontWeight: 'bold', color: theme.colors.textDark },
  });

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="account-group-outline" size={22} color={theme.colors.textDark} />
          <Text style={styles.titulo}>Usuarios registrados</Text>
        </View>
        <Text style={styles.subtitulo}>Total: {usuarios.length}</Text>
      </View>
      <ScrollView style={styles.cuerpo}>
        {usuarios.map((u, i) => (
          <View key={String(u.id ?? i)} style={styles.tarjeta}>
            <View style={styles.avatar}>
              {u.nombre ? (
                <Text style={styles.avatarLetra}>{String(u.nombre).charAt(0).toUpperCase()}</Text>
              ) : (
                <Feather name="user" size={16} color={theme.colors.textMuted} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>
                {String(u.nombre || 'Sin nombre')}
              </Text>
              <Text style={styles.email}>{String(u.email || '')}</Text>
              <Text style={styles.dni}>DNI: {String(u.dni || '—')}</Text>
            </View>
            <View style={styles.rolBadge}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {u.rol === 'admin' ? (
                  <MaterialCommunityIcons name="shield-crown-outline" size={12} color={theme.colors.textDark} />
                ) : (
                  <Feather name="shield" size={11} color={theme.colors.textDark} />
                )}
                <Text style={styles.rolTexto}>{u.rol === 'admin' ? 'ADMIN' : 'USUARIO'}</Text>
              </View>
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}