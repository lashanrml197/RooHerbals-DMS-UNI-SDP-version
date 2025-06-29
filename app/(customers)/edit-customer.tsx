// app/(customers)/edit-customer.tsx
// Screen component for editing existing customer information
// Includes form validation, permission checking, and API integration

// Import various icon sets for the UI
import {
  Feather, // Used for general icons like map-pin, phone
  FontAwesome5, // Used for user and money-bill icons
  Ionicons, // Used for back arrow navigation
  MaterialCommunityIcons, // Used for email outline icon
  MaterialIcons, // Used for store icon and arrow-forward
} from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker"; // Dropdown picker for district/area selection
import { router, useLocalSearchParams } from "expo-router"; // Navigation and route parameters
import React, { useEffect, useState } from "react"; // React hooks for state management
import {
  ActivityIndicator, // Loading spinner component
  Alert, // Native alert dialogs
  KeyboardAvoidingView, // Handles keyboard overlap on iOS
  Platform, // Platform detection for iOS/Android differences
  SafeAreaView, // Safe area boundaries for different devices
  ScrollView, // Scrollable container for long forms
  StatusBar, // Status bar styling
  StyleSheet, // Component styling
  Text, // Text display component
  TextInput, // Text input fields
  TouchableOpacity, // Touchable button component
  View, // Container component
} from "react-native";
import { useAuth } from "../context/AuthContext"; // Authentication context for permission checking
import { getCustomerById, updateCustomer } from "../services/api"; // API functions for customer operations
import { COLORS } from "../theme/colors"; // App color constants

// Geographic data for Sri Lanka's Uva Province
// Contains polling divisions organized by district for address selection
// This ensures customers are assigned to correct administrative areas
const UVA_POLLING_DIVISIONS = {
  BADULLA: [
    "Badulla",
    "Bandarawela",
    "Haputale",
    "Hali-Ela",
    "Mahiyanganaya",
    "Passara",
    "Uva-Paranagama",
    "Welimada",
    "Ella",
    "Lunugala",
    "Meegahakiula",
    "Kandaketiya",
    "Soranathota",
    "Ridimaliyadda",
  ],
  MONARAGALA: [
    "Monaragala",
    "Wellawaya",
    "Bibile",
    "Buttala",
    "Kataragama",
    "Thanamalwila",
    "Medagama",
    "Siyambalanduwa",
    "Madulla",
    "Badalkumbura",
    "Sevanagala",
  ],
};

// TypeScript interface defining the structure of customer form data
// Ensures type safety and consistent data handling throughout the component
interface CustomerFormData {
  name: string; // Shop/business name (required)
  contact_person: string; // Contact person name (optional)
  phone: string; // Phone number (required, validated for Sri Lankan format)
  email: string; // Email address (optional, validated if provided)
  address: string; // Full street address (required)
  city: string; // City name (optional)
  area: string; // Selected polling division/area (required)
  credit_limit: string; // Credit limit as string for input handling
}

