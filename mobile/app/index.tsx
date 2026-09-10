/**
 * KudiFlow App Entry / Gateway Route (/)
 * Directs authenticated users to the home dashboard and guests to onboarding.
 */
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth.store';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/onboarding" />;
}
