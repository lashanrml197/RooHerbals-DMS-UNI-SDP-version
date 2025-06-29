import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { COLORS } from "../theme/colors";
import { router, useLocalSearchParams } from "expo-router";
import {
  FontAwesome5,
  MaterialCommunityIcons,
  Feather,
  AntDesign,
  Ionicons,
  MaterialIcons,
  Entypo,
} from "@expo/vector-icons";

interface Batch {
  batchId: string;
  quantity: number;
  manufacturingDate: string;
  expiryDate: string;
  supplier: string;
  status: "active" | "expired" | "expiring_soon";
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  totalStock: number;
  minStockLevel: number;
  unitPrice: number;
  unit: string;
  batches: Batch[];
}

export default function InventoryUpdateScreen() {
  const params = useLocalSearchParams();
  const { itemId, action, batchId } = params;

  // State for updating quantity
  const [quantity, setQuantity] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState(
    (batchId as string) || ""
  );
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // State for new batch (only for "add" action)
  const [showNewBatchForm, setShowNewBatchForm] = useState(false);
  const [newBatchId, setNewBatchId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [manufacturingDate, setManufacturingDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");

  // Mock inventory item data
  const item: InventoryItem = {
    id: itemId as string,
    name: "Herbal Shampoo",
    category: "Hair Care",
    totalStock: 145,
    minStockLevel: 50,
    unitPrice: 350,
    unit: "bottle",
    batches: [
      {
        batchId: "B2024-001",
        quantity: 85,
        manufacturingDate: "2024-01-10",
        expiryDate: "2025-01-10",
        supplier: "Herbal Extracts Inc.",
        status: "active",
      },
      {
        batchId: "B2024-008",
        quantity: 60,
        manufacturingDate: "2024-02-15",
        expiryDate: "2025-02-15",
        supplier: "Herb Garden Co.",
        status: "active",
      },
    ],
  };

  // Format date for display
  interface DateFormatOptions {
    year: "numeric";
    month: "short";
    day: "numeric";
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: DateFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  // Generate title based on action
  const getTitle = () => {
    switch (action) {
      case "add":
        return "Add Stock";
      case "remove":
        return "Remove Stock";
      case "adjust":
        return "Adjust Stock";
      default:
        return "Update Stock";
    }
  };

  // Generate description based on action
  const getDescription = () => {
    switch (action) {
      case "add":
        return "Add new stock to inventory. You can add to an existing batch or create a new batch.";
      case "remove":
        return "Remove stock from inventory. Select a batch and specify the quantity to remove.";
      case "adjust":
        return "Adjust stock levels for reconciliation. This will update the actual stock quantity.";
      default:
        return "Update stock information in your inventory.";
    }
  };

  // Generate button text based on action
  const getButtonText = () => {
    switch (action) {
      case "add":
        return "Add Stock";
      case "remove":
        return "Remove Stock";
      case "adjust":
        return "Adjust Stock";
      default:
        return "Update Stock";
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    // Validate inputs
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert("Error", "Please enter a valid quantity");
      return;
    }

    if ((action === "remove" || action === "adjust") && !selectedBatchId) {
      Alert.alert("Error", "Please select a batch");
      return;
    }

    if (action === "add" && showNewBatchForm) {
      // Validate new batch details
      if (!newBatchId) {
        Alert.alert("Error", "Please enter a batch ID");
        return;
      }
      if (!supplier) {
        Alert.alert("Error", "Please enter a supplier name");
        return;
      }
      if (!manufacturingDate) {
        Alert.alert("Error", "Please enter a manufacturing date");
        return;
      }
      if (!expiryDate) {
        Alert.alert("Error", "Please enter an expiry date");
        return;
      }
    }

    // In a real app, this would update the database
    const message = getSuccessMessage();
    Alert.alert("Success", message, [
      {
        text: "OK",
        onPress: () => router.back(),
      },
    ]);
  };

  // Generate success message based on action
  const getSuccessMessage = () => {
    switch (action) {
      case "add":
        return `Added ${quantity} ${item.unit}${
          parseFloat(quantity) > 1 ? "s" : ""
        } to inventory`;
      case "remove":
        return `Removed ${quantity} ${item.unit}${
          parseFloat(quantity) > 1 ? "s" : ""
        } from inventory`;
      case "adjust":
        return `Adjusted inventory to ${quantity} ${item.unit}${
          parseFloat(quantity) > 1 ? "s" : ""
        }`;
      default:
        return "Inventory updated successfully";
    }
  };

  // Generate new batch ID
  const generateNewBatchId = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0");
    return `B${year}-${month}${day}-${random}`;
  };

  // Initialize new batch ID when showing form
  useEffect(() => {
    if (showNewBatchForm) {
      setNewBatchId(generateNewBatchId());
    }
  }, [showNewBatchForm]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Product Information */}
          <View style={styles.section}>
            <View style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productIconContainer}>
                  <MaterialCommunityIcons
                    name="package-variant"
                    size={24}
                    color={COLORS.light}
                  />
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productCategory}>{item.category}</Text>
                </View>
              </View>
              <View style={styles.stockInfo}>
                <View style={styles.stockItem}>
                  <Text style={styles.stockLabel}>Current Stock</Text>
                  <Text style={styles.stockValue}>
                    {item.totalStock} {item.unit}s
                  </Text>
                </View>
                <View style={styles.stockSeparator} />
                <View style={styles.stockItem}>
                  <Text style={styles.stockLabel}>Minimum Level</Text>
                  <Text style={styles.stockValue}>
                    {item.minStockLevel} {item.unit}s
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>{getDescription()}</Text>
          </View>

          {/* Update Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {action === "add"
                ? "Add Stock"
                : action === "remove"
                ? "Remove Stock"
                : "Adjust Stock"}
            </Text>

            <View style={styles.formContainer}>
              {/* Date Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Transaction Date</Text>
                <View style={styles.dateInputContainer}>
                  <MaterialIcons
                    name="event"
                    size={20}
                    color="#6c757d"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.dateInput}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>

              {/* Batch Selection (for remove and adjust) */}
              {(action === "remove" || action === "adjust") && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Select Batch</Text>
                  <View style={styles.batchesContainer}>
                    {item.batches.map((batch) => (
                      <TouchableOpacity
                        key={batch.batchId}
                        style={[
                          styles.batchOption,
                          selectedBatchId === batch.batchId &&
                            styles.selectedBatchOption,
                        ]}
                        onPress={() => setSelectedBatchId(batch.batchId)}
                      >
                        <View style={styles.batchOptionContent}>
                          <Text
                            style={[
                              styles.batchId,
                              selectedBatchId === batch.batchId &&
                                styles.selectedBatchId,
                            ]}
                          >
                            {batch.batchId}
                          </Text>
                          <Text
                            style={[
                              styles.batchQuantity,
                              selectedBatchId === batch.batchId &&
                                styles.selectedBatchQuantity,
                            ]}
                          >
                            {batch.quantity} {item.unit}s
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.batchExpiry,
                            selectedBatchId === batch.batchId &&
                              styles.selectedBatchExpiry,
                          ]}
                        >
                          Expires: {formatDate(batch.expiryDate)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Batch Option Selection (for add) */}
              {action === "add" && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Add to</Text>
                  <View style={styles.batchTypeSelector}>
                    <TouchableOpacity
                      style={[
                        styles.batchTypeOption,
                        !showNewBatchForm && styles.selectedBatchTypeOption,
                      ]}
                      onPress={() => setShowNewBatchForm(false)}
                    >
                      <Text
                        style={[
                          styles.batchTypeText,
                          !showNewBatchForm && styles.selectedBatchTypeText,
                        ]}
                      >
                        Existing Batch
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.batchTypeOption,
                        showNewBatchForm && styles.selectedBatchTypeOption,
                      ]}
                      onPress={() => setShowNewBatchForm(true)}
                    >
                      <Text
                        style={[
                          styles.batchTypeText,
                          showNewBatchForm && styles.selectedBatchTypeText,
                        ]}
                      >
                        New Batch
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Existing Batch Selection (for add) */}
              {action === "add" && !showNewBatchForm && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Select Batch</Text>
                  <View style={styles.batchesContainer}>
                    {item.batches.map((batch) => (
                      <TouchableOpacity
                        key={batch.batchId}
                        style={[
                          styles.batchOption,
                          selectedBatchId === batch.batchId &&
                            styles.selectedBatchOption,
                        ]}
                        onPress={() => setSelectedBatchId(batch.batchId)}
                      >
                        <View style={styles.batchOptionContent}>
                          <Text
                            style={[
                              styles.batchId,
                              selectedBatchId === batch.batchId &&
                                styles.selectedBatchId,
                            ]}
                          >
                            {batch.batchId}
                          </Text>
                          <Text
                            style={[
                              styles.batchQuantity,
                              selectedBatchId === batch.batchId &&
                                styles.selectedBatchQuantity,
                            ]}
                          >
                            {batch.quantity} {item.unit}s
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.batchExpiry,
                            selectedBatchId === batch.batchId &&
                              styles.selectedBatchExpiry,
                          ]}
                        >
                          Expires: {formatDate(batch.expiryDate)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* New Batch Form (for add) */}
              {action === "add" && showNewBatchForm && (
                <View style={styles.newBatchSection}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Batch ID</Text>
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons
                        name="identifier"
                        size={20}
                        color="#6c757d"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        value={newBatchId}
                        onChangeText={setNewBatchId}
                        placeholder="Enter batch ID"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Supplier</Text>
                    <View style={styles.inputContainer}>
                      <MaterialIcons
                        name="business"
                        size={20}
                        color="#6c757d"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        value={supplier}
                        onChangeText={setSupplier}
                        placeholder="Enter supplier name"
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View
                      style={[styles.formGroup, { flex: 1, marginRight: 8 }]}
                    >
                      <Text style={styles.formLabel}>Manufacturing Date</Text>
                      <View style={styles.dateInputContainer}>
                        <MaterialIcons
                          name="event"
                          size={20}
                          color="#6c757d"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.dateInput}
                          value={manufacturingDate}
                          onChangeText={setManufacturingDate}
                          placeholder="YYYY-MM-DD"
                        />
                      </View>
                    </View>

                    <View
                      style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}
                    >
                      <Text style={styles.formLabel}>Expiry Date</Text>
                      <View style={styles.dateInputContainer}>
                        <MaterialIcons
                          name="event"
                          size={20}
                          color="#6c757d"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.dateInput}
                          value={expiryDate}
                          onChangeText={setExpiryDate}
                          placeholder="YYYY-MM-DD"
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View
                      style={[styles.formGroup, { flex: 1, marginRight: 8 }]}
                    >
                      <Text style={styles.formLabel}>
                        Cost Price (per unit)
                      </Text>
                      <View style={styles.inputContainer}>
                        <MaterialIcons
                          name="attach-money"
                          size={20}
                          color="#6c757d"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.textInput}
                          value={costPrice}
                          onChangeText={setCostPrice}
                          placeholder="Enter cost price"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <View
                      style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}
                    >
                      <Text style={styles.formLabel}>Purchase Order ID</Text>
                      <View style={styles.inputContainer}>
                        <MaterialCommunityIcons
                          name="file-document-outline"
                          size={20}
                          color="#6c757d"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.textInput}
                          value={purchaseOrderId}
                          onChangeText={setPurchaseOrderId}
                          placeholder="Enter PO ID"
                        />
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Quantity Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {action === "adjust" ? "New Quantity" : "Quantity"}
                </Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons
                    name="numeric"
                    size={20}
                    color="#6c757d"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder={`Enter quantity in ${item.unit}s`}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Notes Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <View style={styles.notesInputContainer}>
                  <TextInput
                    style={styles.notesInput}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Enter notes (optional)"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>{getButtonText()}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 12,
  },
  productCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  productIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: COLORS.secondary,
  },
  stockInfo: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
  },
  stockItem: {
    flex: 1,
    alignItems: "center",
  },
  stockSeparator: {
    width: 1,
    height: "100%",
    backgroundColor: "#DEE2E6",
  },
  stockLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  descriptionContainer: {
    backgroundColor: "rgba(125, 164, 83, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    backgroundColor: "#F8F9FA",
    paddingVertical: 0,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: COLORS.dark,
  },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    backgroundColor: "#F8F9FA",
    paddingVertical: 0,
    paddingHorizontal: 12,
  },
  dateInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: COLORS.dark,
  },
  batchesContainer: {
    marginBottom: 8,
  },
  batchOption: {
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#F8F9FA",
  },
  selectedBatchOption: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(125, 164, 83, 0.1)",
  },
  batchOptionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  batchId: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
  },
  selectedBatchId: {
    color: COLORS.primary,
  },
  batchQuantity: {
    fontSize: 14,
    color: COLORS.dark,
  },
  selectedBatchQuantity: {
    color: COLORS.primary,
  },
  batchExpiry: {
    fontSize: 12,
    color: "#6c757d",
  },
  selectedBatchExpiry: {
    color: COLORS.primary,
  },
  batchTypeSelector: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    overflow: "hidden",
  },
  batchTypeOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  selectedBatchTypeOption: {
    backgroundColor: "rgba(125, 164, 83, 0.1)",
  },
  batchTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6c757d",
  },
  selectedBatchTypeText: {
    color: COLORS.primary,
  },
  newBatchSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  formRow: {
    flexDirection: "row",
  },
  notesInputContainer: {
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  notesInput: {
    minHeight: 100,
    fontSize: 16,
    color: COLORS.dark,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 30,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "700",
  },
});
