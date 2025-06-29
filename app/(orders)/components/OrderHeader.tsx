// app/(main)/(orders)/components/OrderHeader.tsx

import { AntDesign, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../theme/colors";
import { OrderStage, useOrderContext } from "../context/OrderContext";

export default function OrderHeader() {
  const { state, dispatch } = useOrderContext();

  // Function to handle back button press based on current stage
  const handleBackPress = () => {
    if (state.stage === OrderStage.SelectCustomer) {
      // At first stage, confirm exit
      handleCancelOrder();
    } else if (state.stage === OrderStage.SelectProducts) {
      dispatch({ type: "SET_STAGE", payload: OrderStage.SelectCustomer });
    } else if (state.stage === OrderStage.ReturnProducts) {
      dispatch({ type: "SET_STAGE", payload: OrderStage.SelectProducts });
    } else if (state.stage === OrderStage.ReviewOrder) {
      // Go back to returns or products depending on if returns are enabled
      const previousStage = state.hasReturns
        ? OrderStage.ReturnProducts
        : OrderStage.SelectProducts;
      dispatch({ type: "SET_STAGE", payload: previousStage });
    }
  };

  // Function to handle order cancellation with confirmation
  const handleCancelOrder = () => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order? All your progress will be lost.",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => {
            // Reset order state and navigate back
            dispatch({ type: "RESET_ORDER" });
            router.back();
          },
          style: "destructive",
        },
      ]
    );
  };

  // Function to get title based on current stage
  const getStageTitle = () => {
    switch (state.stage) {
      case OrderStage.SelectCustomer:
        return "Select Customer";
      case OrderStage.SelectProducts:
        return "Select Products";
      case OrderStage.ReturnProducts:
        return "Product Returns";
      case OrderStage.ReviewOrder:
        return "Review Order";
      default:
        return "New Order";
    }
  };

  return (
    <View style={styles.header}>
      {/* Left button - Close or Back */}
      {state.stage === OrderStage.SelectCustomer ? (
        // Close button for first stage
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleCancelOrder}
          accessible={true}
          accessibilityLabel="Cancel order"
        >
          <AntDesign name="close" size={24} color={COLORS.light} />
        </TouchableOpacity>
      ) : (
        // Back button for other stages
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleBackPress}
          accessible={true}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.light} />
        </TouchableOpacity>
      )}

      {/* Center - Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.headerTitle}>New Order</Text>
        <Text style={styles.headerSubtitle}>{getStageTitle()}</Text>
      </View>

      {/* Right - Progress bar */}
      <View style={styles.progressContainer}>
        <View
          style={[styles.progressBar, { width: `${(state.stage / 4) * 100}%` }]}
          accessible={true}
          accessibilityLabel={`Order progress: step ${state.stage} of 4`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 6 : 10,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    height:
      Platform.OS === "android" ? 70 + (StatusBar.currentHeight || 0) : 60,
    zIndex: 1000, // Ensure it's above other content
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.light,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  progressContainer: {
    height: 6,
    width: 100,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.light,
    borderRadius: 3,
  },
});
