import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons"; // Icon libraries for UI elements(These are various icon sets used in the app)
import { Picker } from "@react-native-picker/picker"; // Dropdown picker component
import { router } from "expo-router"; // Navigation router for screen transitions
import React, { useState } from "react"; // React hooks for state management
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"; // Core React Native components
import { useAuth } from "../context/AuthContext"; // Authentication context for user data
import { createCustomer } from "../services/api"; // API service for customer creation
import { COLORS } from "../theme/colors"; // Color theme constants

// List of polling divisions in Uva Province grouped by district
// This data structure organizes geographical areas for customer location selection
const UVA_POLLING_DIVISIONS = {
  // Badulla district polling divisions
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
  // Monaragala district polling divisions
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

export default function AddCustomerScreen() {
  // Get the authenticated user from the auth context
  const { user } = useAuth();

  // State variables for form inputs - managing customer data
  const [name, setName] = useState(""); // Shop/customer name
  const [address, setAddress] = useState(""); // Physical address
  const [city, setCity] = useState(""); // City location
  const [area, setArea] = useState(""); // Polling division/area
  const [district, setDistrict] = useState("BADULLA"); // Default to Badulla district
  const [phone, setPhone] = useState(""); // Contact phone number
  const [email, setEmail] = useState(""); // Email address (optional)
  const [contactPerson, setContactPerson] = useState(""); // Contact person name (optional)
  const [creditLimit, setCreditLimit] = useState(""); // Credit limit amount (optional)
  const [loading, setLoading] = useState(false); // Loading state for form submission

  // Form validation state - tracks which fields have errors
  const [errors, setErrors] = useState({
    name: false, // Shop name validation error
    address: false, // Address validation error
    phone: false, // Phone number required error
    phoneFormat: false, // Phone number format error
    email: false, // Email format error
    contactPerson: false, // Contact person name format error
  });

  // Sri Lankan phone number validation function
  // Validates format and checks against known Sri Lankan prefixes
  const isValidSriLankanPhone = (phoneNumber: string) => {
    // All Sri Lankan phone numbers are 10 digits and start with 0
    // Valid prefixes include: 07x (mobile), 011 (Colombo), 038 (Galle), 055 (Badulla),
    // 031 (Negombo), 081 (Kandy), 025 (Anuradhapura), 021 (Jaffna), etc.

    // Array of valid Sri Lankan phone number prefixes
    const validPrefixes = [
      // Mobile network prefixes (07x series)
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
      // Fixed line area codes for major cities and regions
      "011", // Colombo
      "038", // Galle
      "031", // Negombo
      "081", // Kandy
      "025", // Anuradhapura
      "021", // Jaffna
      "027",
      "045",
      "047",
      "055", // Badulla
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

    // Basic format check - exactly 10 digits starting with 0
    if (!/^0\d{9}$/.test(phoneNumber)) {
      return false;
    }

    // Check if the number starts with a valid prefix
    return validPrefixes.some((prefix) => phoneNumber.startsWith(prefix));
  };

  // Email validation function using regex pattern
  const isValidEmail = (email: string): boolean => {
    // Standard email regex pattern to validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Contact person name validation - restricts to alphabetic characters only
  const isValidContactName = (name: string): boolean => {
    // Only allow letters, spaces, and periods in contact person names
    const nameRegex = /^[A-Za-z\s.]+$/;
    return nameRegex.test(name);
  };

  // Form validation function - checks all required fields and formats
  const validateForm = () => {
    let isValid = true; // Flag to track overall form validity

    // Initialize error state object
    const newErrors = {
      name: false,
      address: false,
      phone: false,
      phoneFormat: false,
      email: false,
      contactPerson: false,
    };

    // Validate shop name (required field)
    if (!name.trim()) {
      newErrors.name = true;
      isValid = false;
    }

    // Validate address (required field)
    if (!address.trim()) {
      newErrors.address = true;
      isValid = false;
    }

    // Validate phone number (required field with format check)
    if (!phone.trim()) {
      newErrors.phone = true;
      isValid = false;
    } else if (!isValidSriLankanPhone(phone)) {
      // Check if phone number follows Sri Lankan format
      newErrors.phoneFormat = true;
      isValid = false;
    }

    // Validate email format (optional field, but must be valid if provided)
    if (email && !isValidEmail(email)) {
      newErrors.email = true;
      isValid = false;
    }

    // Validate contact person name format (optional field, but must be valid if provided)
    if (contactPerson && !isValidContactName(contactPerson)) {
      newErrors.contactPerson = true;
      isValid = false;
    }

    // Update error state and return validation result
    setErrors(newErrors);
    return isValid;
  };
  // Handle customer registration - main form submission function
  const handleRegister = async () => {
    // First validate all form fields
    if (validateForm()) {
      // Transforming UI State data into API request format
      try {
        setLoading(true); // Show loading indicator during API call

        // Prepare customer data object for API submission
        const customerData = {
          name, // Shop name (required)
          address, // Physical address (required)
          city: city || null, // City (optional - send null if empty)
          area: area || null, // Polling division/area (optional)
          phone, // Phone number (required)
          email: email || null, // Email (optional - send null if empty)
          contact_person: contactPerson || null, // Contact person (optional)
          credit_limit: creditLimit ? parseFloat(creditLimit) : 0, // Convert to number or default to 0
          registered_by: user?.id, // ID of the user creating this customer
        };

        console.log("Creating customer with user ID:", user?.id);

        // Call API service to create the customer in database
        await createCustomer(customerData);

        // Navigate to success screen with customer name parameter
        router.push({
          pathname: "/(customers)/customer-success",
          params: { customerName: name },
        });
      } catch (error) {
        // Handle API errors and show user-friendly message
        console.error("Error registering customer:", error);
        Alert.alert(
          "Registration Failed",
          "There was a problem registering the customer. Please try again."
        );
      } finally {
        // Always stop loading indicator regardless of success/failure
        setLoading(false);
      }
    } else {
      // Show error if validation fails
      Alert.alert("Error", "Please fill in all required fields");
    }
  };

  return (
    // Main container with safe area for device-specific spacing
    <SafeAreaView style={styles.safeArea}>
      {/* Status bar configuration for consistent appearance */}
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Header section with navigation and title */}
      <View style={styles.header}>
        {/* Back button to return to previous screen */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        {/* Page title */}
        <Text style={styles.headerTitle}>Register New Customer</Text>
        {/* Spacer for header alignment */}
        <View style={{ width: 40 }} />
      </View>

      {/* Keyboard avoiding view to handle keyboard appearance */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Scrollable content area */}
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }} // Extra padding for bottom navigation
        >
          {/* Introduction section with icon and description */}
          <View style={styles.introSection}>
            {/* Icon container with store-plus icon */}
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="store-plus"
                size={30}
                color={COLORS.light}
              />
            </View>
            {/* Introduction text */}
            <View style={styles.introTextContainer}>
              <Text style={styles.introTitle}>New Customer</Text>
              <Text style={styles.introSubtitle}>
                Add a new shop to your distribution network
              </Text>
            </View>
          </View>

          {/* Main form container */}
          <View style={styles.formContainer}>
            {/* Required Information Section Header */}
            <Text style={styles.sectionTitle}>Required Information</Text>

            {/* Shop Name Input Field */}
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
                {/* Store icon for shop name field */}
                <MaterialIcons
                  name="store"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                {/* Text input for shop name */}
                <TextInput
                  style={styles.input}
                  placeholder="Enter shop name"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    // Clear error when user starts typing
                    if (text.trim()) setErrors({ ...errors, name: false });
                  }}
                />
              </View>
              {/* Error message display */}
              {errors.name && (
                <Text style={styles.errorText}>Shop name is required</Text>
              )}
            </View>

            {/* Address Input Field - Multi-line text area */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Address <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.address && styles.inputError,
                  { height: 80, alignItems: "flex-start" }, // Taller container for multi-line input
                ]}
              >
                {/* Map pin icon for address field */}
                <Feather
                  name="map-pin"
                  size={20}
                  color="#ADB5BD"
                  style={[styles.inputIcon, { marginTop: 12 }]} // Adjusted position for multi-line
                />
                {/* Multi-line text input for address */}
                <TextInput
                  style={[
                    styles.input,
                    { height: 80, textAlignVertical: "top", paddingTop: 12 },
                  ]}
                  placeholder="Enter full address"
                  value={address}
                  onChangeText={(text) => {
                    setAddress(text);
                    // Clear error when user starts typing
                    if (text.trim()) setErrors({ ...errors, address: false });
                  }}
                  multiline // Enable multi-line input
                  numberOfLines={3} // Set initial number of lines
                />
              </View>
              {/* Address error message */}
              {errors.address && (
                <Text style={styles.errorText}>Address is required</Text>
              )}
            </View>

            {/* Phone Number Input Field with Validation */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Phone Number <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  (errors.phone || errors.phoneFormat) && styles.inputError, // Show error for both missing and invalid format
                ]}
              >
                {/* Phone icon */}
                <Feather
                  name="phone"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                {/* Phone number input with numeric keypad */}
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number (e.g., 0771234567)"
                  value={phone}
                  onChangeText={(text) => {
                    // Strip non-numeric characters as user types
                    const numericText = text.replace(/[^0-9]/g, "");
                    setPhone(numericText);

                    // Real-time validation feedback
                    if (numericText.trim()) {
                      setErrors({
                        ...errors,
                        phone: false, // Clear required field error
                        phoneFormat:
                          numericText.length === 10
                            ? !isValidSriLankanPhone(numericText) // Validate format if 10 digits
                            : true, // Show format error if not 10 digits
                      });
                    }
                  }}
                  keyboardType="phone-pad" // Show numeric keypad
                  maxLength={10} // Limit to 10 digits
                />
              </View>
              {/* Phone number error messages */}
              {errors.phone && (
                <Text style={styles.errorText}>Phone number is required</Text>
              )}
              {errors.phoneFormat && (
                <Text style={styles.errorText}>
                  Invalid Sri Lankan phone number
                </Text>
              )}
            </View>

            {/* Additional Information Section Header */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              Additional Information
            </Text>

            {/* City and District Row - Side by side inputs */}
            <View style={styles.rowInputs}>
              {/* City Input Field */}
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>City</Text>
                <View style={styles.inputContainer}>
                  {/* Map icon for city field */}
                  <Feather
                    name="map"
                    size={20}
                    color="#ADB5BD"
                    style={styles.inputIcon}
                  />
                  {/* City name input (optional field) */}
                  <TextInput
                    style={styles.input}
                    placeholder="Enter city"
                    value={city}
                    onChangeText={setCity} // Simple state update, no validation needed
                  />
                </View>
              </View>

              {/* District Selection Dropdown */}
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>District</Text>
                <View style={styles.pickerContainer}>
                  {/* District picker with predefined options */}
                  <Picker
                    selectedValue={district}
                    onValueChange={(itemValue) => {
                      setDistrict(itemValue);
                      // Auto-select first area when district changes
                      setArea(
                        UVA_POLLING_DIVISIONS[
                          itemValue as keyof typeof UVA_POLLING_DIVISIONS
                        ][0]
                      );
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Badulla" value="BADULLA" />
                    <Picker.Item label="Monaragala" value="MONARAGALA" />
                  </Picker>
                </View>
              </View>
            </View>

            {/* Area/Polling Division Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Area</Text>
              <View style={styles.pickerContainer}>
                {/* Dynamic area picker based on selected district */}
                <Picker
                  selectedValue={area}
                  onValueChange={(itemValue) => setArea(itemValue)}
                  style={styles.picker}
                >
                  {/* Dynamically populate areas based on selected district */}
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

            {/* Email Input Field with Format Validation */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.email && styles.inputError, // Show error styling for invalid email
                ]}
              >
                {/* Email icon */}
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                {/* Email input with email keyboard and validation */}
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    // Real-time email validation
                    if (text && isValidEmail(text)) {
                      setErrors({ ...errors, email: false });
                    }
                  }}
                  keyboardType="email-address" // Show email-optimized keyboard
                  autoCapitalize="none" // Prevent auto-capitalization for emails
                />
              </View>
              {/* Email format error message */}
              {errors.email && (
                <Text style={styles.errorText}>Invalid email address</Text>
              )}
            </View>

            {/* Contact Person Input Field with Name Validation */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Person</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.contactPerson && styles.inputError, // Show error for invalid characters
                ]}
              >
                {/* User icon for contact person */}
                <FontAwesome5
                  name="user"
                  size={18}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                {/* Contact person name input with character restriction */}
                <TextInput
                  style={styles.input}
                  placeholder="Enter contact person name"
                  value={contactPerson}
                  onChangeText={(text) => {
                    setContactPerson(text);
                    // Validate name format (letters, spaces, periods only)
                    if (!text || isValidContactName(text)) {
                      setErrors({ ...errors, contactPerson: false });
                    } else {
                      setErrors({ ...errors, contactPerson: true });
                    }
                  }}
                />
              </View>
              {/* Contact person validation error message */}
              {errors.contactPerson && (
                <Text style={styles.errorText}>
                  Only letters, spaces, and periods allowed
                </Text>
              )}
            </View>

            {/* Credit Limit Input Field with Numeric Validation */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Credit Limit</Text>
              <View style={styles.inputContainer}>
                {/* Money/currency icon */}
                <FontAwesome5
                  name="money-bill-alt"
                  size={18}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                {/* Credit limit input - numeric only with decimal support */}
                <TextInput
                  style={styles.input}
                  placeholder="Enter credit limit (optional)"
                  value={creditLimit}
                  onChangeText={(text) => {
                    // Allow only numbers and decimal point for currency input
                    if (/^\d*\.?\d*$/.test(text) || text === "") {
                      setCreditLimit(text);
                    }
                  }}
                  keyboardType="numeric" // Show numeric keypad
                />
              </View>
            </View>

            {/* Register Button - Main form submission */}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister} // Trigger form validation and submission
              disabled={loading} // Disable button during API call
            >
              {loading ? (
                // Show loading spinner during form submission
                <ActivityIndicator color={COLORS.light} />
              ) : (
                // Show normal button content with text and arrow icon
                <>
                  <Text style={styles.registerButtonText}>
                    Register Customer
                  </Text>
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

      {/* Bottom padding to account for root navigation tab bar */}
      <View style={{ height: 60 }} />
    </SafeAreaView>
  );
}

