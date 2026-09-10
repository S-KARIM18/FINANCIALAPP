/**
 * App Group Layout — Bottom Tab Navigation
 * Redirects unauthenticated users to auth group.
 * 5-tab navigation matching Stitch design.
 */
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';

import { Ionicons, Feather } from '@expo/vector-icons';

export default function AppLayout() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="(tabs)/home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.homeTabBox}>
              <Ionicons name="home-outline" size={22} color={focused ? '#059669' : '#64748B'} />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/transactions"
        options={{
          title: 'Ledger',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name="reader-outline" size={22} color={focused ? '#059669' : '#64748B'} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/send"
        options={{
          title: '',
          tabBarIcon: () => <SendButton />,
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="(tabs)/activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, focused }) => (
            <Feather name="activity" size={22} color={focused ? '#059669' : '#64748B'} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name="person-outline" size={22} color={focused ? '#059669' : '#64748B'} />
          ),
        }}
      />
    </Tabs>
  );
}

function SendButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push('/send/review')}
      style={styles.sendBtn}
      activeOpacity={0.85}
    >
      <Ionicons name="navigate" size={24} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    height: 64,
    paddingBottom: 6,
    paddingTop: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  homeTabBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#059669',
    marginTop: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  iconEmoji: {
    fontSize: 20,
  },
  iconEmojiActive: {
    // optional filter or styling
  },
  sendBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0C1220',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24, // Elevates above tab bar
    shadowColor: '#0C1220',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  sendIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
