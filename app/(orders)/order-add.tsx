// app/(main)/(orders)/order-add.tsx
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext"; // Import auth context
import { COLORS } from "../theme/colors";
import CustomerSelection from "./components/CustomerSelection";
import OrderHeader from "./components/OrderHeader";
import OrderReview from "./components/OrderReview";
import ProductSelection from "./components/ProductSelection";
import ReturnSelection from "./components/ReturnSelection";
import {
  OrderProvider,
  OrderStage,
  useOrderContext,
} from "./context/OrderContext";

// Define styles
const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  permissionText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.dark,
  },
});

// Content component that uses context
function OrderAddContent() {
  const { state } = useOrderContext();
  const { hasPermission } = useAuth(); // Get permissions

  // Check if user has permission to add orders
  useEffect(() => {
    if (!hasPermission("add_order")) {
      // If no permission, redirect to home
      alert("You don't have permission to create orders.");
      router.replace("/(tabs)/home");
    }
  }, [hasPermission]);

  // If checking permissions, show loading
  if (!hasPermission("add_order")) {
    return (
      <View style={styles.permissionDeniedContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.permissionText}>Checking permissions...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      <OrderHeader />

      {state.stage === OrderStage.SelectCustomer && <CustomerSelection />}
      {state.stage === OrderStage.SelectProducts && <ProductSelection />}
      {state.stage === OrderStage.ReturnProducts && <ReturnSelection />}
      {state.stage === OrderStage.ReviewOrder && <OrderReview />}
    </SafeAreaView>
  );
}

// Main component with provider wrapper
export default function OrderAddScreen() {
  return (
    <OrderProvider>
      <OrderAddContent />
    </OrderProvider>
  );
}