export default function EditCustomerScreen() {
  // Authentication hook to check user permissions
  const { hasPermission } = useAuth();

  // Loading states for different operations
  const [loading, setLoading] = useState(true); // Initial data loading
  const [saving, setSaving] = useState(false); // Form submission state
  const [error, setError] = useState<string | null>(null); // Error message display

  // Permission check on component mount
  // Redirects user if they don't have edit_customer permission
  useEffect(() => {
    if (!hasPermission("edit_customer")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to edit customer information.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // Geographic selection state - defaults to BADULLA district
  const [district, setDistrict] = useState("BADULLA");

  // Form data state - holds all customer information being edited
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    area: "",
    credit_limit: "0",
  });

  // Form validation error tracking
  // Each field can have specific validation errors
  const [errors, setErrors] = useState({
    name: false, // Required field validation
    address: false, // Required field validation
    phone: false, // Required field validation
    phoneFormat: false, // Sri Lankan phone format validation
    email: false, // Email format validation
    contactPerson: false, // Name format validation (letters, spaces, periods only)
  });

  // Extract customer ID from route parameters
  // This ID is used to fetch and update the specific customer
  const { customerId } = useLocalSearchParams();

  // Validation function for Sri Lankan phone numbers
  // Checks format (10 digits starting with 0) and valid prefixes
  const isValidSriLankanPhone = (phoneNumber: string) => {
    // All Sri Lankan phone numbers are 10 digits and start with 0
    // Valid prefixes include: 07x (mobile), 011 (Colombo), 038 (Galle), 055 (Badulla),
    // 031 (Negombo), 081 (Kandy), 025 (Anuradhapura), 021 (Jaffna), etc.

    // Array of valid Sri Lankan phone number prefixes
    // Includes both mobile (07x) and landline area codes
    const validPrefixes = [
      // Mobile prefixes (070-079)
      "070",
      "071",
      "072",
      "073",
      "074",
      "075",
      "076",
      "077",
      "078",
      "079",
      // City/area codes for landlines
      "011",
      "038",
      "031",
      "081",
      "025",
      "021",
      "027",
      "045",
      "047",
      "055",
      "026",
      "022",
      "024",
      "023",
      "057",
      "041",
      "091",
      "033",
      "034",
      "035",
      "037",
      "051",
      "052",
      "054",
      "063",
      "065",
      "066",
      "067",
    ];

    // Basic format check: exactly 10 digits starting with 0
    if (!/^0\d{9}$/.test(phoneNumber)) {
      return false;
    }

    // Check if the number starts with any valid prefix
    return validPrefixes.some((prefix) => phoneNumber.startsWith(prefix));
  };

  // Email format validation using regular expression
  // Checks for basic email structure: text@domain.extension
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Contact person name validation
  // Only allows alphabetic characters, spaces, and periods
  // Prevents numbers and special characters in names
  const isValidContactName = (name: string): boolean => {
    const nameRegex = /^[A-Za-z\s.]+$/;
    return nameRegex.test(name);
  };

  // Effect hook to fetch existing customer data when component mounts
  // Runs when customerId changes and populates form with current customer info
  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Validate that customer ID exists in route parameters
        if (!customerId) {
          throw new Error("Customer ID is required");
        }

        // Fetch customer data from API
        const data = await getCustomerById(customerId as string);

        // Determine the correct district based on customer's current area
        // This ensures the district picker shows the right selection
        let matchingDistrict = "BADULLA"; // Default fallback
        for (const [key, values] of Object.entries(UVA_POLLING_DIVISIONS)) {
          if (values.includes(data.area)) {
            matchingDistrict = key;
            break;
          }
        }
        setDistrict(matchingDistrict);

        // Populate form fields with fetched customer data
        // Convert credit_limit to string for form input handling
        setFormData({
          name: data.name || "",
          contact_person: data.contact_person || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          city: data.city || "",
          area:
            data.area ||
            UVA_POLLING_DIVISIONS[
              matchingDistrict as keyof typeof UVA_POLLING_DIVISIONS
            ][0], // Default to first area in district if none specified
          credit_limit: data.credit_limit?.toString() || "0",
        });
      } catch (err: any) {
        console.error("Error fetching customer data:", err);
        setError(err.message || "Failed to load customer data");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [customerId]);

  // Handler for form input changes with real-time validation
  // Updates form data and clears related validation errors
  const handleChange = (field: keyof CustomerFormData, value: string) => {
    // Update the form data for the specified field
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Real-time validation and error clearing based on field type

    // Clear name error when user starts typing
    if (field === "name" && value.trim()) {
      setErrors((prev) => ({ ...prev, name: false }));
    }

    // Clear address error when user starts typing
    if (field === "address" && value.trim()) {
      setErrors((prev) => ({ ...prev, address: false }));
    }

    // Phone number validation - only allow numeric input and validate format
    if (field === "phone") {
      const numericText = value.replace(/[^0-9]/g, ""); // Strip non-numeric characters
      setErrors((prev) => ({
        ...prev,
        phone: !numericText, // Error if empty
        phoneFormat:
          numericText.length === 10
            ? !isValidSriLankanPhone(numericText) // Validate format if 10 digits
            : true, // Error if not 10 digits
      }));
    }

    // Email validation - only validate if email is provided (optional field)
    if (field === "email") {
      setErrors((prev) => ({
        ...prev,
        email: value ? !isValidEmail(value) : false, // Only validate if not empty
      }));
    }

    // Contact person name validation - only validate if provided (optional field)
    if (field === "contact_person") {
      setErrors((prev) => ({
        ...prev,
        contactPerson: value ? !isValidContactName(value) : false, // Only validate if not empty
      }));
    }
  };

  // Comprehensive form validation before submission
  // Checks all required fields and format validations
  const validateForm = () => {
    let isValid = true;

    // Initialize all error states to false
    const newErrors = {
      name: false,
      address: false,
      phone: false,
      phoneFormat: false,
      email: false,
      contactPerson: false,
    };

    // Validate required field: shop name
    if (!formData.name.trim()) {
      newErrors.name = true;
      isValid = false;
    }

    // Validate required field: address
    if (!formData.address.trim()) {
      newErrors.address = true;
      isValid = false;
    }

    // Validate required field: phone number
    if (!formData.phone.trim()) {
      newErrors.phone = true;
      isValid = false;
    } else if (!isValidSriLankanPhone(formData.phone)) {
      // If phone is provided, check format
      newErrors.phoneFormat = true;
      isValid = false;
    }

    // Validate optional field: email (only if provided)
    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = true;
      isValid = false;
    }

    // Validate optional field: contact person name (only if provided)
    if (
      formData.contact_person &&
      !isValidContactName(formData.contact_person)
    ) {
      newErrors.contactPerson = true;
      isValid = false;
    }

    // Update error state and return validation result
    setErrors(newErrors);
    return isValid;
  };

  // Form submission handler
  // Validates form data and calls API to update customer information
  const handleSubmit = async () => {
    // Only proceed if all validations pass
    if (validateForm()) {
      try {
        setSaving(true); // Show loading state on submit button

        // Prepare data for API - convert credit_limit to number
        const customerData = {
          ...formData,
          credit_limit: parseFloat(formData.credit_limit) || 0, // Default to 0 if invalid
        };

        // Call API to update customer with new information
        await updateCustomer(customerId as string, customerData);

        // Show success message and navigate back
        Alert.alert("Success", "Customer information updated successfully", [
          {
            text: "OK",
            onPress: () => router.back(), // Return to previous screen
          },
        ]);
      } catch (err: any) {
        // Handle API errors
        console.error("Error updating customer:", err);
        Alert.alert(
          "Error",
          err.message || "Failed to update customer information"
        );
      } finally {
        setSaving(false); // Hide loading state
      }
    } else {
      // Show error if validation fails
      Alert.alert("Error", "Please fill in all required fields correctly");
    }
  };

  // Loading state UI - shown while fetching customer data
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />
        {/* Header with back button and title */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Customer</Text>
          <View style={{ width: 40 }} /> {/* Spacer for centered title */}
        </View>
        {/* Loading indicator with message */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading customer data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied state UI - shown when user lacks edit permissions
  if (!hasPermission("edit_customer")) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />
        {/* Header with back button and title */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Customer</Text>
          <View style={{ width: 40 }} /> {/* Spacer for centered title */}
        </View>
        {/* Permission denied message */}
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>
            You do not have permission to edit customer information.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main form UI - shown when data is loaded and user has permissions
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Header section with navigation and title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Customer</Text>
        <View style={{ width: 40 }} /> {/* Spacer for centered title */}
      </View>

      {/* Keyboard avoiding wrapper for iOS compatibility */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Scrollable form container */}
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }} // Extra space for submit button
        >
          {/* Error message display (if any) */}
          {error && (
            <View style={styles.errorMessage}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Main form container with shadow and styling */}
          <View style={styles.formContainer}>
            {/* Required Information Section */}
            <Text style={styles.sectionTitle}>Required Information</Text>

            {/* Shop Name Input Field (Required) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Shop Name <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.name && styles.inputError, // Apply error styling if validation fails
                ]}
              >
                <MaterialIcons
                  name="store"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter shop name"
                  value={formData.name}
                  onChangeText={(text) => handleChange("name", text)}
                />
              </View>
              {/* Show error message if name validation fails */}
              {errors.name && (
                <Text style={styles.errorText}>Shop name is required</Text>
              )}
            </View>

            {/* Address Input Field (Required) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Address <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.address && styles.inputError,
                  { height: 80, alignItems: "flex-start" }, // Taller for multiline input
                ]}
              >
                <Feather
                  name="map-pin"
                  size={20}
                  color="#ADB5BD"
                  style={[styles.inputIcon, { marginTop: 12 }]} // Adjust icon position for multiline
                />
                <TextInput
                  style={[
                    styles.input,
                    { height: 80, textAlignVertical: "top", paddingTop: 12 },
                  ]}
                  placeholder="Enter full address"
                  value={formData.address}
                  onChangeText={(text) => handleChange("address", text)}
                  multiline // Allow multiple lines for address
                  numberOfLines={3}
                />
              </View>
              {/* Show error message if address validation fails */}
              {errors.address && (
                <Text style={styles.errorText}>Address is required</Text>
              )}
            </View>

            {/* Phone Number Input Field (Required) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Phone Number <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  (errors.phone || errors.phoneFormat) && styles.inputError,
                ]}
              >
                <Feather
                  name="phone"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number (e.g., 0771234567)"
                  value={formData.phone}
                  onChangeText={(text) => {
                    // Strip non-numeric characters as user types
                    const numericText = text.replace(/[^0-9]/g, "");
                    handleChange("phone", numericText);
                  }}
                  keyboardType="phone-pad" // Show numeric keypad
                  maxLength={10} // Limit to 10 digits
                />
              </View>
              {/* Show appropriate error message based on validation failure */}
              {errors.phone && (
                <Text style={styles.errorText}>Phone number is required</Text>
              )}
              {errors.phoneFormat && (
                <Text style={styles.errorText}>
                  Invalid Sri Lankan phone number
                </Text>
              )}
            </View>

            {/* Additional Information Section */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              Additional Information
            </Text>

            {/* Row layout for City and District fields */}
            <View style={styles.rowInputs}>
              {/* City Input Field (Optional) */}
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>City</Text>
                <View style={styles.inputContainer}>
                  <Feather
                    name="map"
                    size={20}
                    color="#ADB5BD"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter city"
                    value={formData.city}
                    onChangeText={(text) => handleChange("city", text)}
                  />
                </View>
              </View>

              {/* District Picker (Required) */}
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>District</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={district}
                    onValueChange={(itemValue) => {
                      setDistrict(itemValue);
                      // Reset area to first option when district changes
                      // This ensures area selection is always valid for the selected district
                      setFormData({
                        ...formData,
                        area: UVA_POLLING_DIVISIONS[
                          itemValue as keyof typeof UVA_POLLING_DIVISIONS
                        ][0],
                      });
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Badulla" value="BADULLA" />
                    <Picker.Item label="Monaragala" value="MONARAGALA" />
                  </Picker>
                </View>
              </View>
            </View>

            {/* Area/Polling Division Picker (Required) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Area</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.area}
                  onValueChange={(itemValue) => handleChange("area", itemValue)}
                  style={styles.picker}
                >
                  {/* Dynamically generate picker items based on selected district */}
                  {UVA_POLLING_DIVISIONS[
                    district as keyof typeof UVA_POLLING_DIVISIONS
                  ].map((division) => (
                    <Picker.Item
                      key={division}
                      label={division}
                      value={division}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Email Input Field (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.email && styles.inputError, // Apply error styling if email format is invalid
                ]}
              >
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  value={formData.email}
                  onChangeText={(text) => handleChange("email", text)}
                  keyboardType="email-address" // Show email-optimized keyboard
                  autoCapitalize="none" // Prevent auto-capitalization for emails
                />
              </View>
              {/* Show error message if email format validation fails */}
              {errors.email && (
                <Text style={styles.errorText}>Invalid email address</Text>
              )}
            </View>

            {/* Contact Person Input Field (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Person</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.contactPerson && styles.inputError, // Apply error styling if name format is invalid
                ]}
              >
                <FontAwesome5
                  name="user"
                  size={18}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter contact person name"
                  value={formData.contact_person}
                  onChangeText={(text) => handleChange("contact_person", text)}
                />
              </View>
              {/* Show error message if contact person name validation fails */}
              {errors.contactPerson && (
                <Text style={styles.errorText}>
                  Only letters, spaces, and periods allowed
                </Text>
              )}
            </View>

            {/* Credit Limit Input Field (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Credit Limit</Text>
              <View style={styles.inputContainer}>
                <FontAwesome5
                  name="money-bill-alt"
                  size={18}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter credit limit (optional)"
                  value={formData.credit_limit}
                  onChangeText={(text) => {
                    // Allow only numbers and decimal point for currency input
                    if (/^\d*\.?\d*$/.test(text) || text === "") {
                      handleChange("credit_limit", text);
                    }
                  }}
                  keyboardType="numeric" // Show numeric keypad
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={saving} // Disable button while saving to prevent multiple submissions
            >
              {saving ? (
                // Show loading spinner while saving
                <ActivityIndicator color={COLORS.light} />
              ) : (
                // Show button text and icon when not saving
                <>
                  <Text style={styles.submitButtonText}>Update Customer</Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={22}
                    color={COLORS.light}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// StyleSheet object containing all component styles
// Organized by UI sections: layout, form elements, buttons, etc.
const styles = StyleSheet.create({
  // Main container with light background
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA", // Light gray background
  },

  // Header section styling with shadow and proper spacing
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5", // Subtle border
    elevation: 2, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    // Dynamic padding for different platforms to account for status bar
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 12,
  },

  // Back button with rounded corners and padding
  backButton: {
    padding: 8,
    borderRadius: 8,
  },

  // Header title styling
  headerTitle: {
    fontSize: 18,
    fontWeight: "700", // Bold font weight
    color: COLORS.dark,
  },

  // Main content container
  container: {
    flex: 1,
    padding: 16,
  },

  // Loading state container - centers content vertically and horizontally
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Loading text styling
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.dark,
  },

  // Error message container with warning colors and left border accent
  errorMessage: {
    backgroundColor: "#FEECEC", // Light red background
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#E74C3C", // Red accent border
  },

  // Error text styling for validation messages
  errorText: {
    fontSize: 12,
    color: "#FF6B6B", // Red text color
    marginTop: 4,
    marginLeft: 4,
  },

  // Main form container with card-like appearance
  formContainer: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 20,
    shadowColor: COLORS.dark, // Card shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3, // Android elevation
  },

  // Section title styling with left accent border
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary, // Primary color accent
    paddingLeft: 10,
  },

  // Individual input field grouping
  inputGroup: {
    marginBottom: 16,
  },

  // Input field label styling
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },

  // Required field asterisk styling
  requiredAsterisk: {
    color: "#FF6B6B", // Red color for required indicator
    fontWeight: "bold",
  },

  // Input container with border and icon space
  inputContainer: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DEE2E6", // Light gray border
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF", // White background
  },

  // Icon spacing within input containers
  inputIcon: {
    marginRight: 10,
  },

  // Text input field styling
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: COLORS.dark,
  },

  // Picker (dropdown) container styling
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },

  // Picker component styling
  picker: {
    height: 50,
    width: "100%",
  },

  // Error state styling for input fields
  inputError: {
    borderColor: "#FF6B6B", // Red border for errors
    backgroundColor: "rgba(255, 107, 107, 0.05)", // Light red background
  },

  // Row layout for side-by-side inputs (city and district)
  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Submit button styling with primary color and shadow
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    height: 56,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    shadowColor: COLORS.primary, // Button shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4, // Android elevation
  },

  // Submit button text styling
  submitButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8, // Space between text and arrow icon
  },
});
