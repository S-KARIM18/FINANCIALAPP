import { Stack } from 'expo-router';
export default function SendLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      <Stack.Screen name="recipient" />
      <Stack.Screen name="amount" />
      <Stack.Screen name="review" />
      <Stack.Screen name="processing" options={{ gestureEnabled: false }} />
      <Stack.Screen name="success" options={{ gestureEnabled: false }} />
      <Stack.Screen name="failed" options={{ gestureEnabled: false }} />
      <Stack.Screen name="unknown" options={{ gestureEnabled: false }} />
      <Stack.Screen name="duplicate" />
    </Stack>
  );
}
