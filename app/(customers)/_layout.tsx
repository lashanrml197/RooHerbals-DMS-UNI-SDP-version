// app/(customers)/_layout.tsx
// Layout component for the customer management section of the app
import { Stack } from "expo-router";

/**
 * CustomerLayout component that defines the navigation structure
 * for all customer-related screens in the app
 */
export default function CustomerLayout() {
  return (
    // Stack navigator container with hidden headers for all screens
    <Stack screenOptions={{ headerShown: false }}>
      {/* Main customer dashboard/index screen */}
      <Stack.Screen name="index" />

      {/* Screen displaying list of all customers */}
      <Stack.Screen name="customer-list" />

      {/* Screen for adding new customers to the system */}
      <Stack.Screen name="customer-add" />

      {/* Screen showing detailed information about a specific customer */}
      <Stack.Screen name="customer-detail" />

      {/* Success confirmation screen after customer operations */}
      <Stack.Screen name="customer-success" />

      {/* Screen for editing existing customer information */}
      <Stack.Screen name="edit-customer" />
    </Stack>
  );
}
