// ============================================================================
// 🔐 PANTALLA DE LOGIN — app/index.tsx
// ============================================================================
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { registrarUsuario, verificarDniExistente } from '../services/authService';
import { auth } from '../services/firebaseConfig';
import { theme } from '../styles/theme'; // 👈 Importación del tema corregida
import { validarDni } from '../utils/validarDni';

const esFirebaseError = (e: unknown): e is FirebaseError => e instanceof FirebaseError;

const derivarPassword = (dni: string) => `Matsuri${dni}*2026`;

export default function LoginScreen() {
  const router = useRouter();
  const { usuario, cargando: cargandoAuth, actualizarDni } = useAuth();
  const { loginConGoogle } = useGoogleAuth();

  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [usarEmail, setUsarEmail] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [creandoCuenta, setCreandoCuenta] = useState(false);

  useEffect(() => {
    if (!cargandoAuth && usuario?.dniRegistrado) {
      router.replace('/dashboard' as any);
    }
  }, [usuario, cargandoAuth, router]);

  const validarCamposDni = (dniLimpio: string): boolean => {
    const formato = /^[0-9]{8}[A-Z]$/;
    if (!formato.test(dniLimpio)) {
      alert('❌ Formato incorrecto\nDebe ser 8 números y una letra mayúscula (ej: 12345678Z).');
      return false;
    }
    if (!validarDni(dniLimpio)) {
      alert('⚠️ DNI no válido\nLa letra no coincide con el número. Por favor, revísalo.');
      return false;
    }
    return true;
  };

  const procesarEmailManual = async () => {
    const dniLimpio = dni.trim().toUpperCase();
    const emailLimpio = email.trim().toLowerCase();

    if (!emailLimpio.includes('@')) {
      return alert('❌ Email inválido\nIntroduce un correo electrónico válido.');
    }
    if (!validarCamposDni(dniLimpio)) return;

    setCargando(true);
    const password = derivarPassword(dniLimpio);

    try {
      try {
        setCreandoCuenta(false);
        await signInWithEmailAndPassword(auth, emailLimpio, password);
        return;
      } catch (errorLogin: unknown) {
        const codigo = esFirebaseError(errorLogin) ? errorLogin.code : '';

        if (codigo === 'auth/user-not-found' || codigo === 'auth/invalid-credential' || codigo === 'auth/invalid-email') {
          const dniOcupado = await verificarDniExistente(dniLimpio);
          if (dniOcupado) return alert('🚫 DNI ya registrado\nEste DNI ya está vinculado a otra cuenta.');

          setCreandoCuenta(true);
          const credential = await createUserWithEmailAndPassword(auth, emailLimpio, password);
          const exito = await registrarUsuario(credential.user.uid, emailLimpio, emailLimpio.split('@')[0], dniLimpio);

          if (exito) await actualizarDni();
          else throw new Error('ERROR_BD');
        } else if (codigo === 'auth/wrong-password') {
          alert('🚫 Email ya en uso\nEste correo está registrado con un DNI diferente.');
        } else {
          throw errorLogin;
        }
      }
    } catch (error: unknown) {
      const codigo = esFirebaseError(error) ? error.code : '';
      if (codigo === 'auth/email-already-in-use') alert('🚫 Email ya en uso\nEste correo está registrado con otro DNI.');
      else alert(`❌ Error de conexión\nInténtalo de nuevo.`);
    } finally {
      setCargando(false);
      setCreandoCuenta(false);
    }
  };

  const procesarDniGoogle = async () => {
    const dniLimpio = dni.trim().toUpperCase();
    if (!validarCamposDni(dniLimpio)) return;
    if (!usuario) return;

    setCargando(true);
    try {
      const dniOcupado = await verificarDniExistente(dniLimpio);
      if (dniOcupado) return alert('🚫 DNI ya registrado\nEste DNI ya está vinculado a otra cuenta.');

      const exito = await registrarUsuario(usuario.uid, usuario.email || '', usuario.displayName || 'Asistente', dniLimpio);
      if (exito) await actualizarDni();
      else alert('❌ Error al guardar\nNo se pudo vincular el DNI. Inténtalo de nuevo.');
    } catch {
      alert('❌ Error de conexión\nRevisa tu internet e inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  if (cargandoAuth || creandoCuenta) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        {creandoCuenta && <Text style={styles.subtexto}>Creando tu cuenta...</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>🎌 MATSURI</Text>

        {!usuario && (
          !usarEmail ? (
            <View style={styles.form}>
              <TouchableOpacity style={styles.googleBtn} onPress={loginConGoogle}>
                <Image 
                  source={{ uri: 'https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png' }} 
                  style={styles.googleIcon} 
                />
                <Text style={styles.googleText}>Iniciar sesión con Google</Text>
              </TouchableOpacity>
              <Text style={styles.separador}>— o —</Text>
              <TouchableOpacity style={styles.btnSecundario} onPress={() => setUsarEmail(true)}>
                <Text style={styles.btnSecundarioTexto}>Entrar con Email Manual</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.subtexto}>Introduce tus datos para acceder</Text>
              <TextInput style={styles.input} placeholder="Correo electrónico" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
              <TextInput style={styles.input} placeholder="Tu DNI  (12345678Z)" autoCapitalize="characters" maxLength={9} value={dni} onChangeText={setDni} />
              <TouchableOpacity style={styles.btnPrimario} onPress={procesarEmailManual} disabled={cargando}>
                {cargando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimarioTexto}>Acceder / Registrarse</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setUsarEmail(false)} style={styles.linkVolver}>
                <Text style={styles.linkVolverTexto}>← Volver a Google</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {usuario && !usuario.dniRegistrado && (
          <View style={styles.form}>
            <Text style={styles.bienvenida}>Hola, {usuario.displayName?.split(' ')[0] || 'votante'} 👋</Text>
            <Text style={styles.subtexto}>Para garantizar un voto por persona, introduce tu DNI.</Text>
            <TextInput style={styles.input} placeholder="12345678Z" autoCapitalize="characters" maxLength={9} value={dni} onChangeText={setDni} />
            <TouchableOpacity style={styles.btnPrimario} onPress={procesarDniGoogle} disabled={cargando}>
              {cargando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimarioTexto}>Finalizar Registro</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
      <Text style={styles.footer}>Sistema de Votación Certificado</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 },
  center: { justifyContent: 'center', alignItems: 'center' },
  card: { width: '100%', maxWidth: 400, backgroundColor: theme.colors.surface, padding: 30, borderRadius: theme.borderRadius.lg, ...theme.shadows.soft, alignItems: 'center' },
  logo: { fontSize: 34, fontWeight: '900', color: theme.colors.primary, marginBottom: 30, letterSpacing: 3 },
  bienvenida: { fontSize: 24, fontWeight: '800', color: theme.colors.textDark, textAlign: 'center', marginBottom: 8 },
  subtexto: { fontSize: 15, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  form: { width: '100%' },
  input: { backgroundColor: '#F8F9FA', padding: 16, borderRadius: theme.borderRadius.md, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E9ECEF', textAlign: 'center', color: theme.colors.textDark },
  googleBtn: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: '#E9ECEF', paddingVertical: 14, borderRadius: theme.borderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  googleIcon: { width: 24, height: 24, marginRight: 12 },
  googleText: { color: theme.colors.textDark, fontWeight: '600', fontSize: 16 },
  separador: { textAlign: 'center', color: '#DEE2E6', marginVertical: 15, fontWeight: '600' },
  btnSecundario: { paddingVertical: 14, borderRadius: theme.borderRadius.md, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  btnSecundarioTexto: { color: theme.colors.textMuted, fontWeight: '600', fontSize: 16 },
  btnPrimario: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: 5, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnPrimarioTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
  linkVolver: { marginTop: 25, padding: 10 },
  linkVolverTexto: { textAlign: 'center', color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
  footer: { position: 'absolute', bottom: 30, color: '#ADB5BD', fontSize: 12, letterSpacing: 1, fontWeight: '500' },
});