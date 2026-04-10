import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

//  ARCHIVO DE CONFIGURACIÓN CENTRAL (El cerebro del diseño)
import { TorneoConfig } from "../../config/torneoConfig";
import { accederTorneo } from "../../services/authService";

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  
  // 💾ESTADOS DEL FORMULARIO
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [dni, setDni] = useState("");
  const [cargando, setCargando] = useState(false);

  // 👉 ESTADOS DE PROTECCIÓN DE DATOS
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [modalPrivacidad, setModalPrivacidad] = useState(false);

  //  FUNCIÓN PRINCIPAL: MANEJO DEL LOGIN
  const manejarAcceso = async () => {
    // 0. Bloqueo por Privacidad
    if (!aceptaPrivacidad) {
      if (Platform.OS === "web") window.alert("⚠️ PROTECCIÓN DE DATOS\n\nDebes aceptar la Política de Privacidad para poder inscribirte en el torneo.");
      else Alert.alert("⚠️ Protección de Datos", "Debes aceptar la Política de Privacidad para poder inscribirte en el torneo.");
      return;
    }

    // 1. Validación de campos vacíos
    if (!nombre || !correo || !dni) {
      if (Platform.OS === "web") window.alert("⚠️ DATOS INCOMPLETOS\n\nPor favor, completa todos los campos para continuar con tu inscripción.");
      else Alert.alert("⚠️ DATOS INCOMPLETOS", "Por favor, completa todos los campos para continuar con tu inscripción.");
      return;
    }

    // 2. Puerta trasera para el Administrador
    if (correo.trim().toLowerCase() === "admin@torneo.com" && dni.trim().toLowerCase() === "admin") {
      navigation.replace("AdminScreen");
      return;
    }

    // 3. Inicio del proceso de registro/acceso en base de datos
    setCargando(true);
    const resultado = await accederTorneo(nombre, correo, dni);
    setCargando(false);

    // 4. Manejo de errores (ej. Torneo cerrado)
    if (resultado.error) {
      if (Platform.OS === "web") window.alert("⛔ ACCESO DENEGADO\n" + resultado.error);
      else Alert.alert("Acceso Denegado 🔒", resultado.error);
      return;
    }

    // 5. Acceso exitoso
    if (resultado.id) {
      // Si es su primera vez, le mostramos un ticket de bienvenida
      if (resultado.esNuevo && resultado.carreraAsignada) {
        const mensaje = `🏁 ¡BIENVENIDO AL TORNEO!\n\nPiloto: ${nombre.toUpperCase()}\nCarrera: ${resultado.carreraAsignada.nombre}\nNúmero: ${resultado.carreraAsignada.numero}\n\nTu sitio está reservado. ¡Nos vemos en pista!`;
        
        if (Platform.OS === "web") {
          window.alert(mensaje);
        } else {
          Alert.alert("✅ REGISTRO CONFIRMADO", mensaje, [
            { text: "IR A MI BOX", onPress: () => navigation.replace("HomeScreen", { jugadorId: resultado.id }) }
          ]);
          return;
        }
      }
      // Si no es nuevo, entra directo a su Box
      navigation.replace("HomeScreen", { jugadorId: resultado.id });
    } else {
      // Fallo de conexión o error crítico
      if (Platform.OS === "web") window.alert("❌ ERROR DE CONEXIÓN\n\nNo hemos podido conectar con el servidor. Por favor, verifica tu conexión a internet e inténtalo de nuevo.");
      else Alert.alert("❌ ERROR DE CONEXIÓN", "No hemos podido conectar con el servidor. Por favor, verifica tu conexión a internet e inténtalo de nuevo.");
    }
  };

  // Componente de Casilla de Privacidad
  const CheckboxPrivacidad = () => (
    <View style={styles.checkboxContainer}>
      <TouchableOpacity 
        style={[styles.checkbox, aceptaPrivacidad && styles.checkboxMarcado]} 
        onPress={() => setAceptaPrivacidad(!aceptaPrivacidad)}
        activeOpacity={0.8}
      >
        {aceptaPrivacidad && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
      </TouchableOpacity>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', marginLeft: 12 }}>
        <Text style={styles.textoCheckbox}>He leído y acepto la </Text>
        <TouchableOpacity onPress={() => setModalPrivacidad(true)}>
          <Text style={styles.linkPrivacidad}>Política de Privacidad</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    // ⌨️ KeyboardAvoidingView: Evita que el teclado tape el formulario en móviles
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      
      {/* FONDO DE LA APP */}
      <LinearGradient
        colors={TorneoConfig.colores.fondoGradiente as any}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.fondoDegradado}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 1. LOGO SUPERIOR (El escudo del Torneo) */}
          <View style={styles.logoContainerTop}>
            <Image 
              source={require('../../assets/Logo Kaizo Sim blanco.png')} 
              style={styles.logoEscudo} 
              resizeMode="contain" 
            />
          </View>

          {/* 2. TARJETA PRINCIPAL (Efecto Glassmorphism) */}
          <View style={styles.card}>
            
            {/* --- CABECERA DE LA TARJETA --- */}
            <View style={styles.headerCard}>
              <Text style={styles.tituloCard}>{TorneoConfig.nombreLargo}</Text>
              <Image source={require('../../assets/Recurso 5recursos.png')} style={styles.lineaSeparadora} resizeMode="cover"/>
              <Text style={styles.subtitulo}>{TorneoConfig.subtitulo}</Text>
            </View>
            
            <Text style={styles.instrucciones}>Introduce tus datos para acceder al torneo y ver tu parrilla de salida.</Text>

            {/* --- FORMULARIO DE ACCESO --- */}
            <View style={styles.form}>
              <Text style={styles.label}>NOMBRE EN PISTA</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ej: Fernando Alonso" 
                placeholderTextColor="rgba(255,255,255,0.3)" 
                value={nombre} 
                onChangeText={setNombre} 
              />
              
              <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
              <TextInput 
                style={styles.input} 
                placeholder="piloto@email.com" 
                placeholderTextColor="rgba(255,255,255,0.3)" 
                keyboardType="email-address" 
                autoCapitalize="none" 
                value={correo} 
                onChangeText={setCorreo} 
              />
              
              <Text style={styles.label}>DNI / IDENTIFICACIÓN</Text>
              <TextInput 
                style={styles.input} 
                placeholder="12345678X" 
                placeholderTextColor="rgba(255,255,255,0.3)" 
                autoCapitalize="characters" 
                value={dni} 
                onChangeText={setDni} 
              />
            </View>
          
            {/* --- CASILLA DE PRIVACIDAD --- */}
            <CheckboxPrivacidad />

            {/* --- BOTONES DE ACCIÓN --- */}
            
            {/* Botón Principal: Entrar (Con el color dinámico del config) */}
            <TouchableOpacity 
              style={[styles.botonMinimalista, (!aceptaPrivacidad || cargando) && styles.botonDesactivado]} 
              onPress={manejarAcceso} 
              disabled={cargando || !aceptaPrivacidad}
            >
              <LinearGradient
                colors={[TorneoConfig.colores.primario, TorneoConfig.colores.primarioOscuro]}
                start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                style={styles.linearGradientBoton}
              >
                {cargando ? (
                  <Text style={styles.textoBotonMinimalista}>CARGANDO MOTOR...</Text>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.textoBotonMinimalista}>ENTRAR A PISTA</Text>
                    <MaterialCommunityIcons name="flag-checkered" size={18} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Botón Secundario: WhatsApp */}
            <TouchableOpacity 
              style={styles.botonMinimalistaWhatsapp} 
              onPress={() => Linking.openURL(TorneoConfig.whatsappGrupo)}
            >
              <MaterialCommunityIcons name="whatsapp" size={20} color="#25D366" />
              <Text style={styles.textoBotonMinimalistaWhatsapp}>ÚNETE AL CHAT DE PILOTOS</Text>
            </TouchableOpacity>

            {/* Enlace al Cuadrante Público */}
            <TouchableOpacity style={styles.linkContainer} onPress={() => navigation.navigate("TorneoPublicoScreen")}>
              <Text style={styles.linkTexto}>Ver cuadrante público del torneo →</Text>
            </TouchableOpacity>
            
          </View>
        </ScrollView>
      </LinearGradient>

      {/* 📜 MODAL DE POLÍTICA DE PRIVACIDAD */}
      <Modal visible={modalPrivacidad} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContenido}>
            <Text style={styles.modalTitulo}>Protección de Datos</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.legalIntro}>Reglamento Europeo de Protección de Datos 2016/679 y Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales:</Text>
              
              <Text style={styles.legalBold}>Responsable:</Text>
              <Text style={styles.legalText}>ASOCIACIÓN CULTURAL TOLEDO MATSURI</Text>

              <Text style={styles.legalBold}>Finalidad:</Text>
              <Text style={styles.legalText}>Dar respuesta a las consultas o cualquier tipo de petición que sea realizada por el usuario a través de cualquiera de las formas de contacto que se ponen a su disposición en la página web del responsable. Remitir boletines informativos, novedades, ofertas y promociones online. Gestionar la inscripción en las actividades llevadas a cabo por la organización (charlas, actividades, talleres, voluntariado, etc.).</Text>

              <Text style={styles.legalBold}>Conservación de datos:</Text>
              <Text style={styles.legalText}>Se conservarán durante no más tiempo del necesario para mantener el fin del tratamiento o mientras existan prescripciones legales que dictaminen su custodia y cuando ya no sea necesario para ello, se suprimirán con medidas de seguridad adecuadas.</Text>

              <Text style={styles.legalBold}>Comunicación de datos:</Text>
              <Text style={styles.legalText}>No se comunicarán los datos a terceros, salvo obligación legal.</Text>

              <Text style={styles.legalBold}>Derechos:</Text>
              <Text style={styles.legalText}>Acceso, rectificación, supresión, limitación, portabilidad, oposición y presentar una reclamación ante la AEPD.</Text>

              <Text style={styles.legalBold}>Información adicional:</Text>
              <Text style={styles.legalText}>Puede obtener toda la Información adicional y detallada que precise sobre el tratamiento y protección de sus datos personales solicitándola a la organización.</Text>
            </ScrollView>
            
            <TouchableOpacity style={styles.btnCerrarModal} onPress={() => setModalPrivacidad(false)}>
              <Text style={styles.btnCerrarModalTexto}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

