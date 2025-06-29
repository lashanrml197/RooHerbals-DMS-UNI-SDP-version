// app/(suppliers)/inventory-batch-add.tsx

import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext"; // Import useAuth hook
import {
  addProductBatch,
  getAllSuppliers,
  getProductById,
} from "../services/supplierApi";
import { COLORS } from "../theme/colors";

// Define interfaces for data types
interface Supplier {
  supplier_id: string;
  name: string;
  contact_person: string;
  phone: string;
}

interface Product {
  product_id: string;
  name: string;
  category_name: string;
  unit_price: number;
  reorder_level: number;
  batches?: Batch[];
}

interface Batch {
  batch_id: string;
  batch_number: string;
  current_quantity: number;
  manufacturing_date: string | null;
  expiry_date: string | null;
  supplier_name: string;
  supplier_id: string;
  cost_price: number;
  selling_price: number;
  created_at: string;
}

export default function AddBatchScreen() {
  const { hasPermission } = useAuth(); // Get hasPermission from auth context
  const { product_id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [batchNumber, setBatchNumber] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  // Check permission on mount
  useEffect(() => {
    if (!hasPermission("manage_inventory")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to add inventory batches.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // Date management
  const [receivedDate, setReceivedDate] = useState(new Date());
  const [manufacturingDate, setManufacturingDate] = useState<Date | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showReceivedPicker, setShowReceivedPicker] = useState(false);
  const [showManufacturingPicker, setShowManufacturingPicker] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

  // Toggle for dates
  const [useManufacturingDate, setUseManufacturingDate] = useState(false);
  const [useExpiryDate, setUseExpiryDate] = useState(false);

  // Error states
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString();
  };

  // Generate batch number when supplier changes - IMPROVED WITH TIME COMPONENT
  const generateBatchNumber = (supplierId: string) => {
    if (!product) return;

    // Get current date in format YYYYMMDD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    // Add time component for more uniqueness (HHMM format)
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const dateStr = `${year}${month}${day}`;
    const timeStr = `${hours}${minutes}`;

    // Get product name prefix (up to 3 characters, uppercase)
    const productPrefix = product.name.substring(0, 3).toUpperCase();

    // Create batch number with product prefix, date, and time
    setBatchNumber(`${productPrefix}-${dateStr}-${timeStr}`);
  };

  // Load product and suppliers data - IMPROVED
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        let productData;
        // Fetch product details
        if (product_id) {
          productData = await getProductById(product_id.toString());
          setProduct(productData);

          // Set default selling price from product
          setSellingPrice(productData.unit_price.toString());
        }

        // Fetch suppliers list
        const suppliersData = await getAllSuppliers();
        setSuppliers(suppliersData);

        // Auto-select supplier and generate batch number based on specific conditions
        if (
          productData &&
          productData.batches &&
          productData.batches.length > 0
        ) {
          // Sort batches by creation date (newest first)
          const sortedBatches = [...productData.batches].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );

          const recentBatch = sortedBatches[0];
          setSelectedSupplier(recentBatch.supplier_id);

          // Pre-fill cost price from recent batch if it exists
          if (recentBatch.cost_price) {
            setCostPrice(recentBatch.cost_price.toString());
          }
        } else if (suppliersData.length === 1) {
          // If only one supplier, select it automatically
          setSelectedSupplier(suppliersData[0].supplier_id);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        Alert.alert("Error", "Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [product_id]);

  // Generate batch number when supplier is selected or product changes
  useEffect(() => {
    if (selectedSupplier && product) {
      generateBatchNumber(selectedSupplier);
    }
  }, [selectedSupplier, product]);

  // Handle supplier selection
  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplier(supplierId);

    // The batch number will be regenerated via the useEffect hook

    // Clear supplier-related error
    const newErrors = { ...errors };
    delete newErrors.supplier;
    setErrors(newErrors);
  };

  // Handle date changes
  const onReceivedDateChange = (event: any, selectedDate?: Date) => {
    setShowReceivedPicker(false);
    if (selectedDate) {
      setReceivedDate(selectedDate);
    }
  };

  const onManufacturingDateChange = (event: any, selectedDate?: Date) => {
    setShowManufacturingPicker(false);
    if (selectedDate) {
      setManufacturingDate(selectedDate);
    }
  };

  const onExpiryDateChange = (event: any, selectedDate?: Date) => {
    setShowExpiryPicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedSupplier) {
      newErrors.supplier = "Please select a supplier";
    }

    if (!batchNumber.trim()) {
      newErrors.batchNumber = "Batch number is required";
    }

    if (!costPrice.trim()) {
      newErrors.costPrice = "Cost price is required";
    } else if (isNaN(Number(costPrice)) || Number(costPrice) <= 0) {
      newErrors.costPrice = "Please enter a valid cost price";
    }

    if (!sellingPrice.trim()) {
      newErrors.sellingPrice = "Selling price is required";
    } else if (isNaN(Number(sellingPrice)) || Number(sellingPrice) <= 0) {
      newErrors.sellingPrice = "Please enter a valid selling price";
    }

    if (!quantity.trim()) {
      newErrors.quantity = "Quantity is required";
    } else if (
      isNaN(Number(quantity)) ||
      Number(quantity) <= 0 ||
      !Number.isInteger(Number(quantity))
    ) {
      newErrors.quantity = "Please enter a valid quantity (whole number)";
    }

    if (useManufacturingDate && !manufacturingDate) {
      newErrors.manufacturingDate = "Please select a manufacturing date";
    }

    if (useExpiryDate && !expiryDate) {
      newErrors.expiryDate = "Please select an expiry date";
    }

    // Check if manufacturing date is before expiry date
    if (
      useManufacturingDate &&
      useExpiryDate &&
      manufacturingDate &&
      expiryDate &&
      manufacturingDate > expiryDate
    ) {
      newErrors.expiryDate = "Expiry date must be after manufacturing date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      // Scroll to first error
      return;
    }

    // Confirm batch addition
    Alert.alert(
      "Confirm Batch Addition",
      `Add ${quantity} units of ${product?.name} with batch number ${batchNumber}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Add Batch", onPress: submitBatch },
      ]
    );
  };

  // Submit batch data to the API
  const submitBatch = async () => {
    if (!product_id || !selectedSupplier) return;

    try {
      setSubmitting(true);

      const batchData = {
        product_id: product_id.toString(),
        supplier_id: selectedSupplier,
        batch_number: batchNumber,
        manufacturing_date:
          useManufacturingDate && manufacturingDate
            ? manufacturingDate.toISOString().split("T")[0]
            : null,
        expiry_date:
          useExpiryDate && expiryDate
            ? expiryDate.toISOString().split("T")[0]
            : null,
        cost_price: parseFloat(costPrice),
        selling_price: parseFloat(sellingPrice),
        initial_quantity: parseInt(quantity, 10),
        received_date: receivedDate.toISOString().split("T")[0],
        notes: notes,
      };

      const result = await addProductBatch(batchData);

      Alert.alert(
        "Success",
        `Successfully added ${quantity} units of ${product?.name}`,
        [
          {
            text: "Go to Product",
            onPress: () =>
              router.replace({
                pathname: "/(suppliers)/inventory-product",
                params: { id: product_id },
              }),
          },
          {
            text: "Add Another Batch",
            onPress: resetForm,
          },
        ]
      );
    } catch (error: any) {
      console.error("Error adding batch:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to add batch. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form for adding another batch
  const resetForm = () => {
    setBatchNumber("");
    setCostPrice("");
    setQuantity("");
    setNotes("");
    setManufacturingDate(null);
    setExpiryDate(null);
    setUseManufacturingDate(false);
    setUseExpiryDate(false);
    setReceivedDate(new Date());
    setErrors({});

    // Generate new batch number
    if (selectedSupplier) {
      generateBatchNumber(selectedSupplier);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Batch</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Batch</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Product Info */}
          <View style={styles.productCard}>
            <View style={styles.productIcon}>
              <MaterialCommunityIcons
                name="package-variant"
                size={28}
                color={COLORS.light}
              />
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product?.name}</Text>
              <Text style={styles.productCategory}>
                {product?.category_name}
              </Text>
              <Text style={styles.productPrice}>Rs. {product?.unit_price}</Text>
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Batch Information</Text>

            {/* Supplier Selector - MODIFIED TO SHOW ONLY SELECTED SUPPLIER */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>
                Supplier <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.supplierContainer,
                  errors.supplier ? styles.inputError : {},
                ]}
              >
                {selectedSupplier ? (
                  <View style={styles.selectedSupplierContainer}>
                    <Text style={styles.selectedSupplierName}>
                      {suppliers.find((s) => s.supplier_id === selectedSupplier)
                        ?.name || "Selected Supplier"}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noSupplierText}>
                    No supplier selected
                  </Text>
                )}
              </View>
              {errors.supplier && (
                <Text style={styles.errorText}>{errors.supplier}</Text>
              )}
            </View>

            {/* Batch Number - MODIFIED TO BE NON-EDITABLE */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>
                Batch Number <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.inputWithIcon}>
                <MaterialCommunityIcons
                  name="barcode"
                  size={20}
                  color="#6c757d"
                  style={styles.inputIcon}
                />
                <View
                  style={[
                    styles.nonEditableInput,
                    errors.batchNumber ? styles.inputError : {},
                  ]}
                >
                  <Text style={styles.nonEditableText}>{batchNumber}</Text>
                </View>
              </View>
              {errors.batchNumber && (
                <Text style={styles.errorText}>{errors.batchNumber}</Text>
              )}
            </View>

            {/* Prices */}
            <View style={styles.rowInputs}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>
                  Cost Price <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.inputWithIcon}>
                  <MaterialIcons
                    name="attach-money"
                    size={20}
                    color="#6c757d"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      errors.costPrice ? styles.inputError : {},
                    ]}
                    value={costPrice}
                    onChangeText={(text) => {
                      setCostPrice(text);
                      if (errors.costPrice) {
                        const newErrors = { ...errors };
                        delete newErrors.costPrice;
                        setErrors(newErrors);
                      }
                    }}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                {errors.costPrice && (
                  <Text style={styles.errorText}>{errors.costPrice}</Text>
                )}
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>
                  Selling Price <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.inputWithIcon}>
                  <MaterialIcons
                    name="attach-money"
                    size={20}
                    color="#6c757d"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      errors.sellingPrice ? styles.inputError : {},
                    ]}
                    value={sellingPrice}
                    onChangeText={(text) => {
                      setSellingPrice(text);
                      if (errors.sellingPrice) {
                        const newErrors = { ...errors };
                        delete newErrors.sellingPrice;
                        setErrors(newErrors);
                      }
                    }}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                {errors.sellingPrice && (
                  <Text style={styles.errorText}>{errors.sellingPrice}</Text>
                )}
              </View>
            </View>

            {/* Quantity */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>
                Quantity <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.inputWithIcon}>
                <MaterialCommunityIcons
                  name="counter"
                  size={20}
                  color="#6c757d"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    errors.quantity ? styles.inputError : {},
                  ]}
                  value={quantity}
                  onChangeText={(text) => {
                    setQuantity(text);
                    if (errors.quantity) {
                      const newErrors = { ...errors };
                      delete newErrors.quantity;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="Enter quantity"
                  keyboardType="number-pad"
                />
              </View>
              {errors.quantity && (
                <Text style={styles.errorText}>{errors.quantity}</Text>
              )}
            </View>

            {/* Dates Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Dates</Text>

              {/* Received Date */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Received Date <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dateSelector}
                  onPress={() => setShowReceivedPicker(true)}
                >
                  <MaterialIcons
                    name="event"
                    size={20}
                    color="#6c757d"
                    style={styles.dateIcon}
                  />
                  <Text style={styles.dateText}>
                    {formatDate(receivedDate)}
                  </Text>
                </TouchableOpacity>
                {showReceivedPicker && (
                  <DateTimePicker
                    value={receivedDate}
                    mode="date"
                    display="default"
                    onChange={onReceivedDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>

              {/* Manufacturing Date */}
              <View style={styles.formGroup}>
                <View style={styles.toggleRow}>
                  <Text style={styles.inputLabel}>Manufacturing Date</Text>
                  <Switch
                    value={useManufacturingDate}
                    onValueChange={setUseManufacturingDate}
                    trackColor={{
                      false: "#e9ecef",
                      true: `${COLORS.primary}80`,
                    }}
                    thumbColor={
                      useManufacturingDate ? COLORS.primary : "#f4f3f4"
                    }
                  />
                </View>
                {useManufacturingDate && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.dateSelector,
                        errors.manufacturingDate ? styles.inputError : {},
                      ]}
                      onPress={() => setShowManufacturingPicker(true)}
                    >
                      <MaterialIcons
                        name="event"
                        size={20}
                        color="#6c757d"
                        style={styles.dateIcon}
                      />
                      <Text style={styles.dateText}>
                        {manufacturingDate
                          ? formatDate(manufacturingDate)
                          : "Select manufacturing date"}
                      </Text>
                    </TouchableOpacity>
                    {errors.manufacturingDate && (
                      <Text style={styles.errorText}>
                        {errors.manufacturingDate}
                      </Text>
                    )}
                    {showManufacturingPicker && (
                      <DateTimePicker
                        value={manufacturingDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={onManufacturingDateChange}
                        maximumDate={new Date()}
                      />
                    )}
                  </>
                )}
              </View>

              {/* Expiry Date */}
              <View style={styles.formGroup}>
                <View style={styles.toggleRow}>
                  <Text style={styles.inputLabel}>Expiry Date</Text>
                  <Switch
                    value={useExpiryDate}
                    onValueChange={setUseExpiryDate}
                    trackColor={{
                      false: "#e9ecef",
                      true: `${COLORS.primary}80`,
                    }}
                    thumbColor={useExpiryDate ? COLORS.primary : "#f4f3f4"}
                  />
                </View>
                {useExpiryDate && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.dateSelector,
                        errors.expiryDate ? styles.inputError : {},
                      ]}
                      onPress={() => setShowExpiryPicker(true)}
                    >
                      <MaterialIcons
                        name="event"
                        size={20}
                        color="#6c757d"
                        style={styles.dateIcon}
                      />
                      <Text style={styles.dateText}>
                        {expiryDate
                          ? formatDate(expiryDate)
                          : "Select expiry date"}
                      </Text>
                    </TouchableOpacity>
                    {errors.expiryDate && (
                      <Text style={styles.errorText}>{errors.expiryDate}</Text>
                    )}
                    {showExpiryPicker && (
                      <DateTimePicker
                        value={expiryDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={onExpiryDateChange}
                        minimumDate={new Date()}
                      />
                    )}
                  </>
                )}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <View style={styles.inputWithIcon}>
                <MaterialIcons
                  name="note"
                  size={20}
                  color="#6c757d"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes about this batch"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.light} />
              ) : (
                <>
                  <MaterialIcons
                    name="add-circle"
                    size={20}
                    color={COLORS.light}
                  />
                  <Text style={styles.submitButtonText}>Add Batch</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
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
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 10,
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
  headerPlaceholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.dark,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light,
    borderRadius: 10,
    padding: 16,
    margin: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productIcon: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
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
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  formSection: {
    backgroundColor: COLORS.light,
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 80,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  requiredAsterisk: {
    color: "#E74C3C",
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingLeft: 40,
    fontSize: 16,
    color: COLORS.dark,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    zIndex: 1,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  inputError: {
    borderColor: "#E74C3C",
  },
  errorText: {
    color: "#E74C3C",
    fontSize: 12,
    marginTop: 4,
  },
  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  supplierContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  selectedSupplierContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedSupplierName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  noSupplierText: {
    fontSize: 14,
    color: "#6c757d",
    fontStyle: "italic",
  },
  nonEditableInput: {
    flex: 1,
    height: 48,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingLeft: 40,
    justifyContent: "center",
  },
  nonEditableText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    height: 48,
  },
  dateIcon: {
    marginRight: 12,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  submitButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.light,
    marginLeft: 8,
  },
});
