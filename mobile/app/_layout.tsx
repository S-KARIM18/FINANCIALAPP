/**
 * KudiFlow Root Layout
 *
 * Handles:
 * - Font loading (Plus Jakarta Sans)
 * - Auth state rehydration from expo-secure-store
 * - Auth-guarded routing
 * - Global error boundary
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform } from 'react-native';
import { useAuthStore, initAuthCallbacks } from '../store/auth.store';

// Prevent splash from auto-hiding — we control it
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { rehydrate, isLoading } = useAuthStore();

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    // Initialize auth callbacks (logout on token expiry)
    initAuthCallbacks();
    // Rehydrate auth state from SecureStore
    rehydrate();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isLoading]);

  if ((!fontsLoaded && !fontError) || isLoading) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="send" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="transactions" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FD',
    ...(Platform.OS === 'web'
      ? {
          maxWidth: 480,
          width: '100%',
          marginHorizontal: 'auto',
          minHeight: '100vh' as any,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)' as any,
        }
      : {}),
  },
});
