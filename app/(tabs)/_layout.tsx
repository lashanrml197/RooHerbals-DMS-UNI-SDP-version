// app/(tabs)/_layout.tsx
import { Stack } from "expo-router";

export default function TabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="products" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="index" />
      <Stack.Screen name="product-add" />s
    </Stack>
  );
}
