import React, { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function RecipientScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    router.replace({ pathname: '/send/review', params });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FD', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="small" color="#0F172A" />
    </View>
  );
}

