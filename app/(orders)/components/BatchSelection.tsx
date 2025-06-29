// app/(main)/(orders)/components/BatchSelection.tsx

import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { COLORS } from "../../theme/colors";
import {
  Batch,
  formatCurrency,
  formatDate,
  ModalType,
  useOrderContext,
} from "../context/OrderContext";

export default function BatchSelection() {
  const { state, dispatch } = useOrderContext();
  const {
    activeModal,
    selectedProduct,
    productBatches,
    selectedBatch,
    loading,
  } = state;

  // Auto-select the first batch (earliest expiry) when batches are loaded and proceed directly
  useEffect(() => {
    if (productBatches.length > 0 && activeModal === ModalType.Batch) {
      // The backend already sorts by expiry_date ASC, so the first batch is the earliest expiry
      const earliestExpiryBatch = productBatches[0];

      // Auto select and proceed to quantity selection
      dispatch({ type: "SET_SELECTED_BATCH", payload: earliestExpiryBatch });
      dispatch({ type: "SET_ACTIVE_MODAL", payload: ModalType.Quantity });
      dispatch({ type: "SET_CURRENT_QUANTITY", payload: 1 });
      dispatch({ type: "SET_CURRENT_DISCOUNT", payload: 0 });
    }
  }, [productBatches, activeModal]);

  // Handle batch selection - strictly enforce FEFO with no override option
  const handleBatchSelect = (batch: Batch, index: number) => {
    if (index === 0) {
      // This is the FEFO-compliant batch, allow selection
      dispatch({ type: "SET_SELECTED_BATCH", payload: batch });
      dispatch({ type: "SET_ACTIVE_MODAL", payload: ModalType.Quantity });
      dispatch({ type: "SET_CURRENT_QUANTITY", payload: 1 });
      dispatch({ type: "SET_CURRENT_DISCOUNT", payload: 0 });
    } else {
      // Strictly enforce FEFO - do not allow selection of non-FEFO batches
      alert(
        "FEFO (First Expired, First Out) policy strictly enforced. Only the batch with earliest expiry date can be selected."
      );
    }
  };

  // Close modal
  const handleCloseModal = () => {
    dispatch({ type: "SET_ACTIVE_MODAL", payload: ModalType.None });
    dispatch({ type: "SET_SELECTED_PRODUCT", payload: null });
    dispatch({ type: "SET_SELECTED_BATCH", payload: null });
    dispatch({ type: "SET_PRODUCT_BATCHES", payload: [] });
  };

  // Get remaining shelf life in days
  const getRemainingShelfLife = (expiryDate: string): number => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <Modal
      isVisible={activeModal === ModalType.Batch}
      onBackdropPress={handleCloseModal}
      backdropOpacity={0.5}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver={true}
      accessible={true}
      accessibilityViewIsModal={true}
      accessibilityLabel="Select batch modal"
    >
      <View style={styles.modalContent}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Batch</Text>
          <TouchableOpacity
            onPress={handleCloseModal}
            accessible={true}
            accessibilityLabel="Close batch selection"
          >
            <AntDesign name="close" size={24} color={COLORS.dark} />
          </TouchableOpacity>
        </View>

        {/* Product Name */}
        {selectedProduct && (
          <Text style={styles.productSelected}>{selectedProduct.name}</Text>
        )}

        {/* FEFO Explanation */}
        <View style={styles.fefoExplanation}>
          <MaterialCommunityIcons
            name="information-outline"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.fefoExplanationText}>
            FEFO (First Expired, First Out) method is strictly enforced. The
            system automatically selects the batch with earliest expiry date.
          </Text>
        </View>

        <Text style={styles.batchSectionTitle}>
          Selected Batch (FEFO Enforced)
        </Text>

        {/* Batch List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading batches...</Text>
          </View>
        ) : productBatches.length > 0 ? (
          <ScrollView
            style={styles.batchList}
            showsVerticalScrollIndicator={false}
            accessible={true}
            accessibilityLabel="Batch list"
          >
            {productBatches.map((batch, index) => {
              const daysRemaining = getRemainingShelfLife(batch.expiry_date);
              // Do not need isFefoCompliant variable anymore

              return (
                <TouchableOpacity
                  key={batch.batch_id}
                  style={[
                    styles.batchCard,
                    index === 0 && styles.fefoCompliantBatch,
                    index !== 0 && styles.nonFefoCompliantBatch,
                  ]}
                  onPress={() => handleBatchSelect(batch, index)}
                  disabled={index !== 0} // Disable non-FEFO batches
                  accessible={true}
                  accessibilityLabel={`Batch ${
                    batch.batch_number
                  }, Expiry: ${formatDate(batch.expiry_date)}, Quantity: ${
                    batch.current_quantity
                  }, Price: ${formatCurrency(batch.selling_price)}${
                    index === 0
                      ? ", FEFO compliant batch"
                      : ", Not selectable due to FEFO policy"
                  }`}
                >
                  <View style={styles.batchDetails}>
                    <View style={styles.batchHeaderRow}>
                      <Text style={styles.batchNumber}>
                        Batch: {batch.batch_number}
                        {index === 0 && (
                          <Text style={styles.fefoTag}> (SELECTED)</Text>
                        )}
                      </Text>
                      {index === 0 && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={COLORS.primary}
                        />
                      )}
                    </View>
                    <View style={styles.batchInfoRow}>
                      <View style={styles.batchInfoItem}>
                        <Text style={styles.batchInfoLabel}>Expiry:</Text>
                        <Text
                          style={[
                            styles.batchInfoValue,
                            daysRemaining < 30 && styles.nearExpiryText,
                          ]}
                        >
                          {formatDate(batch.expiry_date)}
                          {daysRemaining < 30 && (
                            <Text style={styles.expiryWarning}>
                              {" "}
                              ({daysRemaining} days)
                            </Text>
                          )}
                        </Text>
                      </View>
                      <View style={styles.batchInfoItem}>
                        <Text style={styles.batchInfoLabel}>Stock:</Text>
                        <Text style={styles.batchInfoValue}>
                          {batch.current_quantity}
                        </Text>
                      </View>
                      <View style={styles.batchInfoItem}>
                        <Text style={styles.batchInfoLabel}>Price:</Text>
                        <Text style={styles.batchInfoValue}>
                          {formatCurrency(batch.selling_price)}
                        </Text>
                      </View>
                    </View>
                    {batch.supplier_name && (
                      <Text style={styles.batchSupplier}>
                        Supplier: {batch.supplier_name}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="package-variant"
              size={50}
              color="#ADB5BD"
            />
            <Text style={styles.emptyStateText}>
              No batches available for this product
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 5,
  },
  fefoExplanation: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(92, 148, 13, 0.1)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  fefoExplanationText: {
    fontSize: 12,
    color: COLORS.dark,
    marginLeft: 8,
    flex: 1,
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
  fefoCompliantBatch: {
    borderColor: COLORS.primary,
    borderLeftWidth: 5,
    backgroundColor: "rgba(92, 148, 13, 0.05)",
  },
  nonFefoCompliantBatch: {
    opacity: 0.6,
    backgroundColor: "#f5f5f5",
    borderColor: "#ddd",
    borderStyle: "dashed",
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
  fefoTag: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 12,
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
  nearExpiryText: {
    color: "#dc3545",
  },
  expiryWarning: {
    fontWeight: "700",
    fontSize: 12,
  },
  batchSupplier: {
    fontSize: 12,
    color: "#6C757D",
    marginTop: 3,
    fontStyle: "italic",
  },
  loadingContainer: {
    padding: 30,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.secondary,
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
  },
  emptyStateText: {
    marginTop: 10,
    color: "#6C757D",
    textAlign: "center",
  },
});
