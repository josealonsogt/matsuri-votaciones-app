// ============================================================================
// PANTALLA DE LOGIN — app/index.tsx
// ============================================================================

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { registrarUsuario, verificarDniExistente } from '../services/authService';
import { auth } from '../services/firebaseConfig';
import { validarDni } from '../utils/validarDni';

// ─── Paleta Matsuri Toledo 2026 ───────────────────────────────────────────────
const C = {
  bg: '#EEF8F7',
  white: '#FFFFFF',
  ink: '#0D1F2D',
  slate: '#2D4A5A',
  muted: '#6E8FA0',
  border: '#C8E6E4',
  inputBg: '#F4FBFA',
  teal: '#00B4A6',
  tealDark: '#00857A',
  tealSoft: '#DFF4F3',
  magenta: '#E91E8C',
  magentaDark: '#C0166F',
  magentaSoft: '#FCE4F3',
  purple: '#6B3FA0',
  purpleSoft: '#EDE5F7',
  shadow: '#062028',
};

const esFirebaseError = (e: unknown): e is FirebaseError => e instanceof FirebaseError;
const derivarPassword = (dni: string) => `Matsuri${dni}*2026`;

// ─── Separador visual ─────────────────────────────────────────────────────────
function Separador() {
  return (
    <View style={sepS.wrap}>
      <View style={sepS.linea} />
      <Text style={sepS.texto}>o</Text>
      <View style={sepS.linea} />
    </View>
  );
}
const sepS = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  linea: { flex: 1, height: 1.5, backgroundColor: C.border },
  texto: { marginHorizontal: 12, color: C.muted, fontSize: 13, fontWeight: '700' },
});

