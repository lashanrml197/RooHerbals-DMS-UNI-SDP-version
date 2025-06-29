// app/(main)/(orders)/components/OrderReview.tsx

import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { createOrder } from "../../services/addOrderApi";
import { COLORS } from "../../theme/colors";
import {
  PaymentType,
  formatCurrency,
  formatDate,
  getOrderSummary,
  useOrderContext,
} from "../context/OrderContext";

export default function OrderReview() {
  const { state, dispatch } = useOrderContext();
  const { user } = useAuth(); // Get user data from auth context
  const [submitting, setSubmitting] = useState(false);

  // Get summary calculations
  const { totalOrderAmount, totalDiscount, totalReturnsAmount, finalAmount } =
    getOrderSummary(state.cartItems, state.returnItems);

  // Handle order submission
  const handleSubmitOrder = async () => {
    // Validate order data
    if (!state.selectedCustomer) {
      dispatch({ type: "SET_ERROR", payload: "Customer information missing" });
      return;
    }

    if (state.cartItems.length === 0) {
      dispatch({
        type: "SET_ERROR",
        payload: "Please add at least one product to your order",
      });
      return;
    }

    if (finalAmount <= 0) {
      dispatch({
        type: "SET_ERROR",
        payload: "Final order amount must be greater than zero",
      });
      return;
    }

    if (!state.networkConnected) {
      dispatch({
        type: "SET_ERROR",
        payload:
          "No internet connection. Please check your network settings and try again.",
      });
      return;
    }

    try {
      setSubmitting(true);
      dispatch({ type: "SET_LOADING", payload: true }); // Get current user info from auth context
      if (!user || !user.id) {
        throw new Error("User information is missing. Please log in again.");
      }

      // Prepare order data
      const orderData = {
        customerId: state.selectedCustomer.customer_id,
        salesRepId: user.id,
        orderItems: state.cartItems.map((item) => ({
          product_id: item.product_id,
          batch_id: item.batch_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          is_fefo_split: item.is_fefo_split || false,
          fefo_batches: item.fefo_batches || undefined,
        })),
        paymentType: state.paymentType,
        notes: state.orderNotes,
        returns:
          state.returnItems.length > 0
            ? {
                orderId: state.selectedOrderForReturn?.order_id,
                reason: state.returnReason || "Items returned during new order",
                items: state.returnItems.map((item) => ({
                  product_id: item.product_id,
                  batch_id: item.batch_id,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  reason: item.reason,
                })),
              }
            : null,
      };

      // Submit order to API
      const response = await createOrder(orderData);

      // Handle success
      if (response && response.data && response.data.order_id) {
        // Display success message
        Alert.alert(
          "Order Created",
          `Order #${response.data.order_id} has been created successfully`,
          [
            {
              text: "Go to Dashboard",
              onPress: () => {
                dispatch({ type: "RESET_ORDER" });
                router.push("/(tabs)");
              },
            },
            {
              text: "New Order",
              onPress: () => {
                dispatch({ type: "RESET_ORDER" });
                router.replace("/(orders)/order-add");
              },
            },
          ]
        );
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      console.error("Failed to create order:", err);

      // Handle authentication errors
      if (
        err.message &&
        (err.message.includes("Authentication required") ||
          err.message.includes("log in again"))
      ) {
        Alert.alert(
          "Authentication Error",
          "Your session has expired. Please log in again.",
          [
            {
              text: "OK",
              onPress: () => {
                // Redirect to login
                router.replace("/(auth)/login");
              },
            },
          ]
        );
      } else if (err.message && err.message.includes("permission")) {
        // Handle permission errors
        Alert.alert(
          "Permission Denied",
          "You don't have permission to create orders.",
          [{ text: "OK" }]
        );
      } else {
        // Handle other errors
        dispatch({
          type: "SET_ERROR",
          payload: err.message || "Failed to create order. Please try again.",
        });

        // Clear error after a few seconds
        setTimeout(() => {
          dispatch({ type: "SET_ERROR", payload: null });
        }, 5000);
      }
    } finally {
      setSubmitting(false);
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  return (
    <View style={styles.container}>
      {/* Scrollable review content */}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }} // Extra padding for fixed buttons
      >
        {/* FEFO Policy Banner */}
        <View style={styles.fefoBanner}>
          <MaterialCommunityIcons
            name="calendar-clock"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.fefoBannerText}>
            This order follows FEFO (First Expired, First Out) inventory
            management
          </Text>
        </View>

        <View style={styles.reviewMasterCard}>
          {/* Order Items Section */}
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.reviewCard}>
            {state.cartItems.map((item, index) => (
              <View
                key={`${item.product_id}-${item.batch_id}`}
                style={[
                  styles.orderItemRow,
                  index !== state.cartItems.length - 1 && styles.itemDivider,
                ]}
              >
                <View style={styles.orderItemDetails}>
                  <Text style={styles.orderItemName}>{item.product_name}</Text>

                  {/* Display FEFO info based on split status */}
                  {item.is_fefo_split ? (
                    <View style={styles.fefoSplitInfo}>
                      <View style={styles.batchInfoRow}>
                        <Text style={styles.orderItemBatch}>
                          Multiple Batches (FEFO)
                        </Text>
                        <View style={styles.fefoSplitBadge}>
                          <MaterialCommunityIcons
                            name="layers-triple"
                            size={14}
                            color={COLORS.primary}
                          />
                          <Text style={styles.fefoSplitText}>Split Order</Text>
                        </View>
                      </View>

                      {/* Batch breakdown for split orders */}
                      {item.fefo_batches && (
                        <View style={styles.splitBatchesContainer}>
                          {item.fefo_batches.map((batch) => (
                            <Text
                              key={batch.batch_id}
                              style={styles.splitBatchItem}
                            >
                              • Batch {batch.batch_number}: {batch.quantity}{" "}
                              units
                              {batch.expiry_date &&
                                ` (Exp: ${formatDate(batch.expiry_date)})`}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.batchInfoRow}>
                      <Text style={styles.orderItemBatch}>
                        Batch: {item.batch_number}
                      </Text>
                      <View style={styles.fefoTag}>
                        <MaterialCommunityIcons
                          name="calendar-clock"
                          size={12}
                          color={COLORS.primary}
                        />
                        <Text style={styles.fefoTagText}>FEFO</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.orderItemInfo}>
                    <Text style={styles.orderItemPrice}>
                      {formatCurrency(item.unit_price)} × {item.quantity}
                    </Text>
                    {item.discount > 0 && (
                      <Text style={styles.orderItemDiscount}>
                        Discount: {formatCurrency(item.discount)}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.orderItemTotal}>
                  {formatCurrency(item.total_price)}
                </Text>
              </View>
            ))}

            {/* Order Subtotal */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(totalOrderAmount)}
              </Text>
            </View>

            {/* Total Discounts (if any) */}
            {totalDiscount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Discounts:</Text>
                <Text style={styles.discountValue}>
                  - {formatCurrency(totalDiscount)}
                </Text>
              </View>
            )}
          </View>

          {/* Returns Section (if any) */}
          {state.returnItems.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Return Items</Text>
              <View style={styles.reviewCard}>
                {state.returnItems.map((item, index) => (
                  <View
                    key={`return-${item.product_id}-${item.batch_id}`}
                    style={[
                      styles.orderItemRow,
                      index !== state.returnItems.length - 1 &&
                        styles.itemDivider,
                    ]}
                  >
                    <View style={styles.orderItemDetails}>
                      <Text style={styles.returnItemName}>
                        {item.product_name}
                      </Text>
                      <Text style={styles.orderItemBatch}>
                        Batch: {item.batch_number}
                      </Text>
                      <Text style={styles.orderItemPrice}>
                        {formatCurrency(item.unit_price)} × {item.quantity}
                      </Text>
                      {item.reason && (
                        <Text style={styles.returnReason}>
                          Reason: {item.reason}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.returnItemTotal}>
                      - {formatCurrency(item.total_price)}
                    </Text>
                  </View>
                ))}

                {/* Returns Total */}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Returns Total:</Text>
                  <Text style={styles.returnTotalValue}>
                    - {formatCurrency(totalReturnsAmount)}
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* Customer Information */}
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.reviewCard}>
            {state.selectedCustomer && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>
                    {state.selectedCustomer.name}
                  </Text>
                </View>

                {state.selectedCustomer.contact_person && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Contact Person:</Text>
                    <Text style={styles.infoValue}>
                      {state.selectedCustomer.contact_person}
                    </Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>
                    {state.selectedCustomer.phone}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Location:</Text>
                  <Text style={styles.infoValue}>
                    {[state.selectedCustomer.city, state.selectedCustomer.area]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Payment Details */}
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.reviewCard}>
            <Text style={styles.paymentTypeLabel}>Payment Type:</Text>
            <View style={styles.paymentOptions}>
              {/* Cash Option */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  state.paymentType === PaymentType.Cash &&
                    styles.paymentSelected,
                ]}
                onPress={() =>
                  dispatch({
                    type: "SET_PAYMENT_TYPE",
                    payload: PaymentType.Cash,
                  })
                }
              >
                <MaterialIcons
                  name="attach-money"
                  size={20}
                  color={
                    state.paymentType === PaymentType.Cash
                      ? COLORS.light
                      : COLORS.dark
                  }
                />
                <Text
                  style={[
                    styles.paymentTypeText,
                    state.paymentType === PaymentType.Cash &&
                      styles.paymentTextSelected,
                  ]}
                >
                  Cash
                </Text>
              </TouchableOpacity>

              {/* Credit Option */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  state.paymentType === PaymentType.Credit &&
                    styles.paymentSelected,
                ]}
                onPress={() =>
                  dispatch({
                    type: "SET_PAYMENT_TYPE",
                    payload: PaymentType.Credit,
                  })
                }
              >
                <MaterialCommunityIcons
                  name="credit-card-outline"
                  size={20}
                  color={
                    state.paymentType === PaymentType.Credit
                      ? COLORS.light
                      : COLORS.dark
                  }
                />
                <Text
                  style={[
                    styles.paymentTypeText,
                    state.paymentType === PaymentType.Credit &&
                      styles.paymentTextSelected,
                  ]}
                >
                  Credit
                </Text>
              </TouchableOpacity>

              {/* Cheque Option */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  state.paymentType === PaymentType.Cheque &&
                    styles.paymentSelected,
                ]}
                onPress={() =>
                  dispatch({
                    type: "SET_PAYMENT_TYPE",
                    payload: PaymentType.Cheque,
                  })
                }
              >
                <MaterialCommunityIcons
                  name="bank-outline"
                  size={20}
                  color={
                    state.paymentType === PaymentType.Cheque
                      ? COLORS.light
                      : COLORS.dark
                  }
                />
                <Text
                  style={[
                    styles.paymentTypeText,
                    state.paymentType === PaymentType.Cheque &&
                      styles.paymentTextSelected,
                  ]}
                >
                  Cheque
                </Text>
              </TouchableOpacity>
            </View>

            {/* Order Notes */}
            <Text style={styles.notesLabel}>Notes (Optional):</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any notes about this order..."
              value={state.orderNotes}
              onChangeText={(text) =>
                dispatch({ type: "SET_ORDER_NOTES", payload: text })
              }
              multiline
            />
          </View>

          {/* Order Summary */}
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.fefoCompliantBadge}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.fefoCompliantText}>FEFO Compliant Order</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Order Total:</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(totalOrderAmount)}
              </Text>
            </View>

            {state.returnItems.length > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Returns Total:</Text>
                <Text style={styles.totalDeduction}>
                  - {formatCurrency(totalReturnsAmount)}
                </Text>
              </View>
            )}

            <View style={styles.finalRow}>
              <Text style={styles.finalLabel}>Final Amount:</Text>
              <Text style={styles.finalValue}>
                {formatCurrency(finalAmount)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Submit Order Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitOrder}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.light} />
          ) : (
            <>
              <MaterialIcons
                name="check-circle"
                size={24}
                color={COLORS.light}
              />
              <Text style={styles.submitButtonText}>Place Order</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContainer: {
    flex: 1,
  },
  fefoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(92, 148, 13, 0.1)",
    padding: 12,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 8,
  },
  fefoBannerText: {
    fontSize: 13,
    color: COLORS.dark,
    marginLeft: 8,
    flex: 1,
  },
  reviewMasterCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 15,
    marginBottom: 10,
  },
  reviewCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F3F5",
  },
  orderItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    paddingBottom: 12,
    marginBottom: 12,
  },
  orderItemDetails: {
    flex: 1,
    paddingRight: 10,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 3,
  },
  batchInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  fefoTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(92, 148, 13, 0.1)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  fefoTagText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "bold",
    marginLeft: 2,
  },
  fefoSplitInfo: {
    marginTop: 2,
  },
  fefoSplitBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(92, 148, 13, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  fefoSplitText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "bold",
    marginLeft: 2,
  },
  splitBatchesContainer: {
    backgroundColor: "rgba(92, 148, 13, 0.05)",
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 4,
  },
  splitBatchItem: {
    fontSize: 11,
    color: COLORS.dark,
    marginBottom: 2,
  },
  returnItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 3,
  },
  orderItemBatch: {
    fontSize: 13,
    color: "#6C757D",
    marginTop: 2,
  },
  orderItemInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
  },
  orderItemPrice: {
    fontSize: 14,
    color: "#6C757D",
    marginRight: 10,
  },
  orderItemDiscount: {
    fontSize: 14,
    color: "#DC3545",
  },
  orderItemTotal: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
    textAlign: "right",
  },
  returnItemTotal: {
    fontSize: 15,
    fontWeight: "600",
    color: "#DC3545",
    textAlign: "right",
  },
  returnReason: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#6C757D",
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  discountValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC3545",
  },
  returnTotalValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC3545",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  infoLabel: {
    width: 120,
    fontSize: 14,
    fontWeight: "500",
    color: "#6C757D",
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  paymentTypeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 10,
  },
  paymentOptions: {
    flexDirection: "row",
    marginBottom: 15,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  paymentSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paymentTypeText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
    marginLeft: 5,
  },
  paymentTextSelected: {
    color: COLORS.light,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 10,
  },
  notesInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    minHeight: 80,
    fontSize: 15,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  summaryCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
  },
  fefoCompliantBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(92, 148, 13, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  fefoCompliantText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
    marginLeft: 6,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.dark,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
  },
  totalDeduction: {
    fontSize: 15,
    fontWeight: "600",
    color: "#DC3545",
  },
  finalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 5,
    borderTopWidth: 1,
    borderColor: "#E9ECEF",
  },
  finalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  finalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    backgroundColor: COLORS.light,
    padding: 15,
    borderTopWidth: 1,
    borderColor: "#E9ECEF",
    elevation: 10,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    paddingBottom: Platform.OS === "ios" ? 25 : 15,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  submitButtonText: {
    color: COLORS.light,
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },
});