// StyleSheet containing all component styling definitions
const styles = StyleSheet.create({
  // Main container with light background
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA", // Light gray background
  },

  // Back button styling with subtle interaction area
  backButton: {
    padding: 8,
    borderRadius: 8,
  },

  // Header title text styling
  headerTitle: {
    fontSize: 18,
    fontWeight: "700", // Bold font weight
    color: COLORS.dark,
  },

  // Header container with navigation elements
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    elevation: 2, // Android shadow
    shadowColor: "#000", // iOS shadow properties
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    // Dynamic padding for different platforms and status bar heights
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 40 : 12,
  },

  // Main content container
  container: {
    flex: 1,
    padding: 16,
  },

  // Introduction section with icon and description
  introSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.dark, // Card shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2, // Card shadow for Android
  },

  // Circular icon container with primary color background
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30, // Makes it circular
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: COLORS.primary, // Colored shadow matching icon background
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Text container for introduction content
  introTextContainer: {
    flex: 1,
  },

  // Main introduction title
  introTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 4,
  },

  // Introduction subtitle/description
  introSubtitle: {
    fontSize: 14,
    color: "#6c757d", // Muted gray color
    lineHeight: 20,
  },

  // Main form container with card styling
  formContainer: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 20,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },

  // Section title with accent border
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 16,
    borderLeftWidth: 3, // Accent border on the left
    borderLeftColor: COLORS.primary,
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

  // Picker/dropdown container styling
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

  // Error state styling for input containers
  inputError: {
    borderColor: "#FF6B6B", // Red border for errors
    backgroundColor: "rgba(255, 107, 107, 0.05)", // Light red background tint
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

  // Error message text styling
  errorText: {
    fontSize: 12,
    color: "#FF6B6B", // Red error text
    marginTop: 4,
    marginLeft: 4,
  },

  // Row layout for side-by-side inputs
  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Primary register button styling
  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    height: 56,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    shadowColor: COLORS.primary, // Colored shadow matching button
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },

  // Register button text styling
  registerButtonText: {
    color: COLORS.light, // White text
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8, // Space before arrow icon
  },
});
