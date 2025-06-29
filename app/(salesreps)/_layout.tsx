// Importing the Stack component from expo-router to manage navigation stack
import { Stack } from "expo-router";

// Defining the layout for the Sales Representatives section
export default function SalesRepLayout() {
  return (
    // Configuring a stack navigator with screen options
    <Stack screenOptions={{ headerShown: false }}>
      {/* Defining the main screen for the Sales Representatives section */}
      <Stack.Screen name="index" />
      {/* Screen for viewing details of a specific sales representative */}
      <Stack.Screen name="sales-rep-detail" />
      {/* Screen for adding a new sales representative */}
      <Stack.Screen name="sales-rep-add" />
      {/* Screen for viewing commission details of a sales representative */}
      <Stack.Screen name="sales-rep-commission" />
      {/* Screen for viewing orders associated with a sales representative */}
      <Stack.Screen name="sales-rep-orders" />
    </Stack>
  );
}
