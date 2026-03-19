import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { obtenerVotacionesPorSeccion } from '../../services/adminService';
import type { Votacion } from '../../types';

export default function VotacionesSeccionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  
  
  // 🛡️ PARCHE A PRUEBA DE BALAS: Buscamos el ID se llame como se llame
  const idReal = (params.id || params.seccionId) as string;

  const [votaciones, setVotaciones] = useState<Votacion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Solo busca si de verdad ha encontrado el ID en la URL
    if (idReal) {
      const cargarVotaciones = async () => {
        setCargando(true);
        const data = await obtenerVotacionesPorSeccion(idReal);
        setVotaciones(data);
        setCargando(false);
      };
      cargarVotaciones();
    }
  }, [idReal]);

  const obtenerEtiquetaMetodo = (metodo: string): string => {
    const etiquetas: Record<string, string> = { unica: 'Voto Único', multiple: 'Voto Múltiple', puntuacion: 'Puntuación 1-10' };
    return etiquetas[metodo] || metodo;
  };

  if (!idReal || cargando) {
    return <View style={[styles.container, styles.centerContent]}><ActivityIndicator size="large" color="#000" /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnVolver}><Text style={styles.btnVolverTexto}>← Atrás</Text></TouchableOpacity>
      </View>

      <View style={styles.contenido}>
        <Text style={styles.titulo}>Votaciones Disponibles</Text>

        {votaciones.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioTexto}>No hay votaciones en esta sección</Text>
            <Text style={styles.vacioSubtexto}>Vuelve más tarde para ver si hay novedades</Text>
          </View>
        ) : (
         votaciones
        .filter((votacion) => votacion.visible !== false) 
        .map((votacion) => (
            <TouchableOpacity
              key={votacion.id}
              style={[styles.tarjetaVotacion, votacion.estado === 'cerrada' && styles.tarjetaCerrada]}
              onPress={() => router.push(`/votar/${votacion.id}` as any)}
              
            >
              <View style={styles.infoVotacion}>
                <Text style={styles.tituloVotacion}>{votacion.titulo}</Text>
                {votacion.descripcion && <Text style={styles.descripcionVotacion}>{votacion.descripcion}</Text>}

                <View style={styles.metadatos}>
                  <View style={styles.badge}><Text style={styles.badgeTexto}>{obtenerEtiquetaMetodo(votacion.metodoVotacion)}</Text></View>
                  {votacion.metodoVotacion === 'multiple' && votacion.maxOpciones && (
                    <View style={[styles.badge, styles.badgeSecundario]}><Text style={styles.badgeTextoSecundario}>Máx: {votacion.maxOpciones}</Text></View>
                  )}
                  <View style={[styles.badge, votacion.estado === 'abierta' ? styles.badgeAbierta : styles.badgeCerrada]}>
                    <Text style={styles.badgeTexto}>{votacion.estado === 'abierta' ? '🟢 Abierta' : '🔴 Cerrada'}</Text>
                  </View>
                </View>
              </View>
              {votacion.estado === 'abierta' && <Text style={styles.flecha}>→</Text>}
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E9ECEF' },
  btnVolver: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F8F9FA', borderRadius: 6, borderWidth: 1, borderColor: '#DEE2E6' },
  btnVolverTexto: { color: '#495057', fontSize: 14, fontWeight: '600' },
  contenido: { padding: 20 },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#212529', marginBottom: 20 },
  vacio: { alignItems: 'center', marginTop: 60, padding: 30, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#DEE2E6', borderStyle: 'dashed' },
  vacioTexto: { fontSize: 16, color: '#495057', fontWeight: '600', marginBottom: 8 },
  vacioSubtexto: { fontSize: 14, color: '#ADB5BD', textAlign: 'center' },
  tarjetaVotacion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#DEE2E6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tarjetaCerrada: { opacity: 0.6, backgroundColor: '#F8F9FA' },
  infoVotacion: { flex: 1 },
  tituloVotacion: { fontSize: 18, fontWeight: 'bold', color: '#212529', marginBottom: 5 },
  descripcionVotacion: { fontSize: 14, color: '#6C757D', marginBottom: 10 },
  metadatos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#000' },
  badgeSecundario: { backgroundColor: '#6C757D' },
  badgeAbierta: { backgroundColor: '#2B8A3E' },
  badgeCerrada: { backgroundColor: '#C92A2A' },
  badgeTexto: { color: '#FFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  badgeTextoSecundario: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  flecha: { fontSize: 24, color: '#ADB5BD', marginLeft: 10 },
});