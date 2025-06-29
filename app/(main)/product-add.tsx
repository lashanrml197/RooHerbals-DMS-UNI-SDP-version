import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
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
import { useAuth } from "../context/AuthContext"; // Import auth context
import {
  addProduct,
  getCategories,
  getSuppliers,
} from "../services/productApi";
import { COLORS } from "../theme/colors";

// Define interfaces for data structures
interface Category {
  category_id: string;
  name: string;
}

interface Supplier {
  supplier_id: string;
  name: string;
  supplier_type: string;
}

// Main component for adding a new product
export default function ProductAddScreen() {
  // useAuth hook to check for user permissions
  const { hasPermission } = useAuth(); // Get permission check function

  // Effect to check if the user has permission to manage products.
  // If not, it shows an alert and navigates back.
  useEffect(() => {
    if (!hasPermission("manage_products")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to add products.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // State for product's basic details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [reorderLevel, setReorderLevel] = useState("10");
  const [isCompanyProduct, setIsCompanyProduct] = useState(true);

  // State for initial stock information
  const [addInitialStock, setAddInitialStock] = useState(true); // Default to true, allowing users to add stock right away
  const [initialQuantity, setInitialQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [manufacturingDate, setManufacturingDate] = useState(
    new Date().toISOString().split("T")[0] // Default to the current date
  );

  // State for loading indicators and data fetched from the server
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [supplierType, setSupplierType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // State to manage the current step in the multi-step form
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 2; // Total number of steps in the form

  // State to hold validation errors for form fields
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Effect to fetch initial data (categories and suppliers) when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch product categories from the API
        const categoriesData = await getCategories();
        setCategories(categoriesData);

        // Fetch suppliers from the API
        const suppliersData = await getSuppliers();
        setSuppliers(suppliersData);

        // Extract unique supplier types for the filter dropdown
        const types = [...new Set(suppliersData.map((s) => s.supplier_type))];
        if (types.length > 0) {
          setSupplierType(types[0]);
        }

        // Set default category if data is available
        if (categoriesData.length > 0) {
          setCategoryId(categoriesData[0].category_id);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        Alert.alert("Error", "Failed to load required data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Effect to filter the list of suppliers whenever the selected supplier type changes
  useEffect(() => {
    if (supplierType && suppliers.length > 0) {
      filterSuppliersByType(supplierType, suppliers);
    }
  }, [supplierType, suppliers]);

  // Filters the suppliers list based on the selected type
  const filterSuppliersByType = (type: string, allSuppliers: Supplier[]) => {
    const filtered = allSuppliers.filter(
      (supplier) => supplier.supplier_type === type
    );
    setFilteredSuppliers(filtered);

    // Automatically select the first supplier from the filtered list
    if (filtered.length > 0) {
      setSupplierId(filtered[0].supplier_id);
    } else {
      setSupplierId(""); // Clear selection if no suppliers match
    }
  };

  // Handles changes to the supplier type dropdown
  const handleSupplierTypeChange = (type: string) => {
    setSupplierType(type);
  };

  // Moves to the next step of the form
  const handleNextStep = () => {
    // Validate the current step before proceeding
    if (currentStep === 1) {
      if (!validateSupplierSelection()) {
        return; // Stop if validation fails
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Moves to the previous step of the form
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Validates the supplier selection in the first step
  const validateSupplierSelection = () => {
    const newErrors: { [key: string]: string } = {};

    if (!supplierId) {
      newErrors.supplier_id = "Please select a supplier";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  // Validates all the fields in the product form
  const validateProductForm = () => {
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

    // If adding initial stock, validate the corresponding stock fields
    if (addInitialStock) {
      if (!initialQuantity) {
        newErrors.initial_quantity = "Initial quantity is required";
      } else if (
        isNaN(Number(initialQuantity)) ||
        Number(initialQuantity) <= 0
      ) {
        newErrors.initial_quantity =
          "Initial quantity must be a positive number";
      }

      // Validate cost price if provided
      if (costPrice && (isNaN(Number(costPrice)) || Number(costPrice) <= 0)) {
        newErrors.cost_price = "Cost price must be a positive number";
      }

      // Validate date formats to ensure they are in YYYY-MM-DD format
      if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
        newErrors.expiry_date = "Date format should be YYYY-MM-DD";
      }

      if (manufacturingDate && !/^\d{4}-\d{2}-\d{2}$/.test(manufacturingDate)) {
        newErrors.manufacturing_date = "Date format should be YYYY-MM-DD";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  // Handles the final submission of the product form
  const handleSubmit = async () => {
    try {
      // First, validate the form data
      if (!validateProductForm()) {
        return; // Stop submission if validation fails
      }

      setSubmitting(true);
      console.log("Starting product creation process...");

      // Prepare the product data object for the API call
      const productData = {
        name,
        description,
        category_id: categoryId,
        unit_price: Number(unitPrice),
        reorder_level: reorderLevel ? Number(reorderLevel) : 10,
        is_company_product: isCompanyProduct ? 1 : 0,
      };

      console.log("Saving product with data:", JSON.stringify(productData));

      // Add initial stock data to the product object if the toggle is on
      if (addInitialStock) {
        Object.assign(productData, {
          initial_stock: Number(initialQuantity),
          supplier_id: supplierId,
          cost_price: costPrice ? Number(costPrice) : null,
          expiry_date: expiryDate || null,
          manufacturing_date: manufacturingDate || null,
          batch_number: batchNumber || null,
        });
      }

      // Call the API to add the new product
      console.log("Calling addProduct API...");
      const result = await addProduct(productData);
      console.log("Product saved successfully:", result);

      // Show a success message and navigate back to the previous screen
      Alert.alert(
        "Success",
        `Product ${
          (result as { name: string }).name || name
        } has been added successfully`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      console.error("Error adding product:", err);
      let errorMessage = "Failed to add product. Please try again.";

      if (err.message) {
        errorMessage += ` Error: ${err.message}`;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Effect to generate a default batch number based on the product name and current date
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (name) {
      const namePart = name.substring(0, 3).toUpperCase();
      const batchNum = `${namePart}-${today}`;
      setBatchNumber(batchNum);
    }
  }, [name]);

  // Renders a loading indicator while fetching initial data
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Renders the first step of the form: Supplier Selection
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Supplier</Text>

        {/* Supplier Type Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Supplier Type <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={supplierType}
              onValueChange={handleSupplierTypeChange}
              style={styles.picker}
            >
              {/* Options for supplier types would be rendered here */}
            </Picker>
          </View>
        </View>

        {/* Supplier Selection Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Supplier <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View
            style={[
              styles.pickerContainer,
              errors.supplier_id ? styles.inputError : null,
            ]}
          >
            <Picker
              selectedValue={supplierId}
              onValueChange={(itemValue) => setSupplierId(itemValue)}
              style={styles.picker}
              enabled={filteredSuppliers.length > 0}
            >
              {/* Options for suppliers would be rendered here */}
            </Picker>
          </View>
          {errors.supplier_id ? (
            <Text style={styles.errorText}>{errors.supplier_id}</Text>
          ) : null}
        </View>

        {/* Help text to guide the user */}
        <View style={styles.helpTextContainer}>
          <Text style={styles.helpText}>
            Select a supplier for this product. The supplier will be used for
            initial stock and future inventory management.
          </Text>
        </View>
      </View>
    </View>
  );

  // Renders the second step of the form: Product Details
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      {/* Section for basic product information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>

        {/* Input for Product Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Product Name <Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput
            style={[styles.textInput, errors.name ? styles.inputError : null]}
            placeholder="Enter product name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              // Clear error message when user starts typing
              if (errors.name) {
                setErrors({ ...errors, name: "" });
              }
            }}
          />
          {errors.name ? (
            <Text style={styles.errorText}>{errors.name}</Text>
          ) : null}
        </View>

        {/* Input for Product Description */}
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

        {/* Dropdown for Product Category */}
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
                // Clear error message on selection
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

        {/* Input for Unit Price */}
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
              // Clear error message when user starts typing
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

        {/* Input for Reorder Level */}
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
              // Allow only numeric input
              const numericValue = text.replace(/[^0-9]/g, "");
              setReorderLevel(numericValue);
              // Clear error message when user starts typing
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

        {/* Switch to mark if it's a company product */}
        <View style={styles.switchGroup}>
          <Text style={styles.switchLabel}>Company Product</Text>
          <Switch
            value={isCompanyProduct}
            onValueChange={setIsCompanyProduct}
            trackColor={{ false: "#E9ECEF", true: COLORS.primary }}
            thumbColor={COLORS.light}
          />
        </View>
      </View>

      {/* Section for initial stock details */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Initial Stock</Text>
          {/* Switch to enable or disable adding initial stock */}
          <Switch
            value={addInitialStock}
            onValueChange={setAddInitialStock}
            trackColor={{ false: "#E9ECEF", true: COLORS.primary }}
            thumbColor={COLORS.light}
          />
        </View>

        {/* Render stock fields only if the switch is enabled */}
        {addInitialStock && (
          <>
            {/* Input for Batch Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Batch Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Auto-generated batch number"
                value={batchNumber}
                onChangeText={setBatchNumber}
              />
              <Text style={styles.helperText}>
                Optional. Leave blank for auto-generated number.
              </Text>
            </View>

            {/* Input for Initial Quantity */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Initial Quantity <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.initial_quantity ? styles.inputError : null,
                ]}
                placeholder="Enter initial quantity"
                value={initialQuantity}
                onChangeText={(text) => {
                  setInitialQuantity(text);
                  // Clear error message when user starts typing
                  if (errors.initial_quantity) {
                    setErrors({ ...errors, initial_quantity: "" });
                  }
                }}
                keyboardType="numeric"
              />
              {errors.initial_quantity ? (
                <Text style={styles.errorText}>{errors.initial_quantity}</Text>
              ) : null}
            </View>

            {/* Input for Cost Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cost Price (Rs.)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.cost_price ? styles.inputError : null,
                ]}
                placeholder={`Enter cost price (default: ${
                  unitPrice
                    ? (Number(unitPrice) * 0.7).toFixed(2)
                    : "70% of unit price"
                })`}
                value={costPrice}
                onChangeText={(text) => {
                  setCostPrice(text);
                  // Clear error message when user starts typing
                  if (errors.cost_price) {
                    setErrors({ ...errors, cost_price: "" });
                  }
                }}
                keyboardType="numeric"
              />
              {errors.cost_price ? (
                <Text style={styles.errorText}>{errors.cost_price}</Text>
              ) : null}
            </View>

            {/* Input for Manufacturing Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Manufacturing Date</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.manufacturing_date ? styles.inputError : null,
                ]}
                placeholder="YYYY-MM-DD"
                value={manufacturingDate}
                onChangeText={(text) => {
                  setManufacturingDate(text);
                  // Clear error message when user starts typing
                  if (errors.manufacturing_date) {
                    setErrors({ ...errors, manufacturing_date: "" });
                  }
                }}
              />
              {errors.manufacturing_date ? (
                <Text style={styles.errorText}>
                  {errors.manufacturing_date}
                </Text>
              ) : null}
              <Text style={styles.helperText}>
                Format: YYYY-MM-DD (defaults to today)
              </Text>
            </View>

            {/* Input for Expiry Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Expiry Date</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.expiry_date ? styles.inputError : null,
                ]}
                placeholder="YYYY-MM-DD"
                value={expiryDate}
                onChangeText={(text) => {
                  setExpiryDate(text);
                  // Clear error message when user starts typing
                  if (errors.expiry_date) {
                    setErrors({ ...errors, expiry_date: "" });
                  }
                }}
              />
              {errors.expiry_date ? (
                <Text style={styles.errorText}>{errors.expiry_date}</Text>
              ) : null}
              <Text style={styles.helperText}>
                Optional. Format: YYYY-MM-DD
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

  // Main component render method
  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.light} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Product</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Progress indicator for the multi-step form */}
      <View style={styles.progressContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              currentStep >= index + 1 && styles.progressDotActive,
            ]}
          />
        ))}
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
          {/* Introduction section with an icon and title */}
          <View style={styles.introSection}>
            <View style={styles.introIconContainer}>
              <MaterialIcons name="add-box" size={32} color={COLORS.light} />
            </View>
            <View style={styles.introTextContainer}>
              <Text style={styles.introTitle}>Create New Product</Text>
              <Text style={styles.introSubtitle}>
                {currentStep === 1
                  ? "First, select a supplier for this product"
                  : "Add product details and initial stock information"}
              </Text>
            </View>
          </View>

          {/* Conditionally render the current step */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}

          {/* Navigation buttons to move between steps or submit the form */}
          <View style={styles.navigationButtons}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={styles.backStepButton}
                onPress={handlePrevStep}
              >
                <Ionicons
                  name="arrow-back"
                  size={18}
                  color={COLORS.secondary}
                />
                <Text style={styles.backStepButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            {currentStep < totalSteps ? (
              // "Next" button to go to the next step
              <TouchableOpacity
                style={styles.nextStepButton}
                onPress={handleNextStep}
              >
                <Text style={styles.nextStepButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.light} />
              </TouchableOpacity>
            ) : (
              // "Save" button to submit the form
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.light} size="small" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Save Product</Text>
                    <MaterialIcons name="save" size={20} color={COLORS.light} />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// StyleSheet for the component's UI elements
const styles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  // Header styles
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
  // Back button in the header
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  // Header title text
  headerTitle: {
    color: COLORS.light,
    fontSize: 20,
    fontWeight: "bold",
  },
  // Right side of the header for alignment
  headerRight: {
    width: 40,
  },
  // Container for the progress dots
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
  },
  // Individual progress dot
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 5,
  },
  // Active progress dot
  progressDotActive: {
    backgroundColor: COLORS.light,
  },
  // Keyboard avoiding view wrapper
  keyboardAvoidView: {
    flex: 1,
  },
  // Scroll view for the form content
  scrollView: {
    flex: 1,
  },
  // Content container for the scroll view
  scrollContent: {
    paddingBottom: 85,
  },
  // Introduction section at the top of the form
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
  // Container for the intro icon
  introIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  // Container for the intro text
  introTextContainer: {
    flex: 1,
  },
  // Title text in the intro section
  introTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.light,
  },
  // Subtitle text in the intro section
  introSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  // Container for each step's content
  stepContainer: {
    marginBottom: 20,
  },
  // Styling for each form section
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
  // Header within a section (e.g., for the initial stock switch)
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  // Title of a section
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
    marginBottom: 16,
  },
  // Grouping for a label and its input
  inputGroup: {
    marginBottom: 16,
  },
  // Label for a form input
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  // Red star for required fields
  requiredStar: {
    color: COLORS.danger,
  },
  // General text input style
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
  // Style for multi-line text areas
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  // Container for the Picker (dropdown) component
  pickerContainer: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
  },
  // Style for the Picker component itself
  picker: {
    height: 48,
  },
  // Style for inputs with validation errors
  inputError: {
    borderColor: COLORS.danger,
  },
  // Text style for displaying validation errors
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
  },
  // Helper text style for providing additional info
  helperText: {
    color: "#6C757D",
    fontSize: 12,
    marginTop: 4,
  },
  // Grouping for a switch and its label
  switchGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  // Label for a switch component
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  // Container for help text blocks
  helpTextContainer: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  // Style for the help text itself
  helpText: {
    color: "#6C757D",
    fontSize: 14,
    lineHeight: 20,
  },
  // Container for navigation buttons (Back, Next, Save)
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 30,
  },
  // "Back" button style
  backStepButton: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginRight: 8,
  },
  // Text inside the "Back" button
  backStepButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  // "Next" button style
  nextStepButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 2,
  },
  // Text inside the "Next" button
  nextStepButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  // "Submit" button style
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 2,
  },
  // Text inside the "Submit" button
  submitButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },
  // Container for the loading indicator
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Text displayed below the loading indicator
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.dark,
  },
});
