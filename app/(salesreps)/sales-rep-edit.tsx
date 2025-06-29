// Import all necessary icons from expo vector icons for UI elements
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
// Import router for navigation and useLocalSearchParams to get URL parameters
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
// Import all required React Native components for the form and UI
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
// Import animation library for smooth transitions and success screen effects
import * as Animatable from "react-native-animatable";
// Import API functions to fetch and update sales representative data
import { getSalesRepById, updateSalesRep } from "../services/salesRepApi";
// Import app color scheme
import { COLORS } from "../theme/colors";

// Define the interface for Sales Representative data structure
// This ensures type safety when working with sales rep objects
interface SalesRep {
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  area: string;
  commission_rate: number;
  is_active: boolean;
}

// Success screen component with cinematic animation
// This component displays after successfully updating a sales representative
// It shows a beautiful animated checkmark and success message
const SuccessScreen = ({ onNavigateBack }: { onNavigateBack: () => void }) => {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.light,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Animated container for the success icon with zoom-in effect */}
      <Animatable.View
        animation="zoomIn"
        duration={800}
        style={{ alignItems: "center" }}
      >
        {/* Circular background for the success checkmark */}
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "#4ECDC4",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          {/* Animated checkmark icon that bounces in after a delay */}
          <Animatable.View animation="bounceIn" delay={500} duration={1500}>
            <MaterialIcons name="check" size={80} color={COLORS.light} />
          </Animatable.View>
        </View>
      </Animatable.View>

      {/* Success title text with fade-in-up animation */}
      <Animatable.Text
        animation="fadeInUp"
        delay={300}
        style={{
          fontSize: 24,
          fontWeight: "700",
          color: COLORS.dark,
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        Success!
      </Animatable.Text>

      {/* Success description text with staggered animation */}
      <Animatable.Text
        animation="fadeInUp"
        delay={600}
        style={{
          fontSize: 16,
          color: "#6C757D",
          textAlign: "center",
          marginBottom: 40,
          paddingHorizontal: 40,
        }}
      >
        Sales representative information has been updated successfully
      </Animatable.Text>

      {/* Animated button to navigate back to the previous screen */}
      <Animatable.View animation="fadeInUp" delay={900}>
        <TouchableOpacity
          style={{
            backgroundColor: COLORS.primary,
            paddingVertical: 12,
            paddingHorizontal: 32,
            borderRadius: 8,
          }}
          onPress={onNavigateBack}
        >
          <Text
            style={{ color: COLORS.light, fontSize: 16, fontWeight: "600" }}
          >
            Back to Details
          </Text>
        </TouchableOpacity>
      </Animatable.View>
    </View>
  );
};

