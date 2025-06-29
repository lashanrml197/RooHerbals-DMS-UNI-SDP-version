// app/(main)/(orders)/components/ReturnSelection.tsx

import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getCustomerOrders, getOrderItems } from "../../services/addOrderApi";
import { COLORS } from "../../theme/colors";
import {
  formatCurrency,
  formatDate,
  ModalType,
  OrderItem,
  OrderStage,
  ReturnItem,
  useOrderContext,
} from "../context/OrderContext";

// Define valid return reasons that match backend validation
const VALID_RETURN_REASONS = ["damaged", "expired", "unwanted", "wrong_item"];

export default function ReturnSelection() {
  const { state, dispatch } = useOrderContext();
  // Use an object to store return quantities per item
  const [returnQuantities, setReturnQuantities] = useState<{
    [key: string]: string;
  }>({});
  // Default to first valid reason to ensure compatibility with backend
  const [selectedReason, setSelectedReason] = useState<string>(
    VALID_RETURN_REASONS[0]
  );
  // Track which input is currently focused
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  // Reference to scroll view to scroll to focused input
  const scrollViewRef = useRef<ScrollView>(null);

  // Load customer orders when component mounts
  useEffect(() => {
    loadCustomerOrders();
  }, []);

  // Load customer orders
  const loadCustomerOrders = async () => {
    if (!state.selectedCustomer) return;

    if (!state.networkConnected) {
      dispatch({
        type: "SET_ERROR",
        payload: "No internet connection. Please check your network settings.",
      });
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      console.log(
        "Loading orders for customer ID:",
        state.selectedCustomer.customer_id
      );
      const data = await getCustomerOrders(state.selectedCustomer.customer_id);

      console.log("Orders loaded:", data);
      if (Array.isArray(data)) {
        dispatch({ type: "SET_CUSTOMER_ORDERS", payload: data });

        if (data.length === 0) {
          Alert.alert(
            "No Previous Orders",
            "This customer doesn't have any previous orders to process returns."
          );
        }
      } else {
        console.warn("Customer orders data is invalid:", data);
      }
    } catch (err) {
      console.error("Failed to load customer orders:", err);
      dispatch({
        type: "SET_ERROR",
        payload: "Failed to load customer orders. Please try again.",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Load order items for a specific order
  const loadOrderItems = async (orderId: string) => {
    if (!state.networkConnected) {
      dispatch({
        type: "SET_ERROR",
        payload: "No internet connection. Please check your network settings.",
      });
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const data = await getOrderItems(orderId);

      if (Array.isArray(data)) {
        dispatch({ type: "SET_ORDER_ITEMS", payload: data });

        if (data.length === 0) {
          Alert.alert(
            "No Items",
            "This order doesn't have any items that can be returned."
          );
        }
      } else {
        console.warn("Order items data is invalid:", data);
      }
    } catch (err) {
      console.error("Failed to load order items:", err);
      dispatch({
        type: "SET_ERROR",
        payload: "Failed to load order items. Please try again.",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Select an order for returns
  const handleOrderSelectForReturn = (order: any) => {
    dispatch({ type: "SET_SELECTED_ORDER_FOR_RETURN", payload: order });
    loadOrderItems(order.order_id);
    dispatch({ type: "SET_ACTIVE_MODAL", payload: ModalType.ReturnItems });
  };

  // Validate return quantity
  const validateReturnQuantity = (
    item: OrderItem,
    returnQty: number
  ): boolean => {
    if (returnQty <= 0) {
      dispatch({
        type: "SET_ERROR",
        payload: "Return quantity must be greater than 0",
      });
      return false;
    }

    // Get existing return item if any
    const existingReturnItem = state.returnItems.find(
      (ri) => ri.product_id === item.product_id && ri.batch_id === item.batch_id
    );

    // Calculate remaining quantity that can be returned
    const alreadyReturned = existingReturnItem?.quantity || 0;
    const maxAllowed = item.quantity - alreadyReturned;

    if (returnQty > maxAllowed) {
      dispatch({
        type: "SET_ERROR",
        payload: `Cannot return more than ${maxAllowed} items`,
      });
      return false;
    }

    return true;
  };

  // Add item to returns
  const handleAddReturn = (item: OrderItem, returnQty: number) => {
    if (!validateReturnQuantity(item, returnQty)) {
      return;
    }

    // Calculate total price
    const totalPrice = item.unit_price * returnQty;

    // Get a valid reason - use selectedReason (which defaults to a valid reason)
    // or fallback to first valid reason if somehow invalid
    const reason = VALID_RETURN_REASONS.includes(selectedReason)
      ? selectedReason
      : VALID_RETURN_REASONS[0];

    // Create return item
    const returnItem: ReturnItem = {
      product_id: item.product_id,
      product_name: item.product_name,
      batch_id: item.batch_id,
      batch_number: item.batch_number,
      quantity: returnQty,
      unit_price: item.unit_price,
      total_price: totalPrice,
      reason: reason, // Use valid reason that matches backend
      max_quantity: item.quantity,
    };

    // Add to return items
    dispatch({ type: "ADD_RETURN_ITEM", payload: returnItem });

    // Show success message
    Alert.alert("Success", "Return item added successfully");
  };

  // Handle incrementing quantity
  const handleIncrement = (itemId: string, maxQuantity: number) => {
    const currentValue = returnQuantities[itemId] || "0";
    const newValue = parseInt(currentValue) + 1;

    if (newValue <= maxQuantity) {
      setReturnQuantities((prev) => ({
        ...prev,
        [itemId]: newValue.toString(),
      }));
    } else {
      dispatch({
        type: "SET_ERROR",
        payload: `Cannot return more than ${maxQuantity} items`,
      });
    }
  };

  // Handle decrementing quantity
  const handleDecrement = (itemId: string) => {
    const currentValue = returnQuantities[itemId] || "0";
    const newValue = Math.max(0, parseInt(currentValue) - 1);

    setReturnQuantities((prev) => ({
      ...prev,
      [itemId]: newValue.toString(),
    }));
  };

  // Remove an item from returns
  const handleRemoveFromReturns = (index: number) => {
    Alert.alert(
      "Remove Return Item",
      "Are you sure you want to remove this item from returns?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          onPress: () => {
            dispatch({ type: "REMOVE_RETURN_ITEM", payload: index });
          },
          style: "destructive",
        },
      ]
    );
  };

  // Handle reason selection
  const handleReasonChange = (reason: string) => {
    setSelectedReason(reason);
    dispatch({ type: "SET_RETURN_REASON", payload: reason });
  };

  // Skip returns and go to review
  const handleSkipReturns = () => {
    dispatch({ type: "SET_HAS_RETURNS", payload: false });
    dispatch({ type: "SET_STAGE", payload: OrderStage.ReviewOrder });
  };

  // Proceed to review with returns
  const handleProceedToReview = () => {
    if (state.returnItems.length === 0) {
      // If no returns were added, ask if they want to proceed without returns
      Alert.alert(
        "No Returns Added",
        "You haven't added any returns. Do you want to proceed without returns?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Yes, Proceed",
            onPress: () => {
              dispatch({ type: "SET_HAS_RETURNS", payload: false });
              dispatch({ type: "SET_STAGE", payload: OrderStage.ReviewOrder });
            },
          },
        ]
      );
    } else {
      // Proceed with the returns
      dispatch({ type: "SET_STAGE", payload: OrderStage.ReviewOrder });
    }
  };

  return (
    <View style={styles.contentContainer}>
      {!state.selectedOrderForReturn && (
        <>
          <Text
            style={styles.sectionLabel}
            accessible={true}
            accessibilityLabel="Select order for returns section"
          >
            Select Order for Returns:
          </Text>

          {state.customerOrders.length > 0 ? (
            <ScrollView
              style={[styles.ordersList, { marginBottom: 100 }]}
              showsVerticalScrollIndicator={false}
              accessible={true}
              accessibilityLabel="Orders list"
            >
              {state.customerOrders.map((order) => (
                <TouchableOpacity
                  key={order.order_id}
                  style={styles.orderCard}
                  onPress={() => handleOrderSelectForReturn(order)}
                  accessible={true}
                  accessibilityLabel={`Order ${
                    order.order_id
                  }, Date: ${formatDate(
                    order.order_date
                  )}, Amount: ${formatCurrency(order.total_amount)}, Status: ${
                    order.status
                  }`}
                  accessibilityHint="Double tap to select this order for returns"
                >
                  <View style={styles.orderIcon}>
                    <MaterialIcons
                      name="receipt"
                      size={20}
                      color={COLORS.light}
                    />
                  </View>
                  <View style={styles.orderDetails}>
                    <Text style={styles.orderNumber}>
                      Order #{order.order_id}
                    </Text>
                    <Text style={styles.orderDate}>
                      {formatDate(order.order_date)}
                    </Text>
                    <Text style={styles.orderAmount}>
                      {formatCurrency(order.total_amount)}
                    </Text>
                    <View
                      style={[
                        styles.orderStatusBadge,
                        order.status === "delivered"
                          ? styles.statusDelivered
                          : styles.statusProcessing,
                      ]}
                    >
                      <Text style={styles.orderStatusText}>{order.status}</Text>
                    </View>
                  </View>
                  <MaterialIcons
                    name="arrow-forward-ios"
                    size={16}
                    color="#ADB5BD"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="package-variant"
                size={50}
                color="#ADB5BD"
              />
              <Text style={styles.emptyStateText}>
                No previous orders found
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadCustomerOrders}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Returns summary view (shown when return items are added) */}
      {state.returnItems.length > 0 && (
        <>
          <View style={styles.returnsSummaryContainer}>
            <View style={styles.returnsSummaryHeader}>
              <Text
                style={styles.returnsSummaryTitle}
                accessible={true}
                accessibilityLabel="Returns summary"
              >
                Returns Summary
              </Text>
              <Text
                style={styles.returnsItemCount}
                accessible={true}
                accessibilityLabel={`${state.returnItems.length} items`}
              >
                {state.returnItems.length} items
              </Text>
            </View>

            <ScrollView
              style={[styles.returnsItemsList, { marginBottom: 80 }]}
              showsVerticalScrollIndicator={false}
              accessible={true}
              accessibilityLabel="Returns items list"
            >
              {state.returnItems.map((item, index) => (
                <View
                  key={`${item.product_id}-${item.batch_id}`}
                  style={styles.returnItem}
                  accessible={true}
                  accessibilityLabel={`Return ${item.product_name}, Quantity: ${
                    item.quantity
                  }, Price: ${formatCurrency(
                    item.unit_price
                  )}, Total: ${formatCurrency(item.total_price)}`}
                >
                  <View style={styles.returnItemDetails}>
                    <Text style={styles.returnItemName}>
                      {item.product_name}
                    </Text>
                    <Text style={styles.returnItemBatch}>
                      Batch: {item.batch_number}
                    </Text>
                    <Text style={styles.returnItemInfo}>
                      {formatCurrency(item.unit_price)} x {item.quantity}
                    </Text>
                    <Text style={styles.returnItemReason}>
                      Reason: {item.reason}
                    </Text>
                  </View>
                  <View style={styles.returnItemActions}>
                    <Text style={styles.returnItemTotal}>
                      {formatCurrency(item.total_price)}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveFromReturns(index)}
                      accessible={true}
                      accessibilityLabel={`Remove ${item.product_name} from returns`}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#FF6B6B"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Return reason input - REPLACED WITH DROPDOWN */}
            <View style={styles.returnReasonContainer}>
              <Text
                style={styles.sectionLabel}
                accessible={true}
                accessibilityLabel="Return reason section"
              >
                Return Reason:
              </Text>

              <View style={styles.reasonButtonsContainer}>
                {VALID_RETURN_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonButton,
                      selectedReason === reason && styles.reasonButtonSelected,
                    ]}
                    onPress={() => handleReasonChange(reason)}
                    accessible={true}
                    accessibilityLabel={`Select reason: ${reason}`}
                  >
                    <Text
                      style={[
                        styles.reasonButtonText,
                        selectedReason === reason &&
                          styles.reasonButtonTextSelected,
                      ]}
                    >
                      {reason.charAt(0).toUpperCase() + reason.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.returnsTotals}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Returns Total:</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(
                    state.returnItems.reduce(
                      (acc, item) => acc + item.total_price,
                      0
                    )
                  )}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Loading indicator */}
      {state.loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading items...</Text>
        </View>
      )}

      {/* Fixed bottom container with skip/proceed buttons */}
      <View style={styles.fixedBottomContainer}>
        {state.returnItems.length > 0 ? (
          <TouchableOpacity
            style={styles.proceedButton}
            onPress={handleProceedToReview}
            accessible={true}
            accessibilityLabel="Proceed to review"
          >
            <Text style={styles.proceedButtonText}>Proceed to Review</Text>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={COLORS.light}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipReturns}
            accessible={true}
            accessibilityLabel="Skip returns"
          >
            <Text style={styles.skipButtonText}>Skip Returns</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Return Items Modal */}
      <Modal
        visible={state.activeModal === ModalType.ReturnItems}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          dispatch({ type: "SET_ACTIVE_MODAL", payload: ModalType.None });
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Items to Return</Text>
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    dispatch({
                      type: "SET_ACTIVE_MODAL",
                      payload: ModalType.None,
                    });
                  }}
                  accessible={true}
                  accessibilityLabel="Close returns selection"
                >
                  <AntDesign name="close" size={24} color={COLORS.dark} />
                </TouchableOpacity>
              </View>

              <Text
                style={styles.orderSelected}
                accessible={true}
                accessibilityLabel={`Selected order: ${state.selectedOrderForReturn?.order_id}`}
              >
                Order #{state.selectedOrderForReturn?.order_id}
              </Text>

              {/* Return reason selection inside modal */}
              <View style={styles.modalReasonContainer}>
                <Text style={styles.modalReasonLabel}>
                  Select Return Reason:
                </Text>
                <View style={styles.reasonButtonsContainer}>
                  {VALID_RETURN_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonButton,
                        selectedReason === reason &&
                          styles.reasonButtonSelected,
                      ]}
                      onPress={() => handleReasonChange(reason)}
                      accessible={true}
                      accessibilityLabel={`Select reason: ${reason}`}
                    >
                      <Text
                        style={[
                          styles.reasonButtonText,
                          selectedReason === reason &&
                            styles.reasonButtonTextSelected,
                        ]}
                      >
                        {reason.charAt(0).toUpperCase() + reason.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {state.orderItems.length > 0 ? (
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.orderItemsList}
                  showsVerticalScrollIndicator={false}
                  accessible={true}
                  accessibilityLabel="Order items list"
                  keyboardShouldPersistTaps="handled"
                >
                  {state.orderItems.map((item) => {
                    // Check if item is already in returns
                    const returnItem = state.returnItems.find(
                      (ri) =>
                        ri.product_id === item.product_id &&
                        ri.batch_id === item.batch_id
                    );
                    const maxQuantity =
                      item.quantity - (returnItem?.quantity || 0);
                    // Use order_item_id as key for returnQuantities
                    const inputValue =
                      returnQuantities[item.order_item_id] || "";

                    return (
                      <View
                        key={item.order_item_id}
                        style={styles.orderItemCard}
                        accessible={true}
                        accessibilityLabel={`${item.product_name}, Batch: ${
                          item.batch_number
                        }, Quantity: ${item.quantity}, ${
                          maxQuantity > 0
                            ? "Available for return: " + maxQuantity
                            : "Maximum already returned"
                        }`}
                      >
                        <View style={styles.orderItemDetails}>
                          <Text style={styles.orderItemName}>
                            {item.product_name}
                          </Text>
                          <Text style={styles.orderItemBatch}>
                            Batch: {item.batch_number}
                          </Text>
                          <View style={styles.orderItemInfo}>
                            <Text style={styles.orderItemPrice}>
                              {formatCurrency(item.unit_price)} x{" "}
                              {item.quantity}
                            </Text>
                            {item.discount > 0 && (
                              <Text style={styles.orderItemDiscount}>
                                Discount: {formatCurrency(item.discount)}
                              </Text>
                            )}
                          </View>
                        </View>

                        {maxQuantity > 0 ? (
                          <View style={styles.returnQuantityContainer}>
                            <Text style={styles.returnQuantityLabel}>
                              Return Qty:
                            </Text>

                            {/* Quantity selector with up/down buttons */}
                            <View style={styles.quantitySelector}>
                              <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() =>
                                  handleDecrement(item.order_item_id)
                                }
                              >
                                <AntDesign
                                  name="minuscircleo"
                                  size={24}
                                  color={COLORS.primary}
                                />
                              </TouchableOpacity>

                              <TextInput
                                style={[
                                  styles.returnQuantityInput,
                                  focusedInput === item.order_item_id &&
                                    styles.returnQuantityInputFocused,
                                ]}
                                keyboardType="numeric"
                                placeholder="0"
                                value={inputValue}
                                onChangeText={(text) => {
                                  // Remove any non-numeric characters
                                  const numericValue = text.replace(
                                    /[^0-9]/g,
                                    ""
                                  );
                                  setReturnQuantities((prev) => ({
                                    ...prev,
                                    [item.order_item_id]: numericValue,
                                  }));
                                }}
                                onFocus={() => {
                                  setFocusedInput(item.order_item_id);
                                  // Allow the TextInput to mount first
                                  setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd();
                                  }, 100);
                                }}
                                onBlur={() => {
                                  setFocusedInput(null);
                                }}
                                accessible={true}
                                accessibilityLabel={`Enter return quantity, maximum: ${maxQuantity}`}
                              />

                              <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() =>
                                  handleIncrement(
                                    item.order_item_id,
                                    maxQuantity
                                  )
                                }
                              >
                                <AntDesign
                                  name="pluscircleo"
                                  size={24}
                                  color={COLORS.primary}
                                />
                              </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                              style={styles.addButton}
                              onPress={() => {
                                const value = parseInt(inputValue);
                                if (
                                  !isNaN(value) &&
                                  value > 0 &&
                                  value <= maxQuantity
                                ) {
                                  handleAddReturn(item, value);
                                  // Clear only this input after adding
                                  setReturnQuantities((prev) => ({
                                    ...prev,
                                    [item.order_item_id]: "",
                                  }));
                                  Keyboard.dismiss();
                                } else if (value > maxQuantity) {
                                  dispatch({
                                    type: "SET_ERROR",
                                    payload: `Cannot return more than ${maxQuantity} items`,
                                  });
                                } else {
                                  dispatch({
                                    type: "SET_ERROR",
                                    payload: "Please enter a valid quantity",
                                  });
                                }
                              }}
                            >
                              <Text style={styles.addButtonText}>Add</Text>
                            </TouchableOpacity>
                            <Text style={styles.maxQuantityLabel}>
                              Max: {maxQuantity}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.returnQuantityContainer}>
                            <Text style={styles.returnedLabel}>
                              {returnItem
                                ? `Returning: ${returnItem.quantity}`
                                : "Max returned"}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="package-variant-closed"
                    size={50}
                    color="#ADB5BD"
                  />
                  <Text style={styles.emptyStateText}>
                    No items in this order
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => {
                  Keyboard.dismiss();
                  dispatch({
                    type: "SET_ACTIVE_MODAL",
                    payload: ModalType.None,
                  });
                }}
                accessible={true}
                accessibilityLabel="Done selecting return items"
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 15,
    backgroundColor: "#F8F9FA",
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 15,
    marginTop: 5,
  },
  ordersList: {
    flex: 1,
    marginBottom: 15,
  },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F3F5",
  },
  orderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  orderDetails: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 3,
  },
  orderDate: {
    fontSize: 13,
    color: "#6C757D",
    marginTop: 2,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.secondary,
    marginTop: 2,
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 5,
  },
  statusDelivered: {
    backgroundColor: "#28A745",
  },
  statusProcessing: {
    backgroundColor: "#FFC107",
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.light,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6C757D",
    marginTop: 10,
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    width: 140,
    alignItems: "center",
  },
  retryButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 16,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    zIndex: 999,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.secondary,
    fontSize: 14,
  },
  orderSelected: {
    fontSize: 15,
    color: COLORS.secondary,
    marginBottom: 15,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.light,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 25,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#E9ECEF",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  orderItemsList: {
    maxHeight: 300,
    marginBottom: 15,
  },
  orderItemCard: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemName: {
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
    marginTop: 2,
    flexWrap: "wrap",
  },
  orderItemPrice: {
    fontSize: 13,
    color: "#6C757D",
    marginRight: 10,
  },
  orderItemDiscount: {
    fontSize: 13,
    color: "#DC3545",
  },
  returnQuantityContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    width: 120,
  },
  returnQuantityLabel: {
    fontSize: 13,
    color: "#6C757D",
    marginBottom: 5,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  quantityButton: {
    padding: 5,
  },
  returnQuantityInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 16,
    backgroundColor: COLORS.light,
    marginHorizontal: 5,
  },
  returnQuantityInputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  maxQuantityLabel: {
    fontSize: 12,
    color: "#6C757D",
    marginTop: 3,
  },
  returnedLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.primary,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 15,
  },
  doneButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 16,
  },
  returnsSummaryContainer: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  returnsSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#E9ECEF",
  },
  returnsSummaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  returnsItemCount: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.secondary,
  },
  returnsItemsList: {
    maxHeight: 200,
    marginBottom: 15,
  },
  returnItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderColor: "#E9ECEF",
  },
  returnItemDetails: {
    flex: 1,
  },
  returnItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
  },
  returnItemBatch: {
    fontSize: 13,
    color: "#6C757D",
    marginTop: 2,
  },
  returnItemInfo: {
    fontSize: 13,
    color: "#6C757D",
    marginTop: 2,
  },
  returnItemReason: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 2,
    fontStyle: "italic",
  },
  returnItemActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  returnItemTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginRight: 10,
  },
  removeButton: {
    padding: 5,
  },
  returnReasonContainer: {
    marginBottom: 15,
  },
  reasonButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  reasonButton: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  reasonButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  reasonButtonText: {
    fontSize: 14,
    color: COLORS.dark,
  },
  reasonButtonTextSelected: {
    color: COLORS.light,
    fontWeight: "500",
  },
  modalReasonContainer: {
    marginBottom: 15,
    backgroundColor: "#F8F9FA",
    padding: 10,
    borderRadius: 8,
  },
  modalReasonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  returnsTotals: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#E9ECEF",
    marginBottom: 15,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  fixedBottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 15,
    borderTopWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 999,
  },
  proceedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
  },
  proceedButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 16,
    marginRight: 8,
  },
  skipButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    padding: 16,
  },
  skipButtonText: {
    color: COLORS.secondary,
    fontWeight: "600",
    fontSize: 16,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 15,
  },
});
