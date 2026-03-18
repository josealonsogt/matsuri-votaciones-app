import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { ToastProvider } from "../contexts/ToastContext"; // 👈 1. Lo importamos

export default function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>  {/* 👈 2. Lo ponemos envolviendo la app */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="dashboard" />
        </Stack>
      </ToastProvider>
    </AuthProvider>
  );
}