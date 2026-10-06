import { useLocalSearchParams } from 'expo-router';

import { OrderDetail } from '@/screens/order-detail';

export default function OrderDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OrderDetail id={id} />;
}