// ==========================================
// HOJA DE ESTILOS (Ordenada por secciones)
// ==========================================
const styles = StyleSheet.create({
  
  // 1. CONTENEDORES PRINCIPALES
  container: { flex: 1 },
  fondoDegradado: { flex: 1, width: '100%', height: '100%' },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  
  // 2. LOGO SUPERIOR
  logoContainerTop: { alignItems: 'center', marginBottom: 30 },
  logoEscudo: { width: 280, height: 95 },

  // 3. TARJETA CRISTAL (Glassmorphism)
  card: { 
    backgroundColor: 'rgba(12, 12, 15, 0.85)', 
    padding: 25, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.1)', 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 20 }, 
    shadowOpacity: 0.8, 
    shadowRadius: 20, 
    elevation: 15,
  },
  
  // 4. CABECERA DE LA TARJETA
  headerCard: { alignItems: "center", marginBottom: 20, paddingBottom: 10, width: '100%' },
  tituloCard: { fontSize: 28, fontWeight: "900", color: "#fff", fontStyle: "italic", letterSpacing: 2, textAlign: 'center' },
  lineaSeparadora: { width: '100%', height: 8, marginTop: 12, marginBottom: 12, opacity: 0.9 },
  subtitulo: { fontSize: 12, color: '#e1e1e1', fontWeight: "bold", letterSpacing: 4, textAlign: 'center', marginBottom: 8 },
  instrucciones: { color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 20, fontSize: 12, letterSpacing: 0.5 },
  
  // 5. FORMULARIO E INPUTS
  form: { marginBottom: 10 },
  label: { color: '#e1e1e1', fontSize: 10, fontWeight: "bold", marginBottom: 5, letterSpacing: 2 },
  input: { 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', color: "#fff", 
    borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)", 
    padding: 15, marginBottom: 15, borderRadius: 6, fontSize: 14, fontWeight: 'bold',
    borderLeftWidth: 3, borderLeftColor: TorneoConfig.colores.primario, //Borde dinámico
  },
  
  // 👉 ESTILOS DE PRIVACIDAD ADAPTADOS AL TORNEO
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 5 },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  checkboxMarcado: { borderColor: TorneoConfig.colores.primario, backgroundColor: TorneoConfig.colores.primario },
  textoCheckbox: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  linkPrivacidad: { fontSize: 12, color: TorneoConfig.colores.primario, fontWeight: 'bold', textDecorationLine: 'underline' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContenido: { backgroundColor: '#1A1A24', borderRadius: 12, padding: 25, width: '100%', maxWidth: 500, maxHeight: '80%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitulo: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 15, textAlign: 'center', fontStyle: 'italic', letterSpacing: 1 },
  modalScroll: { marginBottom: 20 },
  legalIntro: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 15, fontStyle: 'italic', lineHeight: 18 },
  legalBold: { fontSize: 13, fontWeight: 'bold', color: TorneoConfig.colores.primario, marginTop: 10, marginBottom: 4 },
  legalText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 20, textAlign: 'justify' },
  btnCerrarModal: { backgroundColor: TorneoConfig.colores.primario, padding: 15, borderRadius: 6, alignItems: 'center' },
  btnCerrarModalTexto: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 2 },

  // 6. BOTONES DE ACCIÓN
  botonMinimalista: { 
    backgroundColor: 'transparent', 
    borderRadius: 30, 
    alignItems: "center", 
    marginBottom: 10, 
    overflow: 'hidden', 
    // Suspensión adaptativa: Sin sombras raras en Web, con brillo en Móvil
    ...Platform.select({
      web: { shadowColor: 'transparent', shadowOpacity: 0, elevation: 0 },
      default: { shadowColor: TorneoConfig.colores.primario, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }
    }),
  },
  linearGradientBoton: { width: '100%', paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  botonDesactivado: { opacity: 0.4 },
  textoBotonMinimalista: { color: "#fff", fontSize: 14, fontWeight: "900", letterSpacing: 1.5 },

  botonMinimalistaWhatsapp: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    paddingVertical: 12, paddingHorizontal: 10, 
    borderRadius: 30, marginTop: 10, gap: 8, 
    borderWidth: 2, borderColor: "rgba(37, 211, 102, 0.7)" 
  },
  textoBotonMinimalistaWhatsapp: { color: "#25D366", fontSize: 11, fontWeight: "bold", letterSpacing: 1, textAlign: 'center' },

  linkContainer: { marginTop: 25, alignItems: 'center' },
  linkTexto: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecorationLine: 'underline' }
});