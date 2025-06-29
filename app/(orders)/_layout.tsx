// In _layout.tsx
import { Stack } from "expo-router";

export default function OrdersLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="order-list" options={{ headerShown: false }} />
      <Stack.Screen name="order-details" options={{ headerShown: false }} />
      <Stack.Screen name="order-add" options={{ headerShown: false }} />
      <Stack.Screen
        name="delivery-management"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="return-orders" options={{ headerShown: false }} />
      {/* Other screens */}
    </Stack>
  );
}
