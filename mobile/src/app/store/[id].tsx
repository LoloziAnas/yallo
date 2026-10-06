import { useLocalSearchParams } from 'expo-router';

import { StoreScreen } from '@/screens/store';

export default function StoreRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StoreScreen id={id} />;
}
