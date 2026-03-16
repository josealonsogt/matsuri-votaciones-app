import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { registrarUsuario, verificarDniExistente } from '../services/authService';
import { auth } from '../services/firebaseConfig';
import { validarDni } from '../utils/validarDni';

const esFirebaseError = (error: unknown): error is FirebaseError => error instanceof FirebaseError;

export default function LoginScreen() {
  const router = useRouter();
  const { usuario, cargando: cargandoAuth, actualizarDni } = useAuth();
  const { loginConGoogle } = useGoogleAuth();
  
  const [dni, setDni] = useState('');
  const [emailManual, setEmailManual] = useState('');
  const [usarEmail, setUsarEmail] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [procesandoRegistro, setProcesandoRegistro] = useState(false);

  useEffect(() => {
    if (!cargandoAuth && usuario?.dniRegistrado) {
      router.replace('dashboard' as any);
    }
  }, [usuario, cargandoAuth, router]);

  const procesarEmailManual = async () => {
    const dniLimpio = dni.trim().toUpperCase();
    const emailLimpio = emailManual.trim().toLowerCase();

    if (!emailLimpio.includes('@')) {
      return alert("❌ Email inválido\nPor favor, introduce un correo válido.");
    }

    const formatoRegex = /^[0-9]{8}[A-Z]$/;
    if (!formatoRegex.test(dniLimpio)) {
      return alert("❌ Formato incorrecto\nDebes introducir 8 números y una letra (ej: 12345678Z).");
    }

    if (!validarDni(dniLimpio)) {
      return alert("⚠️ DNI No Válido\nLa letra no coincide con el número. Por favor, revísalo.");
    }

    setCargando(true);

    const passwordOculta = `Matsuri${dniLimpio}*2026`;

    try {
      try {
        setProcesandoRegistro(true);
        await signInWithEmailAndPassword(auth, emailLimpio, passwordOculta);
        console.log("✅ Login exitoso");
        await new Promise(resolve => setTimeout(resolve, 300));
        setProcesandoRegistro(false);
        return;

      } catch (errorLogin: unknown) {
        const loginErrorCode = esFirebaseError(errorLogin) ? errorLogin.code : '';
        console.log("Error de login:", loginErrorCode);

        if (
          loginErrorCode === 'auth/user-not-found' ||
          loginErrorCode === 'auth/invalid-credential' ||
          loginErrorCode === 'auth/invalid-email'
        ) {
          const dniYaExiste = await verificarDniExistente(dniLimpio);

          if (dniYaExiste) {
            setCargando(false);
            return alert("🚫 DNI ya registrado\nEste DNI ya está vinculado a otra cuenta. Intenta con otro email o DNI.");
          }

          console.log("🆕 Creando nueva cuenta...");
          setProcesandoRegistro(true);
          const userCredential = await createUserWithEmailAndPassword(auth, emailLimpio, passwordOculta);

          const exito = await registrarUsuario(
            userCredential.user.uid,
            emailLimpio,
            emailLimpio.split('@')[0],
            dniLimpio
          );

          if (exito) {
            console.log("✅ Usuario creado correctamente");
            await new Promise(resolve => setTimeout(resolve, 500));
            await actualizarDni();
            setProcesandoRegistro(false);
          } else {
            setProcesandoRegistro(false);
            throw new Error("Error al guardar en base de datos");
          }

        } else if (loginErrorCode === 'auth/wrong-password') {
          setCargando(false);
          return alert("🚫 Email ya registrado\nEste email ya está en uso con un DNI diferente.");

        } else {
          throw errorLogin;
        }
      }

    } catch (error: unknown) {
      console.error("❌ Error final:", error);

      const errorCode = esFirebaseError(error) ? error.code : 'UNKNOWN';
      const errorMessage = error instanceof Error ? error.message : '';

      if (errorCode === 'auth/email-already-in-use') {
        alert("🚫 Email ya en uso\nEste correo ya está registrado con otro DNI.");
      } else if (errorCode === 'auth/weak-password') {
        alert("⚠️ Error de configuración\nPor favor, contacta con el administrador.");
      } else if (errorCode === 'auth/network-request-failed') {
        alert("📡 Error de conexión\nRevisa tu conexión a internet e inténtalo de nuevo.");
      } else if (errorMessage === "Error al guardar en base de datos") {
        alert("❌ Error de registro\nNo se pudo completar el registro. Inténtalo de nuevo.");
      } else {
        alert("❌ Error inesperado\nCódigo: " + errorCode + "\nInténtalo de nuevo o contacta con soporte.");
      }

    } finally {
      setCargando(false);
      setProcesandoRegistro(false);
    }
  };

  const procesarDniGoogle = async () => {
    const dniLimpio = dni.trim().toUpperCase();

    const formatoRegex = /^[0-9]{8}[A-Z]$/;
    if (!formatoRegex.test(dniLimpio)) {
      return alert("❌ Formato incorrecto\nDebes introducir 8 números y una letra (ej: 12345678Z).");
    }

    if (!validarDni(dniLimpio)) {
      return alert("⚠️ DNI No Válido\nLa letra no coincide con el número. Por favor, revísalo.");
    }

    setCargando(true);

    try {
      const yaExiste = await verificarDniExistente(dniLimpio);

      if (yaExiste) {
        setCargando(false);
        return alert("🚫 DNI ya registrado\nEste DNI ya está vinculado a otra cuenta. Usa otro DNI.");
      }

      if (usuario) {
        const exito = await registrarUsuario(
          usuario.uid,
          usuario.email || '',
          usuario.displayName || 'Asistente',
          dniLimpio
        );

        if (exito) {
          console.log("✅ DNI vinculado correctamente");
          await actualizarDni();
        } else {
          alert("❌ Error al guardar\nNo se pudo vincular el DNI. Inténtalo de nuevo.");
        }
      }

    } catch (error: unknown) {
      console.error("Error al vincular DNI:", error);
      alert("❌ Error de conexión\nNo se pudo procesar el registro. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  if (cargandoAuth) {
    return <View style={styles.container}><ActivityIndicator size="large" color="#000" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>🎌 MATSURI</Text>

        {procesandoRegistro ? (
          <View style={styles.form}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.subtexto}>Creando tu cuenta...</Text>
          </View>
        ) : !usuario ? (
          !usarEmail ? (
            <View style={styles.form}>
              <TouchableOpacity style={styles.googleBtn} onPress={loginConGoogle}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={styles.googleIcon} />
                <Text style={styles.googleText}>Inicia sesión con Google</Text>
              </TouchableOpacity>

              <Text style={styles.oTexto}>— o —</Text>

              <TouchableOpacity style={styles.emailBtnToggle} onPress={() => setUsarEmail(true)}>
                <Text style={styles.emailBtnToggleText}>Entrar con Email Manual</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.subtexto}>Introduce tus datos para acceder a las votaciones</Text>

              <TextInput style={styles.input} placeholder="Correo electrónico" autoCapitalize="none" keyboardType="email-address" value={emailManual} onChangeText={setEmailManual} />
              <TextInput style={styles.input} placeholder="Tu DNI (12345678Z)" autoCapitalize="characters" maxLength={9} value={dni} onChangeText={setDni} />

              <TouchableOpacity style={styles.mainBtn} onPress={procesarEmailManual} disabled={cargando}>
                {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>Acceder / Registrarse</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setUsarEmail(false)} style={{ marginTop: 25 }}>
                <Text style={styles.linkTextoSecundario}>← Volver a Google</Text>
              </TouchableOpacity>
            </View>
          )
        ) : !usuario.dniRegistrado ? (
          <View style={styles.form}>
            <Text style={styles.bienvenida}>Hola, {usuario.displayName?.split(' ')[0]}</Text>
            <Text style={styles.subtexto}>Para garantizar un voto por persona, introduce tu DNI.</Text>

            <TextInput style={styles.input} placeholder="12345678Z" placeholderTextColor="#999" value={dni} onChangeText={setDni} autoCapitalize="characters" maxLength={9} />

            <TouchableOpacity style={styles.mainBtn} onPress={procesarDniGoogle} disabled={cargando}>
              {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>Finalizar Registro</Text>}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      <Text style={styles.footer}>Sistema de Votación Certificado</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 400, alignItems: 'center' },
  logo: { fontSize: 32, fontWeight: '900', color: '#000', marginBottom: 40, letterSpacing: 2 },
  bienvenida: { fontSize: 22, fontWeight: 'bold', color: '#000', textAlign: 'center' },
  subtexto: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 25 },
  
  googleBtn: { flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', paddingVertical: 12, borderRadius: 4, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  googleIcon: { width: 18, height: 18, marginRight: 12 },
  googleText: { color: '#757575', fontWeight: '500', fontSize: 16 },
  
  oTexto: { textAlign: 'center', color: '#CCC', marginVertical: 20 },
  emailBtnToggle: { paddingVertical: 12, borderRadius: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#EEE' },
  emailBtnToggleText: { color: '#333', fontWeight: '500', fontSize: 16 },

  form: { width: '100%' },
  input: { backgroundColor: '#F9F9F9', padding: 16, borderRadius: 4, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#DDD', textAlign: 'center' },
  
  mainBtn: { backgroundColor: '#000', padding: 16, borderRadius: 4, alignItems: 'center', marginTop: 5 },
  mainBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  linkTextoSecundario: { textAlign: 'center', color: '#999', fontSize: 13 },
  footer: { position: 'absolute', bottom: 30, color: '#BBB', fontSize: 12, letterSpacing: 1 }
});