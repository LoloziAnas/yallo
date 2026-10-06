import { useLocalSearchParams } from 'expo-router';

import { ProductScreen } from '@/screens/product';

export default function ProductRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProductScreen id={id} />;
}
