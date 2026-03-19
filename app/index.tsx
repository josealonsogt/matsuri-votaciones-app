// ============================================================================
// 🔐 PANTALLA DE LOGIN — app/index.tsx
//
// Flujo de registro en 2 pasos:
//   Paso 1: Autenticación (Google OAuth o email+contraseña derivada del DNI)
//   Paso 2: Vinculación del DNI (para garantizar 1 voto por persona)
//
// La contraseña no la elige el usuario; se deriva del DNI con un prefijo
// fijo ("Matsuri") para que sea memorable por el sistema pero no sea
// necesario que el usuario la recuerde.
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
import { validarDni } from '../utils/validarDni';

const esFirebaseError = (e: unknown): e is FirebaseError => e instanceof FirebaseError;

// Deriva una contraseña del DNI. El usuario nunca la ve ni la necesita recordar.
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

  // Redirigir al dashboard si el usuario ya está completamente registrado
  useEffect(() => {
    if (!cargandoAuth && usuario?.dniRegistrado) {
      router.replace('/dashboard' as any);
    }
  }, [usuario, cargandoAuth, router]);

  // ─── Validaciones ────────────────────────────────────────────────────────────

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

  // ─── Login / Registro con Email ───────────────────────────────────────────────

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
      // Intento 1: login (el usuario ya existe)
      try {
        setCreandoCuenta(false);
        await signInWithEmailAndPassword(auth, emailLimpio, password);
        // El useEffect de arriba detectará el cambio de sesión y redirigirá
        return;
      } catch (errorLogin: unknown) {
        const codigo = esFirebaseError(errorLogin) ? errorLogin.code : '';

        // Si el email no existe o la credencial es inválida, intentamos registrar
        if (
          codigo === 'auth/user-not-found' ||
          codigo === 'auth/invalid-credential' ||
          codigo === 'auth/invalid-email'
        ) {
          // Verificamos que el DNI no esté vinculado a otro email antes de crear
          const dniOcupado = await verificarDniExistente(dniLimpio);
          if (dniOcupado) {
            return alert('🚫 DNI ya registrado\nEste DNI ya está vinculado a otra cuenta.');
          }

          // Intento 2: crear cuenta nueva
          setCreandoCuenta(true);
          const credential = await createUserWithEmailAndPassword(auth, emailLimpio, password);
          const exito = await registrarUsuario(
            credential.user.uid,
            emailLimpio,
            emailLimpio.split('@')[0],
            dniLimpio
          );

          if (exito) {
            await actualizarDni(); // Fuerza la re-lectura para que el useEffect redirija
          } else {
            throw new Error('ERROR_BD');
          }
        } else if (codigo === 'auth/wrong-password') {
          alert('🚫 Email ya en uso\nEste correo está registrado con un DNI diferente.');
        } else {
          throw errorLogin;
        }
      }
    } catch (error: unknown) {
      const codigo = esFirebaseError(error) ? error.code : '';
      const msg = error instanceof Error ? error.message : '';

      if (codigo === 'auth/email-already-in-use') {
        alert('🚫 Email ya en uso\nEste correo está registrado con otro DNI.');
      } else if (msg === 'ERROR_BD') {
        alert('❌ Error de registro\nNo se pudo completar el registro. Inténtalo de nuevo.');
      } else if (codigo === 'auth/network-request-failed') {
        alert('📡 Sin conexión\nRevisa tu internet e inténtalo de nuevo.');
      } else {
        alert(`❌ Error inesperado (${codigo || 'UNKNOWN'})\nInténtalo de nuevo o contacta con soporte.`);
      }
    } finally {
      setCargando(false);
      setCreandoCuenta(false);
    }
  };

  // ─── Vinculación de DNI tras login con Google ─────────────────────────────────

  const procesarDniGoogle = async () => {
    const dniLimpio = dni.trim().toUpperCase();
    if (!validarCamposDni(dniLimpio)) return;
    if (!usuario) return;

    setCargando(true);
    try {
      const dniOcupado = await verificarDniExistente(dniLimpio);
      if (dniOcupado) {
        return alert('🚫 DNI ya registrado\nEste DNI ya está vinculado a otra cuenta.');
      }

      const exito = await registrarUsuario(
        usuario.uid,
        usuario.email || '',
        usuario.displayName || 'Asistente',
        dniLimpio
      );

      if (exito) {
        await actualizarDni();
      } else {
        alert('❌ Error al guardar\nNo se pudo vincular el DNI. Inténtalo de nuevo.');
      }
    } catch {
      alert('❌ Error de conexión\nRevisa tu internet e inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  // ─── Pantallas de carga ───────────────────────────────────────────────────────

  if (cargandoAuth) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (creandoCuenta) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.subtexto}>Creando tu cuenta...</Text>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>🎌 MATSURI</Text>

        {/* Estado A: Sin usuario → Pantalla de login */}
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
              <Text style={styles.subtexto}>Introduce tus datos para acceder a las votaciones</Text>
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Tu DNI  (12345678Z)"
                autoCapitalize="characters"
                maxLength={9}
                value={dni}
                onChangeText={setDni}
              />
              <TouchableOpacity style={styles.btnPrimario} onPress={procesarEmailManual} disabled={cargando}>
                {cargando ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnPrimarioTexto}>Acceder / Registrarse</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setUsarEmail(false)} style={styles.linkVolver}>
                <Text style={styles.linkVolverTexto}>← Volver a Google</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {/* Estado B: Usuario logueado con Google pero sin DNI */}
        {usuario && !usuario.dniRegistrado && (
          <View style={styles.form}>
            <Text style={styles.bienvenida}>
              Hola, {usuario.displayName?.split(' ')[0] || 'votante'} 👋
            </Text>
            <Text style={styles.subtexto}>
              Para garantizar un voto por persona, introduce tu DNI.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="12345678Z"
              autoCapitalize="characters"
              maxLength={9}
              value={dni}
              onChangeText={setDni}
            />
            <TouchableOpacity style={styles.btnPrimario} onPress={procesarDniGoogle} disabled={cargando}>
              {cargando ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnPrimarioTexto}>Finalizar Registro</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.footer}>Sistema de Votación Certificado</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', padding: 20 },
  center: { justifyContent: 'center', alignItems: 'center' },
  card: { width: '100%', maxWidth: 400, alignItems: 'center' },
  logo: { fontSize: 32, fontWeight: '900', color: '#000', marginBottom: 40, letterSpacing: 2 },
  bienvenida: { fontSize: 22, fontWeight: 'bold', color: '#000', textAlign: 'center', marginBottom: 8 },
  subtexto: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 25 },
  form: { width: '100%' },
  input: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 4,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    textAlign: 'center',
  },
  googleBtn: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  googleIcon: { width: 24, height: 24, marginRight: 12 },
  googleText: { color: '#555', fontWeight: '500', fontSize: 16 },
  separador: { textAlign: 'center', color: '#CCC', marginVertical: 20 },
  btnSecundario: {
    paddingVertical: 14,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  btnSecundarioTexto: { color: '#333', fontWeight: '500', fontSize: 16 },
  btnPrimario: { backgroundColor: '#000', padding: 16, borderRadius: 4, alignItems: 'center', marginTop: 5 },
  btnPrimarioTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  linkVolver: { marginTop: 25 },
  linkVolverTexto: { textAlign: 'center', color: '#999', fontSize: 13 },
  footer: { position: 'absolute', bottom: 30, color: '#BBB', fontSize: 12, letterSpacing: 1 },
});