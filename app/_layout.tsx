import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';



export default function RootLayout() {
const [fontsLoaded] = useFonts({
...Feather.font,
...MaterialCommunityIcons.font,
});

if (!fontsLoaded) {
return (
<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
<ActivityIndicator size="large" />
</View>
);
}

return (
<AuthProvider>
<ToastProvider>
<Stack screenOptions={{ headerShown: false }}>
<Stack.Screen name="index" />
<Stack.Screen name="dashboard" />
</Stack>
</ToastProvider>
</AuthProvider>
);
}