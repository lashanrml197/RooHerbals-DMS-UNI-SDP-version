// app/(customers)/_layout.tsx

// Import the Stack component from expo-router to handle stack-based navigation.
import { Stack } from "expo-router";

// This is the layout component for the drivers section of the app.
export default function DriverLayout() {
  return (
    // The Stack navigator wraps the screens for this part of the app.
    // Hiding the header for all screens in this stack by default.
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
