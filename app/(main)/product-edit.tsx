// Import necessary components and libraries
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
import { useAuth } from "../context/AuthContext";
import {
  getCategories,
  getProductById,
  updateProduct,
} from "../services/productApi";
import { COLORS } from "../theme/colors";

// Define the structure for a Category object
interface Category {
  category_id: string;
  name: string;
}

// Define the structure for a Product object
interface Product {
  product_id: string;
  name: string;
  description: string;
  category_id: string;
  category_name: string;
  unit_price: number;
  reorder_level: number;
  is_company_product: number;
  is_active: number;
  batches?: any[];
}

// Main component for editing a product
export default function ProductEditScreen() {
  const { hasPermission } = useAuth(); // Get hasPermission from auth context
  const { id } = useLocalSearchParams<{ id: string }>(); // Get product ID from route params

  // Check for user permission to manage products when the component mounts
  useEffect(() => {
    if (!hasPermission("manage_products")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to edit products.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // State to hold the product details
  const [product, setProduct] = useState<Product | null>(null);

  // State for form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [isCompanyProduct, setIsCompanyProduct] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // State for categories and loading indicators
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // State to hold form validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Fetch product data and categories when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch available categories
        const categoriesData = await getCategories();
        setCategories(categoriesData);

        // Fetch the specific product's details if an ID is provided
        if (id) {
          const productData = await getProductById(id);
          const typedProductData = productData as Product;
          setProduct(typedProductData);

          // Populate form fields with the fetched product data
          setName(typedProductData.name);
          setDescription(typedProductData.description || "");
          setCategoryId(typedProductData.category_id);
          setUnitPrice(String(typedProductData.unit_price));
          setReorderLevel(String(typedProductData.reorder_level));
          setIsCompanyProduct(Boolean(typedProductData.is_company_product));
          setIsActive(Boolean(typedProductData.is_active));
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        Alert.alert(
          "Error",
          "Failed to load product details. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Function to validate the form fields
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Check for required fields
    if (!name.trim()) newErrors.name = "Product name is required";
    if (!categoryId) newErrors.category_id = "Category is required";
    if (!unitPrice.trim()) {
      newErrors.unit_price = "Unit price is required";
    } else if (isNaN(Number(unitPrice)) || Number(unitPrice) <= 0) {
      newErrors.unit_price = "Unit price must be a positive number";
    }

    // Validate reorder level if a value is provided
    if (
      reorderLevel &&
      (isNaN(Number(reorderLevel)) || Number(reorderLevel) < 0)
    ) {
      newErrors.reorder_level = "Reorder level must be a non-negative number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  // Handle the save button press to update the product
  const handleSave = async () => {
    try {
      // Stop if form is invalid
      if (!validateForm()) {
        return;
      }

      setSubmitting(true);

      // Prepare the data for the update API call
      const updateData = {
        name,
        description,
        category_id: categoryId,
        unit_price: Number(unitPrice),
        reorder_level: Number(reorderLevel),
        is_company_product: isCompanyProduct ? 1 : 0,
        is_active: isActive ? 1 : 0,
      };

      console.log("Updating product with data:", JSON.stringify(updateData));

      // Call the API to update the product
      await updateProduct(id as string, updateData);

      // Show success message and navigate back to the previous screen
      Alert.alert("Success", "Product updated successfully", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error updating product:", error);
      Alert.alert("Error", "Failed to update product. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle the cancel button press
  const handleCancelEdit = () => {
    Alert.alert(
      "Discard Changes",
      "Are you sure you want to discard your changes?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Discard",
          onPress: () => router.back(),
          style: "destructive",
        },
      ]
    );
  };

  // Display a loading indicator while fetching data
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: COLORS.primary }]}
      >
        {/* Set status bar color to match header */}
        <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.light} />
          <Text style={[styles.loadingText, { color: COLORS.light }]}>
            Loading product details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Display a message if the product is not found
  if (!product) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: COLORS.primary }]}
      >
        {/* Set status bar color to match header */}
        <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
        <View style={styles.notFoundContainer}>
          <MaterialIcons name="error-outline" size={60} color={COLORS.light} />
          <Text style={[styles.notFoundText, { color: COLORS.light }]}>
            Product not found
          </Text>
          <TouchableOpacity
            style={styles.backToProductsButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToProductsText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render the main product edit form
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: COLORS.primary }]}
    >
      {/* Set status bar color to match header */}
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* Header section with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancelEdit}>
          <Ionicons name="arrow-back" size={24} color={COLORS.light} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Product</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Keyboard avoiding view to prevent keyboard from covering inputs */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Introduction section */}
          <View style={styles.introSection}>
            <View style={styles.introIconContainer}>
              <MaterialIcons name="edit" size={32} color={COLORS.light} />
            </View>
            <View style={styles.introTextContainer}>
              <Text style={styles.introTitle}>Edit Product</Text>
              <Text style={styles.introSubtitle}>
                Update product details and information
              </Text>
            </View>
          </View>

          {/* Form section for basic product information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            {/* Product ID (Read-only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Product ID</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{product.product_id}</Text>
              </View>
            </View>

            {/* Product Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Product Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.name ? styles.inputError : null,
                ]}
                placeholder="Enter product name"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) {
                    setErrors({ ...errors, name: "" });
                  }
                }}
              />
              {errors.name ? (
                <Text style={styles.errorText}>{errors.name}</Text>
              ) : null}
            </View>

            {/* Product Description Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter product description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Product Category Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Category <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.pickerContainer,
                  errors.category_id ? styles.inputError : null,
                ]}
              >
                <Picker
                  selectedValue={categoryId}
                  onValueChange={(itemValue) => {
                    setCategoryId(itemValue);
                    if (errors.category_id) {
                      setErrors({ ...errors, category_id: "" });
                    }
                  }}
                  style={styles.picker}
                >
                  {categories.map((category) => (
                    <Picker.Item
                      key={category.category_id}
                      label={category.name}
                      value={category.category_id}
                    />
                  ))}
                </Picker>
              </View>
              {errors.category_id ? (
                <Text style={styles.errorText}>{errors.category_id}</Text>
              ) : null}
            </View>

            {/* Unit Price Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Unit Price (Rs.) <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.unit_price ? styles.inputError : null,
                ]}
                placeholder="Enter unit price"
                value={unitPrice}
                onChangeText={(text) => {
                  setUnitPrice(text);
                  if (errors.unit_price) {
                    setErrors({ ...errors, unit_price: "" });
                  }
                }}
                keyboardType="numeric"
              />
              {errors.unit_price ? (
                <Text style={styles.errorText}>{errors.unit_price}</Text>
              ) : null}
            </View>

            {/* Reorder Level Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reorder Level</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.reorder_level ? styles.inputError : null,
                ]}
                placeholder="Enter reorder level (default: 10)"
                value={reorderLevel}
                onChangeText={(text) => {
                  // Only allow numbers
                  const numericValue = text.replace(/[^0-9]/g, "");
                  setReorderLevel(numericValue);
                  if (errors.reorder_level) {
                    setErrors({ ...errors, reorder_level: "" });
                  }
                }}
                keyboardType="numeric"
              />
              {errors.reorder_level ? (
                <Text style={styles.errorText}>{errors.reorder_level}</Text>
              ) : null}
              <Text style={styles.helperText}>
                Minimum stock level before reordering is needed
              </Text>
            </View>

            {/* Company Product Switch */}
            <View style={styles.switchGroup}>
              <Text style={styles.switchLabel}>Company Product</Text>
              <Switch
                value={isCompanyProduct}
                onValueChange={setIsCompanyProduct}
                trackColor={{ false: "#E9ECEF", true: COLORS.primary }}
                thumbColor={COLORS.light}
              />
            </View>

            {/* Active Status Switch */}
            <View style={styles.switchGroup}>
              <Text style={styles.switchLabel}>Active Status</Text>
              <View style={styles.statusContainer}>
                <Text style={styles.statusText}>
                  {isActive ? "Active" : "Inactive"}
                </Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: "#E9ECEF", true: COLORS.primary }}
                  thumbColor={COLORS.light}
                />
              </View>
            </View>
          </View>

          {/* Informational section about batch management */}
          <View style={styles.infoSection}>
            <View style={styles.infoContent}>
              <MaterialIcons
                name="info"
                size={24}
                color={COLORS.primary}
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                To manage product batches, please go to the product details
                screen and use the batches tab.
              </Text>
            </View>
          </View>

          {/* Action buttons for canceling or saving changes */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelEdit}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.light} size="small" />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                  <MaterialIcons name="save" size={20} color={COLORS.light} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles for the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 16 : 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: COLORS.light,
    fontSize: 20,
    fontWeight: "bold",
  },
  headerRight: {
    width: 40,
  },
  keyboardAvoidView: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    paddingBottom: 85,
  },
  introSection: {
    backgroundColor: COLORS.primary,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  introIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  introTextContainer: {
    flex: 1,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.light,
  },
  introSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  section: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  requiredStar: {
    color: COLORS.danger,
  },
  textInput: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.dark,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  readOnlyInput: {
    backgroundColor: "#F1F3F5",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  readOnlyText: {
    fontSize: 16,
    color: "#6C757D",
  },
  pickerContainer: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
  },
  picker: {
    height: 48,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: "#6C757D",
    fontSize: 12,
    marginTop: 4,
  },
  switchGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 14,
    marginRight: 10,
    color: "#6C757D",
  },
  infoSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  infoContent: {
    backgroundColor: "rgba(52, 100, 145, 0.1)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    color: COLORS.dark,
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 30,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#E9ECEF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginRight: 8,
  },
  cancelButtonText: {
    color: COLORS.dark,
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
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
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.dark,
    marginTop: 10,
    marginBottom: 20,
  },
  backToProductsButton: {
    backgroundColor: COLORS.light,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backToProductsText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
