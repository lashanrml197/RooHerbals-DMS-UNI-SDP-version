// app/(main)/(orders)/components/ProductSelection.tsx

import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { getProductBatches, getProducts } from "../../services/addOrderApi";
import { COLORS } from "../../theme/colors";
import {
  CartItem,
  createFefoOrder,
  formatCurrency,
  formatDate,
  getFefoCompliantBatch,
  getRemainingShelfLife,
  getTotalStockFromBatches,
  ModalType,
  OrderStage,
  Product,
  useOrderContext,
} from "../context/OrderContext";

// Import BatchSelection component - FEFO enforced version
import BatchSelection from "./BatchSelection";

export default function ProductSelection() {
  const { state, dispatch } = useOrderContext();

  // Load products when component mounts
  useEffect(() => {
    loadProducts();
  }, []);

  // Filter products when search changes
  useEffect(() => {
    if (state.productSearch.trim() === "") {
      dispatch({ type: "SET_FILTERED_PRODUCTS", payload: state.products });
    } else {
      const searchTerm = state.productSearch.toLowerCase();
      const filtered = state.products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm) ||
          (product.category_name &&
            product.category_name.toLowerCase().includes(searchTerm))
      );
      dispatch({ type: "SET_FILTERED_PRODUCTS", payload: filtered });
    }
  }, [state.productSearch, state.products]);

  // Load products from API
  const loadProducts = async () => {
    if (!state.networkConnected) {
      dispatch({
        type: "SET_ERROR",
        payload: "No internet connection. Please check your network settings.",
      });
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const data = await getProducts();

      if (Array.isArray(data)) {
        dispatch({ type: "SET_PRODUCTS", payload: data });
      } else {
        console.warn("Product data is invalid:", data);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
      dispatch({
        type: "SET_ERROR",
        payload: "Failed to load products. Please try again.",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Load product batches when a product is selected
  const loadProductBatches = async (productId: string) => {
    if (!state.networkConnected) {
      dispatch({
        type: "SET_ERROR",
        payload: "No internet connection. Please check your network settings.",
      });
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const data = await getProductBatches(productId);

      if (Array.isArray(data)) {
        // Store batches in state (already sorted by expiry_date ASC from the backend)
        dispatch({ type: "SET_PRODUCT_BATCHES", payload: data });

        if (data.length > 0) {
          // Auto-select the FEFO-compliant batch (earliest expiry) and proceed directly to quantity selection
          const fefoCompliantBatch = getFefoCompliantBatch(data);

          if (fefoCompliantBatch) {
            dispatch({
              type: "SET_SELECTED_BATCH",
              payload: fefoCompliantBatch,
            });
            dispatch({ type: "SET_ACTIVE_MODAL", payload: ModalType.Quantity });
            dispatch({ type: "SET_CURRENT_QUANTITY", payload: 1 });
            dispatch({ type: "SET_CURRENT_DISCOUNT", payload: 0 });
          } else {
            // Show batch selection modal if something went wrong with auto-selection
            dispatch({ type: "SET_ACTIVE_MODAL", payload: ModalType.Batch });
          }
        } else {
          // No batches available
          Alert.alert("No Batches", "No batches available for this product", [
            {
              text: "OK",
              onPress: () =>
                dispatch({ type: "SET_SELECTED_PRODUCT", payload: null }),
            },
          ]);
        }
      } else {
        console.warn("Batch data is invalid:", data);
        Alert.alert("Data Error", "Failed to load product batches properly");
      }
    } catch (err) {
      console.error("Failed to load product batches:", err);
      dispatch({
        type: "SET_ERROR",
        payload: "Failed to load product batches. Please try again.",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    if (product.total_stock <= 0) {
      Alert.alert("Out of Stock", "This product is currently out of stock.");
      return;
    }

    dispatch({ type: "SET_SELECTED_PRODUCT", payload: product });
    loadProductBatches(product.product_id);
  };

  // Validate quantity and discount inputs
  const validateQuantityAndDiscount = (): boolean => {
    if (!state.selectedProduct || !state.selectedBatch) {
      dispatch({
        type: "SET_ERROR",
        payload: "Please select a product and batch",
      });
      return false;
    }

    if (state.currentQuantity <= 0) {
      dispatch({
        type: "SET_ERROR",
        payload: "Quantity must be greater than 0",
      });
      return false;
    }

    // Get total available quantity across all batches (for FEFO split orders)
    const totalAvailable = getTotalStockFromBatches(state.productBatches);

    if (state.currentQuantity > totalAvailable) {
      dispatch({
        type: "SET_ERROR",
        payload: `Only ${totalAvailable} items available across all batches`,
      });
      return false;
    }

    if (state.currentDiscount < 0) {
      dispatch({ type: "SET_ERROR", payload: "Discount cannot be negative" });
      return false;
    }

    // Check if discount is greater than total price
    const totalPrice =
      (state.selectedBatch?.selling_price || 0) * state.currentQuantity;
    if (state.currentDiscount > totalPrice) {
      dispatch({
        type: "SET_ERROR",
        payload: "Discount cannot be greater than total price",
      });
      return false;
    }

    return true;
  };

  // Add item to cart
  const handleAddToCart = () => {
    if (!validateQuantityAndDiscount()) {
      return;
    }

    if (!state.selectedProduct || !state.selectedBatch) {
      return;
    }

    // Determine if we need to split this order across multiple batches (FEFO)
    const needsFefoSplit =
      state.currentQuantity > state.selectedBatch.current_quantity;

    // If we need to split, we'll create a split order
    if (needsFefoSplit) {
      const cartItem = createFefoOrder(
        state.selectedProduct,
        state.productBatches,
        state.currentQuantity,
        state.currentDiscount
      );

      if (cartItem) {
        dispatch({ type: "ADD_TO_CART", payload: cartItem });

        // Show FEFO split information
        Alert.alert(
          "FEFO Split Order",
          `Your order of ${state.currentQuantity} items will be fulfilled using multiple batches following FEFO (First Expired, First Out) policy.`,
          [{ text: "OK" }]
        );
      }
    } else {
      // Standard case - just using the FEFO-compliant batch
      // Calculate total price with discount
      const totalBeforeDiscount =
        state.selectedBatch.selling_price * state.currentQuantity;
      const totalPrice = totalBeforeDiscount - state.currentDiscount;

      // Create cart item
      const newItem: CartItem = {
        product_id: state.selectedProduct.product_id,
        product_name: state.selectedProduct.name,
        batch_id: state.selectedBatch.batch_id,
        batch_number: state.selectedBatch.batch_number,
        unit_price: state.selectedBatch.selling_price,
        quantity: state.currentQuantity,
        discount: state.currentDiscount,
        total_price: totalPrice,
        max_quantity: state.selectedBatch.current_quantity,
        is_fefo_split: false,
      };

      dispatch({ type: "ADD_TO_CART", payload: newItem });

      // Show success feedback with FEFO note
      Alert.alert(
        "Success",
        "Item added to cart successfully. FEFO (First Expired, First Out) policy applied."
      );
    }

    // Reset UI state
    dispatch({ type: "SET_ACTIVE_MODAL", payload: ModalType.None });
    dispatch({ type: "SET_SELECTED_PRODUCT", payload: null });
    dispatch({ type: "SET_SELECTED_BATCH", payload: null });
    dispatch({ type: "SET_PRODUCT_BATCHES", payload: [] });
    dispatch({ type: "SET_CURRENT_QUANTITY", payload: 1 });
    dispatch({ type: "SET_CURRENT_DISCOUNT", payload: 0 });
  };

  // Handle removing item from cart
  const handleRemoveFromCart = (index: number) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from your cart?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          onPress: () => {
            dispatch({ type: "REMOVE_FROM_CART", payload: index });
          },
          style: "destructive",
        },
      ]
    );
  };

  // Proceed to next stage
  const handleProceedToNextStage = () => {
    if (state.cartItems.length === 0) {
      dispatch({
        type: "SET_ERROR",
        payload: "Please add at least one product to your order",
      });
      return;
    }

    /* 
    // Returns feature is not fully implemented yet
    if (state.hasReturns) {
      dispatch({ type: "SET_STAGE", payload: OrderStage.ReturnProducts }); // Returns stage
    } else {
      dispatch({ type: "SET_STAGE", payload: OrderStage.ReviewOrder }); // Review order stage
    }
    */

    // Always go to review order stage since returns are not implemented
    dispatch({ type: "SET_STAGE", payload: OrderStage.ReviewOrder });
    dispatch({ type: "SET_ACTIVE_MODAL", payload: ModalType.None });
  };

  // Render product item
  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        item.total_stock <= 0 && styles.outOfStockCard,
      ]}
      onPress={() => handleProductSelect(item)}
      disabled={item.total_stock <= 0}
      accessible={true}
      accessibilityLabel={`${item.name}, ${
        item.total_stock > 0 ? "In stock" : "Out of stock"
      }`}
      accessibilityHint={
        item.total_stock > 0
          ? "Double tap to select this product"
          : "This product is out of stock"
      }
    >
      <View
        style={[
          styles.productIcon,
          item.total_stock <= 0 && styles.outOfStockIcon,
        ]}
      >
        <Feather
          name={item.total_stock > 0 ? "box" : "slash"}
          size={20}
          color={COLORS.light}
        />
      </View>
      <View style={styles.productDetails}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>
          {item.category_name || "Uncategorized"}
        </Text>
        <View style={styles.productInfoRow}>
          <Text style={styles.productPrice}>
            {formatCurrency(item.unit_price)}
          </Text>
          <Text
            style={[
              styles.stockLabel,
              item.total_stock <= 0 && styles.outOfStock,
            ]}
          >
            {item.total_stock > 0
              ? `In Stock: ${item.total_stock}`
              : "Out of Stock"}
          </Text>
        </View>
      </View>
      {item.total_stock > 0 && (
        <MaterialIcons name="arrow-forward-ios" size={16} color="#ADB5BD" />
      )}
    </TouchableOpacity>
  );

  // Render cart items
  const renderCartItem = (item: CartItem, index: number) => (
    <View
      key={`${item.product_id}-${item.batch_id}`}
      style={styles.cartItem}
      accessible={true}
      accessibilityLabel={`${item.product_name}, Quantity: ${
        item.quantity
      }, Price: ${formatCurrency(item.unit_price)}, Total: ${formatCurrency(
        item.total_price
      )}`}
    >
      <View style={styles.cartItemDetails}>
        <Text style={styles.cartItemName}>{item.product_name}</Text>
        <View style={styles.batchWithFefo}>
          {item.is_fefo_split ? (
            <View style={styles.fefoSplitInfo}>
              <Text style={styles.cartItemBatch}>Multiple Batches (FEFO)</Text>
              <View style={styles.fefoSplitIndicator}>
                <MaterialCommunityIcons
                  name="layers-triple"
                  size={14}
                  color={COLORS.primary}
                />
                <Text style={styles.fefoSplitText}>Split Order</Text>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.cartItemBatch}>
                Batch: {item.batch_number}
              </Text>
              <View style={styles.fefoIndicator}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={12}
                  color={COLORS.primary}
                />
                <Text style={styles.fefoIndicatorText}>FEFO</Text>
              </View>
            </>
          )}
        </View>

        {/* Optional batch details for split orders */}
        {item.is_fefo_split && item.fefo_batches && (
          <View style={styles.splitBatchesContainer}>
            {item.fefo_batches.map((batch, batchIndex) => (
              <Text key={batch.batch_id} style={styles.splitBatchItem}>
                • Batch {batch.batch_number}: {batch.quantity} units (Exp:{" "}
                {formatDate(batch.expiry_date)})
              </Text>
            ))}
          </View>
        )}

        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemPrice}>
            {formatCurrency(item.unit_price)} x {item.quantity}
          </Text>
          {item.discount > 0 && (
            <Text style={styles.cartItemDiscount}>
              Discount: {formatCurrency(item.discount)}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.cartItemActions}>
        <Text style={styles.cartItemTotal}>
          {formatCurrency(item.total_price)}
        </Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFromCart(index)}
          accessible={true}
          accessibilityLabel={`Remove ${item.product_name} from cart`}
        >
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.contentContainer}>
      {/* Customer info */}
      {state.selectedCustomer && (
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            Selected Customer: {state.selectedCustomer.name}
          </Text>
        </View>
      )}

      {/* FEFO Policy Indicator */}
      <View style={styles.fefoContainer}>
        <MaterialCommunityIcons
          name="calendar-clock"
          size={16}
          color={COLORS.primary}
        />
        <Text style={styles.fefoText}>
          FEFO (First Expired, First Out) policy is strictly enforced. Orders
          larger than a single batch will be fulfilled from multiple batches in
          expiry date order.
        </Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={22}
          color={COLORS.dark}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products by name or category..."
          value={state.productSearch}
          onChangeText={(text) =>
            dispatch({ type: "SET_PRODUCT_SEARCH", payload: text })
          }
          accessible={true}
          accessibilityLabel="Search products"
          accessibilityHint="Enter text to search for products"
        />
        {state.productSearch.length > 0 && (
          <TouchableOpacity
            onPress={() =>
              dispatch({ type: "SET_PRODUCT_SEARCH", payload: "" })
            }
            accessible={true}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={22} color={COLORS.dark} />
          </TouchableOpacity>
        )}
      </View>

      {/* Product list */}
      {state.loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : state.filteredProducts.length > 0 ? (
        <FlatList
          data={state.filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.product_id}
          style={styles.productList}
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          accessible={true}
          accessibilityLabel="Product list"
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="package-variant-closed"
            size={50}
            color="#ADB5BD"
          />
          <Text style={styles.emptyStateText}>No products found</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadProducts}
            accessible={true}
            accessibilityLabel="Retry loading products"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating cart button */}
      {state.cartItems.length > 0 && (
        <TouchableOpacity
          style={styles.floatingCartButton}
          onPress={() =>
            dispatch({ type: "SET_ACTIVE_MODAL", payload: ModalType.Cart })
          }
          accessible={true}
          accessibilityLabel={`View cart with ${state.cartItems.length} items`}
        >
          <Ionicons name="cart" size={24} color={COLORS.light} />
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{state.cartItems.length}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Fixed bottom button */}
      <View style={styles.fixedBottomContainer}>
        {state.cartItems.length > 0 ? (
          <TouchableOpacity
            style={styles.proceedButton}
            onPress={handleProceedToNextStage}
            accessible={true}
            accessibilityLabel="Review order"
          >
            <Text style={styles.proceedButtonText}>Review Order</Text>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={COLORS.light}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addFirstProductButton}
            onPress={() => {
              if (state.filteredProducts.length > 0) {
                // Find the first in-stock product
                const firstAvailableProduct = state.filteredProducts.find(
                  (p) => p.total_stock > 0
                );
                if (firstAvailableProduct) {
                  handleProductSelect(firstAvailableProduct);
                } else {
                  dispatch({
                    type: "SET_ERROR",
                    payload: "No products are currently in stock",
                  });
                }
              } else {
                dispatch({
                  type: "SET_ERROR",
                  payload: "No products available to add",
                });
              }
            }}
            accessible={true}
            accessibilityLabel="Add first product"
          >
            <AntDesign name="plus" size={20} color={COLORS.light} />
            <Text style={styles.addFirstProductButtonText}>
              Add First Product
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Batch Selection Modal - Using custom BatchSelection component */}
      <BatchSelection />

      {/* Quantity Selection Modal */}
      <Modal
        isVisible={state.activeModal === ModalType.Quantity}
        onBackdropPress={() => {
          dispatch({ type: "SET_ACTIVE_MODAL", payload: ModalType.None });
          dispatch({ type: "SET_SELECTED_PRODUCT", payload: null });
          dispatch({ type: "SET_SELECTED_BATCH", payload: null });
        }}
        backdropOpacity={0.5}
        style={styles.modal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        useNativeDriver={true}
        accessible={true}
        accessibilityViewIsModal={true}
        accessibilityLabel="Set quantity and discount modal"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Quantity and Discount</Text>
            <TouchableOpacity
              onPress={() => {
                dispatch({ type: "SET_ACTIVE_MODAL", payload: ModalType.None });
                dispatch({ type: "SET_SELECTED_PRODUCT", payload: null });
                dispatch({ type: "SET_SELECTED_BATCH", payload: null });
              }}
              accessible={true}
              accessibilityLabel="Close quantity selection"
            >
              <AntDesign name="close" size={24} color={COLORS.dark} />
            </TouchableOpacity>
          </View>

          {state.selectedBatch && state.selectedProduct && (
            <>
              <Text style={styles.productSelected}>
                {state.selectedProduct.name}
              </Text>

              {/* FEFO Batch Information */}
              <View style={styles.fefoSelectedBatch}>
                <View style={styles.fefoTagContainer}>
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={16}
                    color={COLORS.light}
                  />
                  <Text style={styles.fefoTagText}>FEFO</Text>
                </View>
                <Text style={styles.batchInfoText}>
                  Primary Batch: {state.selectedBatch.batch_number}
                </Text>
                <Text style={styles.batchInfoText}>
                  Expires: {formatDate(state.selectedBatch.expiry_date)}
                  {getRemainingShelfLife(state.selectedBatch.expiry_date) <
                    30 && (
                    <Text style={styles.expiryAlert}>
                      {" "}
                      ({getRemainingShelfLife(
                        state.selectedBatch.expiry_date
                      )}{" "}
                      days remaining)
                    </Text>
                  )}
                </Text>

                {/* FEFO Multi-batch Information */}
                <Text style={styles.totalAvailableText}>
                  Total Available:{" "}
                  {getTotalStockFromBatches(state.productBatches)} units across{" "}
                  {state.productBatches.length} batches
                </Text>

                {/* FEFO Note */}
                {state.productBatches.length > 1 && (
                  <Text style={styles.fefoNoteText}>
                    For orders larger than{" "}
                    {state.selectedBatch.current_quantity} units, additional
                    batches will be used following FEFO policy.
                  </Text>
                )}
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Quantity:</Text>
                <View style={styles.quantitySelector}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() =>
                      dispatch({
                        type: "SET_CURRENT_QUANTITY",
                        payload: Math.max(1, state.currentQuantity - 1),
                      })
                    }
                    accessible={true}
                    accessibilityLabel="Decrease quantity"
                  >
                    <AntDesign name="minus" size={16} color={COLORS.dark} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.quantityInput}
                    value={state.currentQuantity.toString()}
                    onChangeText={(text) => {
                      const value = parseInt(text);
                      if (!isNaN(value) && value > 0) {
                        const totalAvailable = getTotalStockFromBatches(
                          state.productBatches
                        );
                        dispatch({
                          type: "SET_CURRENT_QUANTITY",
                          payload: Math.min(value, totalAvailable),
                        });

                        // Show FEFO split notification if quantity exceeds first batch
                        if (
                          state.selectedBatch &&
                          value > state.selectedBatch.current_quantity &&
                          value <= totalAvailable
                        ) {
                          dispatch({
                            type: "SET_ERROR",
                            payload: `This quantity requires using multiple batches following FEFO policy.`,
                          });

                          setTimeout(() => {
                            dispatch({ type: "SET_ERROR", payload: null });
                          }, 3000);
                        }
                      } else if (text === "") {
                        dispatch({ type: "SET_CURRENT_QUANTITY", payload: 0 });
                      }
                    }}
                    keyboardType="numeric"
                    accessible={true}
                    accessibilityLabel={`Quantity, currently ${state.currentQuantity}`}
                    accessibilityHint={`Maximum available: ${getTotalStockFromBatches(
                      state.productBatches
                    )}`}
                  />
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => {
                      const totalAvailable = getTotalStockFromBatches(
                        state.productBatches
                      );
                      const newQuantity = Math.min(
                        totalAvailable,
                        state.currentQuantity + 1
                      );

                      dispatch({
                        type: "SET_CURRENT_QUANTITY",
                        payload: newQuantity,
                      });

                      // Show FEFO split notification if quantity exceeds first batch
                      if (
                        state.selectedBatch &&
                        newQuantity > state.selectedBatch.current_quantity
                      ) {
                        dispatch({
                          type: "SET_ERROR",
                          payload: `This quantity requires using multiple batches following FEFO policy.`,
                        });

                        setTimeout(() => {
                          dispatch({ type: "SET_ERROR", payload: null });
                        }, 3000);
                      }
                    }}
                    accessible={true}
                    accessibilityLabel="Increase quantity"
                  >
                    <AntDesign name="plus" size={16} color={COLORS.dark} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Discount (Rs.):</Text>
                <TextInput
                  style={styles.discountInput}
                  value={state.currentDiscount.toString()}
                  onChangeText={(text) => {
                    const value = parseFloat(text);
                    if (!isNaN(value) && value >= 0) {
                      // Ensure discount isn't greater than total price
                      const totalPrice =
                        (state.selectedBatch?.selling_price || 0) *
                        state.currentQuantity;
                      dispatch({
                        type: "SET_CURRENT_DISCOUNT",
                        payload: Math.min(value, totalPrice),
                      });
                    } else if (text === "") {
                      dispatch({ type: "SET_CURRENT_DISCOUNT", payload: 0 });
                    }
                  }}
                  keyboardType="numeric"
                  placeholder="0.00"
                  accessible={true}
                  accessibilityLabel="Discount amount"
                />
              </View>

              <View style={styles.pricingSummary}>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Unit Price:</Text>
                  <Text style={styles.pricingValue}>
                    {formatCurrency(state.selectedBatch.selling_price)}
                  </Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Quantity:</Text>
                  <Text style={styles.pricingValue}>
                    {state.currentQuantity}
                  </Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Subtotal:</Text>
                  <Text style={styles.pricingValue}>
                    {formatCurrency(
                      state.selectedBatch.selling_price * state.currentQuantity
                    )}
                  </Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Discount:</Text>
                  <Text style={styles.discountValue}>
                    - {formatCurrency(state.currentDiscount)}
                  </Text>
                </View>
                <View style={styles.pricingRowTotal}>
                  <Text style={styles.pricingLabelTotal}>Total:</Text>
                  <Text style={styles.pricingValueTotal}>
                    {formatCurrency(
                      (state.selectedBatch?.selling_price || 0) *
                        state.currentQuantity -
                        state.currentDiscount
                    )}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addToCartButton}
                onPress={handleAddToCart}
                accessible={true}
                accessibilityLabel="Add to cart"
              >
                <Ionicons name="cart" size={20} color={COLORS.light} />
                <Text style={styles.addToCartButtonText}>Add to Cart</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* Cart Summary Modal */}
      <Modal
        isVisible={state.activeModal === ModalType.Cart}
        onBackdropPress={() =>
          dispatch({ type: "SET_ACTIVE_MODAL", payload: ModalType.None })
        }
        backdropOpacity={0.5}
        style={styles.modal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        useNativeDriver={true}
        accessible={true}
        accessibilityViewIsModal={true}
        accessibilityLabel="Cart summary modal"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cart Summary</Text>
            <TouchableOpacity
              onPress={() =>
                dispatch({ type: "SET_ACTIVE_MODAL", payload: ModalType.None })
              }
              accessible={true}
              accessibilityLabel="Close cart summary"
            >
              <AntDesign name="close" size={24} color={COLORS.dark} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.cartItemsList}
            showsVerticalScrollIndicator={false}
            accessible={true}
            accessibilityLabel="Cart items list"
          >
            {state.cartItems.map((item, index) => renderCartItem(item, index))}
          </ScrollView>

          <View style={styles.cartTotals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(
                  state.cartItems.reduce(
                    (acc, item) => acc + item.total_price,
                    0
                  )
                )}
              </Text>
            </View>

            {/* Customer "wants to return products" section commented out as it's not fully implemented
            <View style={styles.returnCheckbox}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() =>
                  dispatch({
                    type: "SET_HAS_RETURNS",
                    payload: !state.hasReturns,
                  })
                }
                accessible={true}
                accessibilityLabel={`Customer wants to return products: ${
                  state.hasReturns ? "Yes" : "No"
                }`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: state.hasReturns }}
              >
                {state.hasReturns ? (
                  <Ionicons name="checkbox" size={22} color={COLORS.primary} />
                ) : (
                  <Ionicons
                    name="square-outline"
                    size={22}
                    color={COLORS.dark}
                  />
                )}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>
                Customer wants to return products
              </Text>
            </View>
            */}
          </View>

          <TouchableOpacity
            style={styles.proceedButton}
            onPress={handleProceedToNextStage}
            accessible={true}
            accessibilityLabel="Review order"
          >
            <Text style={styles.proceedButtonText}>Review Order</Text>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={COLORS.light}
            />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// This function is no longer needed as we're importing formatDate from OrderContext

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  customerInfo: {
    marginBottom: 10,
  },
  customerName: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: "500",
  },
  fefoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(92, 148, 13, 0.1)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  fefoText: {
    fontSize: 12,
    color: COLORS.dark,
    marginLeft: 8,
    flex: 1,
  },
  fefoSelectedBatch: {
    backgroundColor: "rgba(92, 148, 13, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    marginTop: 5,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  fefoTagContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  fefoTagText: {
    color: COLORS.light,
    fontWeight: "bold",
    fontSize: 10,
    marginLeft: 4,
  },
  fefoIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  fefoIndicatorText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "700",
    marginLeft: 2,
  },
  fefoSplitInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  fefoSplitIndicator: {
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
  batchInfoText: {
    fontSize: 13,
    color: COLORS.dark,
    marginBottom: 2,
  },
  totalAvailableText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.dark,
    marginTop: 6,
  },
  fefoNoteText: {
    fontSize: 12,
    fontStyle: "italic",
    color: COLORS.dark,
    marginTop: 6,
  },
  expiryAlert: {
    color: "#dc3545",
    fontWeight: "bold",
  },
  batchWithFefo: {
    flexDirection: "row",
    alignItems: "center",
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 55,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    marginLeft: 5,
  },
  productList: {
    flex: 1,
  },
  productCard: {
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
  outOfStockCard: {
    opacity: 0.7,
    borderColor: "#CED4DA",
  },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  outOfStockIcon: {
    backgroundColor: "#CED4DA",
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 3,
  },
  productCategory: {
    fontSize: 13,
    color: "#6C757D",
    marginTop: 2,
  },
  productInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  stockLabel: {
    fontSize: 13,
    color: "#28A745",
  },
  outOfStock: {
    color: "#DC3545",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.secondary,
    fontSize: 14,
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
    padding: 12,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 14,
  },
  floatingCartButton: {
    position: "absolute",
    bottom: 90, // Moved higher to not overlap with fixed bottom button
    right: 20,
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 998, // Less than bottom container but above content
  },
  cartBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF6B6B",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: {
    color: COLORS.light,
    fontSize: 12,
    fontWeight: "bold",
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
    zIndex: 999, // Ensure it's always on top
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
  addFirstProductButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
  },
  addFirstProductButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  modal: {
    margin: 0,
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
  productSelected: {
    fontSize: 15,
    color: COLORS.secondary,
    marginBottom: 15,
  },
  batchSectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 15,
    marginTop: 5,
  },
  batchList: {
    maxHeight: 350,
  },
  batchCard: {
    flexDirection: "row",
    alignItems: "center",
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
  selectedBatchCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: "rgba(92, 148, 13, 0.05)",
  },
  batchDetails: {
    flex: 1,
  },
  batchHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  batchNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  batchInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  batchInfoItem: {
    flex: 1,
  },
  batchInfoLabel: {
    fontSize: 13,
    color: "#6C757D",
    fontWeight: "500",
  },
  batchInfoValue: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: "600",
    marginTop: 2,
  },
  batchSupplier: {
    fontSize: 12,
    color: "#6C757D",
    marginTop: 3,
    fontStyle: "italic",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.dark,
    width: 120,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    flex: 1,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  quantityInput: {
    height: 40,
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E9ECEF",
  },
  discountInput: {
    height: 40,
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 5,
  },
  pricingSummary: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderColor: "#E9ECEF",
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pricingLabel: {
    fontSize: 14,
    color: "#6C757D",
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  discountValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#DC3545",
  },
  pricingRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#E9ECEF",
  },
  pricingLabelTotal: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  pricingValueTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  addToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 15,
  },
  addToCartButtonText: {
    color: COLORS.light,
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  cartItemsList: {
    maxHeight: 300,
    marginBottom: 15,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderColor: "#E9ECEF",
  },
  cartItemDetails: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  cartItemBatch: {
    fontSize: 13,
    color: "#6C757D",
    marginTop: 2,
  },
  cartItemInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    flexWrap: "wrap",
  },
  cartItemPrice: {
    fontSize: 13,
    color: "#6C757D",
    marginRight: 10,
  },
  cartItemDiscount: {
    fontSize: 13,
    color: "#DC3545",
  },
  cartItemActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginRight: 10,
  },
  removeButton: {
    padding: 5,
  },
  cartTotals: {
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
  returnCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  checkboxContainer: {
    marginRight: 10,
    padding: 5, // Added padding for better touch target
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.dark,
  },
});