// Main component for editing sales representative information
export default function EditSalesRepScreen() {
  // Extract the sales rep ID from the URL parameters
  const { salesRepId } = useLocalSearchParams();

  // State management for different UI states and data
  const [loading, setLoading] = useState(true); // Controls loading spinner display
  const [submitting, setSubmitting] = useState(false); // Controls submit button state
  const [salesRep, setSalesRep] = useState<SalesRep | null>(null); // Stores original sales rep data
  const [formData, setFormData] = useState<Partial<SalesRep>>({}); // Stores form input data
  const [errors, setErrors] = useState<{ [key: string]: string }>({}); // Stores validation errors
  const [success, setSuccess] = useState(false); // Controls success screen display

  // Function to fetch sales representative data from the API
  // Using useCallback to prevent unnecessary re-renders and dependency issues
  const fetchSalesRepData = useCallback(async () => {
    try {
      setLoading(true);

      // Call the API service to get sales rep details by ID
      const data = await getSalesRepById(salesRepId as string);
      setSalesRep(data); // Store the original data
      setFormData(data); // Initialize form with existing data
      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching sales rep data:", error);
      // Show user-friendly error message if data fetch fails
      Alert.alert(
        "Error",
        error.message || "Failed to load sales representative data"
      );
      setLoading(false);
    }
  }, [salesRepId]);

  // Load sales rep data when component mounts or salesRepId changes
  useEffect(() => {
    fetchSalesRepData();
  }, [fetchSalesRepData]);

  // Sri Lankan phone number validation function
  // Validates phone numbers according to Sri Lankan telecommunication standards
  const isValidSriLankanPhone = (phoneNumber: string) => {
    // All Sri Lankan phone numbers are 10 digits and start with 0
    // Valid prefixes include: 07x (mobile), 011 (Colombo), 038 (Galle), 055 (Badulla),
    // 031 (Negombo), 081 (Kandy), 025 (Anuradhapura), 021 (Jaffna), etc.

    // List of all valid Sri Lankan phone number prefixes
    const validPrefixes = [
      // Mobile network prefixes (Dialog, Mobitel, Hutch, Airtel)
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
      // Fixed line prefixes for different cities and districts
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

    // Basic format check: exactly 10 digits starting with 0
    if (!/^0\d{9}$/.test(phoneNumber)) {
      return false;
    }

    // Check if the number starts with any valid prefix
    return validPrefixes.some((prefix) => phoneNumber.startsWith(prefix));
  };

  // Email validation function using regular expression
  // Checks for basic email format: something@domain.extension
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Name validation function - ensures only proper name characters
  // Allows alphabetic characters, spaces, and periods (for titles like Mr., Dr.)
  const isValidName = (name: string): boolean => {
    const nameRegex = /^[A-Za-z\s.]+$/;
    return nameRegex.test(name);
  };

  // Generic form field change handler
  // Handles updates to any form field and manages validation error clearing
  const handleChange = (field: keyof SalesRep, value: any) => {
    // Special handling for phone input - strip all non-numeric characters
    // This ensures only digits are stored for phone numbers
    if (field === "phone" && typeof value === "string") {
      value = value.replace(/[^0-9]/g, "");
    }

    // Update the form data with the new value
    setFormData({ ...formData, [field]: value });

    // Clear any existing validation error for this field when user starts typing
    // This provides immediate feedback that they're addressing the error
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  // Special handler for commission rate input
  // Ensures only valid decimal numbers with up to 2 decimal places
  const handleCommissionChange = (value: string) => {
    // Regex to allow integers and decimals with up to 2 decimal places
    // Examples: 5, 5.2, 5.25, but not 5.256
    const regex = /^\d*\.?\d{0,2}$/;
    if (regex.test(value)) {
      // Convert to number if not empty, otherwise keep as empty string
      handleChange("commission_rate", value === "" ? "" : parseFloat(value));
    }
  };

  // Comprehensive form validation function
  // Validates all required fields and returns true if form is valid
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Validate full name field
    if (!formData.full_name || formData.full_name.trim() === "") {
      newErrors.full_name = "Full name is required";
    } else if (!isValidName(formData.full_name)) {
      newErrors.full_name =
        "Name should only contain letters, spaces, and periods";
    }

    // Validate phone number field
    if (!formData.phone || formData.phone.trim() === "") {
      newErrors.phone = "Phone number is required";
    } else if (!isValidSriLankanPhone(formData.phone)) {
      newErrors.phone = "Invalid Sri Lankan phone number";
    }

    // Validate area field (work location)
    if (!formData.area || formData.area.trim() === "") {
      newErrors.area = "Area is required";
    }

    // Validate email if provided (optional field)
    if (formData.email && formData.email.trim() !== "") {
      if (!isValidEmail(formData.email)) {
        newErrors.email = "Invalid email format";
      }
    }

    // Validate commission rate field
    if (
      formData.commission_rate === undefined ||
      formData.commission_rate === null
    ) {
      newErrors.commission_rate = "Commission rate is required";
    } else if (
      isNaN(Number(formData.commission_rate)) ||
      Number(formData.commission_rate) < 0 ||
      Number(formData.commission_rate) > 100
    ) {
      newErrors.commission_rate = "Rate must be between 0 and 100";
    }

    // Set all validation errors and return whether form is valid
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  // Validates form data and calls API to update sales representative
  const handleSubmit = async () => {
    // First validate all form fields
    if (!validateForm()) {
      return; // Stop if validation fails
    }

    try {
      setSubmitting(true); // Show loading state on submit button

      // Call the API service to update the sales rep data
      await updateSalesRep(salesRepId as string, formData);

      setSubmitting(false);
      // Show success animation screen instead of immediate navigation
      setSuccess(true);
    } catch (error: any) {
      setSubmitting(false);
      // Show user-friendly error message if update fails
      Alert.alert(
        "Error",
        error.message || "Failed to update sales representative"
      );
    }
  };

  // Loading state UI - shown while fetching sales rep data
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        {/* Header with back button and title */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Sales Representative</Text>
          <View style={{ width: 24 }} />
        </View>
        {/* Loading spinner and message */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            Loading sales representative data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state UI - shown when sales rep data couldn't be loaded
  if (!salesRep) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Sales Representative</Text>
          <View style={{ width: 24 }} />
        </View>
        {/* Error message with retry option */}
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Sales Rep Not Found</Text>
          <Text style={styles.errorMessage}>
            The sales representative you&apos;re trying to edit doesn&apos;t
            exist or could not be loaded.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchSalesRepData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Success state - show animated success screen
  if (success) {
    return <SuccessScreen onNavigateBack={() => router.back()} />;
  }

  // Main edit form UI
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header with navigation and title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.light} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Sales Representative</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Keyboard avoiding view for better mobile experience */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Sales Rep Profile Header - displays avatar and basic info */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {/* Generate initials from the sales rep's full name */}
              <Text style={styles.avatarText}>
                {salesRep.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </Text>
            </View>
            <Text style={styles.salesRepId}>ID: {salesRep.user_id}</Text>
            <Text style={styles.usernameText}>@{salesRep.username}</Text>
          </View>

          {/* Form Section: Personal Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            {/* Full Name Input Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Full Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.full_name ? styles.inputError : null,
                ]}
              >
                <FontAwesome5
                  name="user-alt"
                  size={18}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  value={formData.full_name}
                  onChangeText={(text) => handleChange("full_name", text)}
                />
              </View>
              {errors.full_name ? (
                <Text style={styles.errorText}>{errors.full_name}</Text>
              ) : null}
            </View>

            {/* Phone Number Input Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Phone <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.phone ? styles.inputError : null,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number (e.g., 0771234567)"
                  value={formData.phone}
                  onChangeText={(text) => handleChange("phone", text)}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {errors.phone ? (
                <Text style={styles.errorText}>{errors.phone}</Text>
              ) : null}
            </View>

            {/* Email Input Field (Optional) */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.email ? styles.inputError : null,
                ]}
              >
                <MaterialCommunityIcons
                  name="email-outline"
                  size={18}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  value={formData.email}
                  onChangeText={(text) => handleChange("email", text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            {/* Address Input Field (Optional, Multiline) */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="home-outline"
                  size={18}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Enter address"
                  value={formData.address}
                  onChangeText={(text) => handleChange("address", text)}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>

          {/* Form Section: Work Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Work Information</Text>

            {/* Area/Territory Input Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Area <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.area ? styles.inputError : null,
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter area"
                  value={formData.area}
                  onChangeText={(text) => handleChange("area", text)}
                />
              </View>
              {errors.area ? (
                <Text style={styles.errorText}>{errors.area}</Text>
              ) : null}
            </View>

            {/* Commission Rate Input Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Commission Rate (%) <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.commission_rate ? styles.inputError : null,
                ]}
              >
                <MaterialIcons
                  name="attach-money"
                  size={18}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter commission rate"
                  value={formData.commission_rate?.toString()}
                  onChangeText={handleCommissionChange}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.commission_rate ? (
                <Text style={styles.errorText}>{errors.commission_rate}</Text>
              ) : null}
            </View>

            {/* Active Status Toggle Switch */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Active Status</Text>
              <View style={styles.switchWrapper}>
                <Text style={styles.switchText}>
                  {formData.is_active ? "Active" : "Inactive"}
                </Text>
                <Switch
                  trackColor={{ false: "#CED4DA", true: "#A8CF8E" }}
                  thumbColor={formData.is_active ? COLORS.primary : "#F4F3F4"}
                  onValueChange={(value) => handleChange("is_active", value)}
                  value={!!formData.is_active}
                />
              </View>
            </View>
          </View>

          {/* Submit Button - Updates the sales representative information */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              // Show loading spinner while submitting
              <ActivityIndicator size="small" color={COLORS.light} />
            ) : (
              // Show button text and icon when not submitting
              <>
                <Text style={styles.submitButtonText}>Update Sales Rep</Text>
                <MaterialIcons
                  name="check-circle"
                  size={20}
                  color={COLORS.light}
                />
              </>
            )}
          </TouchableOpacity>

          {/* Bottom spacer to ensure content is not hidden behind tab bar */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// StyleSheet for all component styles
// Organized by component sections for better maintainability
const styles = StyleSheet.create({
  // Main container styles
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA", // Light gray background
  },

  // Header navigation styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 15,
    // Dynamic padding for Android status bar
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 16 : 16,
  },
  backButton: {
    width: 24, // Fixed width for consistent spacing
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.light,
  },

  // Content container styles
  scrollContainer: {
    padding: 16,
  },

  // Loading state styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.dark,
  },

  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.dark,
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "600",
  },

  // Sales rep profile header styles
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40, // Perfect circle
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.light,
  },
  salesRepId: {
    fontSize: 14,
    color: "#6c757d", // Muted text color
    marginBottom: 4,
  },
  usernameText: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: "500",
  },

  // Form section styles
  formSection: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    // Subtle shadow for depth
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2, // Android shadow
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary, // Accent border
    paddingLeft: 10,
  },

  // Input field styles
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
    marginBottom: 8,
  },
  requiredStar: {
    color: "#FF6B6B", // Red color for required indicator
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CED4DA", // Light gray border
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12, // Space between icon and input
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
    paddingVertical: 8,
  },
  multilineInput: {
    textAlignVertical: "top", // Start text at top for multiline
    paddingTop: 12,
    minHeight: 80,
  },
  inputError: {
    borderColor: "#FF6B6B", // Red border for validation errors
    backgroundColor: "rgba(255, 107, 107, 0.05)", // Light red background
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginTop: 4,
    marginLeft: 4,
  },

  // Switch/Toggle styles
  switchContainer: {
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
    marginBottom: 8,
  },
  switchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#CED4DA",
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
  },
  switchText: {
    fontSize: 16,
    color: COLORS.dark,
  },

  // Submit button styles
  submitButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    height: 52,
    marginTop: 8,
    // Enhanced shadow for button emphasis
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.light,
    marginRight: 8,
  },

  // Bottom spacer to prevent content being hidden by navigation
  bottomSpacer: {
    height: 95, // Account for tab bar and safe area
  },
});