// ─── Pantalla ─────────────────────────────────────────────────────────────────
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
    if (!cargandoAuth && usuario?.dniRegistrado) router.replace('/dashboard' as any);
  }, [usuario, cargandoAuth, router]);

  const validarCamposDni = (dniLimpio: string): boolean => {
    const fmt = /^[0-9]{8}[A-Z]$/;
    if (!fmt.test(dniLimpio)) { alert('Formato incorrecto. Debe ser 8 números y una letra mayúscula (ej: 12345678Z).'); return false; }
    if (!validarDni(dniLimpio)) { alert('DNI no válido. La letra no coincide con el número.'); return false; }
    return true;
  };

  const procesarEmailManual = async () => {
    const dniLimpio = dni.trim().toUpperCase();
    const emailLimpio = email.trim().toLowerCase();
    if (!emailLimpio.includes('@')) return alert('Email inválido. Introduce un correo válido.');
    if (!validarCamposDni(dniLimpio)) return;
    setCargando(true);
    const password = derivarPassword(dniLimpio);
    try {
      try {
        setCreandoCuenta(false);
        await signInWithEmailAndPassword(auth, emailLimpio, password);
        return;
      } catch (err: unknown) {
        const code = esFirebaseError(err) ? err.code : '';
        if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/invalid-email') {
          if (await verificarDniExistente(dniLimpio)) return alert('DNI ya registrado. Vinculado a otra cuenta.');
          setCreandoCuenta(true);
          const cred = await createUserWithEmailAndPassword(auth, emailLimpio, password);
          const ok = await registrarUsuario(cred.user.uid, emailLimpio, emailLimpio.split('@')[0], dniLimpio);
          if (ok) await actualizarDni(); else throw new Error('ERROR_BD');
        } else if (code === 'auth/wrong-password') {
          alert('Email ya en uso con un DNI diferente.');
        } else { throw err; }
      }
    } catch (e: unknown) {
      const code = esFirebaseError(e) ? e.code : '';
      if (code === 'auth/email-already-in-use') alert('Email ya en uso con otro DNI.');
      else alert('Error de conexión. Inténtalo de nuevo.');
    } finally { setCargando(false); setCreandoCuenta(false); }
  };

  const procesarDniGoogle = async () => {
    const dniLimpio = dni.trim().toUpperCase();
    if (!validarCamposDni(dniLimpio)) return;
    if (!usuario) return;
    setCargando(true);
    try {
      if (await verificarDniExistente(dniLimpio)) return alert('DNI ya registrado. Vinculado a otra cuenta.');
      const ok = await registrarUsuario(usuario.uid, usuario.email || '', usuario.displayName || 'Asistente', dniLimpio);
      if (ok) await actualizarDni(); else alert('No se pudo vincular el DNI.');
    } catch { alert('Error de conexión.'); }
    finally { setCargando(false); }
  };

  if (cargandoAuth || creandoCuenta) {
    return (
      <View style={[s.container, s.center]}>
        <View style={s.loadingCard}>
          <ActivityIndicator size="large" color={C.teal} />
          {creandoCuenta && <Text style={s.loadingTexto}>Creando tu cuenta...</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Orbes de fondo */}
      <View style={s.orbTeal} />
      <View style={s.orbMagenta} />
      <View style={s.orbPurple} />

      <View style={s.card}>
        {/* ── Brand ── */}
        <View style={s.brandWrap}>
          {/* Logo badge teal */}
          <View style={s.logoBadge}>
            <MaterialCommunityIcons name="gate" size={28} color={C.teal} />
          </View>
          <Text style={s.logo}>MATSURI</Text>
          {/* Pill de edición */}
          <View style={s.edicionPill}>
            <MaterialCommunityIcons name="map-marker-outline" size={11} color={C.magentaDark} />
            <Text style={s.edicionTexto}>Toledo 2026  ·  11-12 Abril</Text>
          </View>
          <Text style={s.brandSub}>Acceso seguro para votantes</Text>
        </View>

        {/* ── Estado A: sin sesión — pantalla inicial ── */}
        {!usuario && !usarEmail && (
          <View style={s.form}>
            <TouchableOpacity style={s.googleBtn} onPress={loginConGoogle} activeOpacity={0.82}>
              <View style={s.googleIconBadge}>
                <MaterialCommunityIcons name="google" size={20} color="#DB4437" />
              </View>
              <Text style={s.googleText}>Iniciar sesión con Google</Text>
              <Feather name="arrow-right" size={17} color={C.slate} />
            </TouchableOpacity>
            <Separador />
            <TouchableOpacity style={s.btnSecundario} onPress={() => setUsarEmail(true)} activeOpacity={0.82}>
              <Feather name="mail" size={16} color={C.tealDark} />
              <Text style={s.btnSecundarioTexto}>Entrar con email y DNI</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Estado A: pantalla de email manual ── */}
        {!usuario && usarEmail && (
          <View style={s.form}>
            <Text style={s.subtexto}>Introduce tus datos para acceder</Text>
            <TextInput style={s.input} placeholder="Correo electrónico" placeholderTextColor={C.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <TextInput style={s.input} placeholder="DNI  (12345678Z)" placeholderTextColor={C.muted} autoCapitalize="characters" maxLength={9} value={dni} onChangeText={setDni} />
            <TouchableOpacity style={s.btnPrimario} onPress={procesarEmailManual} disabled={cargando} activeOpacity={0.85}>
              {cargando ? <ActivityIndicator color="#FFF" /> : (
                <><Feather name="log-in" size={17} color="#FFF" /><Text style={s.btnPrimarioTexto}>Acceder / Registrarse</Text></>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setUsarEmail(false)} style={s.linkVolver}>
              <Feather name="chevron-left" size={16} color={C.teal} />
              <Text style={s.linkVolverTexto}>Volver a Google</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Estado B: Google logueado, sin DNI ── */}
        {usuario && !usuario.dniRegistrado && (
          <View style={s.form}>
            <View style={s.saludoWrap}>
              <View style={s.saludoIcon}>
                <Feather name="user-check" size={17} color={C.teal} />
              </View>
              <Text style={s.bienvenida}>
                Hola, {usuario.displayName?.split(' ')[0] || 'votante'}
              </Text>
            </View>
            <Text style={s.subtexto}>
              Para garantizar un voto por persona, introduce tu DNI.
            </Text>
            <TextInput style={s.input} placeholder="12345678Z" placeholderTextColor={C.muted} autoCapitalize="characters" maxLength={9} value={dni} onChangeText={setDni} />
            <TouchableOpacity style={s.btnPrimario} onPress={procesarDniGoogle} disabled={cargando} activeOpacity={0.85}>
              {cargando ? <ActivityIndicator color="#FFF" /> : (
                <><Feather name="check-circle" size={17} color="#FFF" /><Text style={s.btnPrimarioTexto}>Finalizar Registro</Text></>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => auth.signOut()} style={s.cancelBtn}>
              <Feather name="x-circle" size={15} color={C.muted} />
              <Text style={s.cancelText}>Cancelar y salir</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={s.footerWrap}>
        <Feather name="shield" size={12} color={C.muted} />
        <Text style={s.footer}>Sistema de Votación Certificado</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 20 },
  center: { justifyContent: 'center', alignItems: 'center' },

  orbTeal:    { position: 'absolute', top: -100, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: C.teal,    opacity: 0.14 },
  orbMagenta: { position: 'absolute', top: 200,  left: -80,  width: 180, height: 180, borderRadius: 90,  backgroundColor: C.magenta, opacity: 0.09 },
  orbPurple:  { position: 'absolute', bottom: -120, left: 80, width: 200, height: 200, borderRadius: 100, backgroundColor: C.purple,  opacity: 0.08 },

  // Card
  card: {
    width: '100%', maxWidth: 420,
    backgroundColor: C.white,
    paddingVertical: 32, paddingHorizontal: 24,
    borderRadius: 28, alignItems: 'center',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 32, elevation: 10,
  },

  // Brand
  brandWrap: { alignItems: 'center', marginBottom: 28 },
  logoBadge: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: C.tealSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 5,
  },
  logo: { fontSize: 30, fontWeight: '900', color: C.tealDark, letterSpacing: 4 },
  edicionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.magentaSoft,
    paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: 999, marginTop: 8,
  },
  edicionTexto: { fontSize: 11, color: C.magentaDark, fontWeight: '700', letterSpacing: 0.3 },
  brandSub: { marginTop: 8, fontSize: 12, color: C.muted, fontWeight: '600', letterSpacing: 0.4 },

  // Form
  form: { width: '100%' },
  subtexto: { fontSize: 14, color: C.slate, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  input: {
    backgroundColor: C.inputBg,
    paddingVertical: 15, paddingHorizontal: 18, borderRadius: 14, fontSize: 15,
    marginBottom: 12, borderWidth: 1.5, borderColor: C.border,
    color: C.ink, textAlign: 'center',
  },

  // Google btn
  googleBtn: {
    flexDirection: 'row', backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.border,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14, justifyContent: 'space-between', alignItems: 'center',
  },
  googleIconBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1F0' },
  googleText: { color: C.ink, fontWeight: '700', fontSize: 15 },

  // Btn secundario (teal suave)
  btnSecundario: {
    paddingVertical: 14, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.tealSoft,
    flexDirection: 'row', gap: 8,
    borderWidth: 1.5, borderColor: C.border,
  },
  btnSecundarioTexto: { color: C.tealDark, fontWeight: '800', fontSize: 14 },

  // Btn primario (teal sólido)
  btnPrimario: {
    backgroundColor: C.teal,
    paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 6, flexDirection: 'row', gap: 8,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 5,
  },
  btnPrimarioTexto: { color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 0.4 },

  // Links
  linkVolver: { marginTop: 18, padding: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  linkVolverTexto: { textAlign: 'center', color: C.teal, fontSize: 14, fontWeight: '700' },

  cancelBtn: { marginTop: 14, padding: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  cancelText: { textAlign: 'center', color: C.muted, fontSize: 14, fontWeight: '600' },

  // Bienvenida Google
  saludoWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  saludoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.tealSoft, alignItems: 'center', justifyContent: 'center' },
  bienvenida: { fontSize: 22, fontWeight: '900', color: C.ink },

  // Loading
  loadingCard: { backgroundColor: C.white, padding: 32, borderRadius: 24, alignItems: 'center', gap: 16, shadowColor: C.shadow, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 6 },
  loadingTexto: { fontSize: 15, color: C.slate, fontWeight: '600' },

  // Footer
  footerWrap: { position: 'absolute', bottom: 28, flexDirection: 'row', alignItems: 'center', gap: 6 },
  footer: { color: C.muted, fontSize: 12, letterSpacing: 0.8, fontWeight: '600' },
});