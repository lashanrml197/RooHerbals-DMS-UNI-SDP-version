// app/(customers)/_layout.tsx
import { Stack } from "expo-router";

export default function ReportLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
