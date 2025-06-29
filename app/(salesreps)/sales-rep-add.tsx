import {
  AntDesign,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
import * as Animatable from "react-native-animatable";
import { useAuth } from "../context/AuthContext"; // Import auth context
import { addSalesRep } from "../services/salesRepApi";
import { COLORS } from "../theme/colors";

// SuccessScreen component for animated success feedback
// Props: onAnimationEnd - callback when animation ends
interface SuccessScreenProps {
  onAnimationEnd: () => void;
}

// Animated success screen shown after successful sales rep addition
const SuccessScreen = ({ onAnimationEnd }: SuccessScreenProps) => {
  return (
    <View style={successStyles.container}>
      <Animatable.View
        animation="zoomIn"
        duration={700}
        style={successStyles.circleContainer}
        onAnimationEnd={onAnimationEnd}
      >
        <Animatable.View
          animation="bounceIn"
          delay={700}
          duration={700}
          style={successStyles.checkmarkContainer}
        >
          <AntDesign name="check" size={50} color={COLORS.light} />
        </Animatable.View>
      </Animatable.View>

      <Animatable.Text
        animation="fadeInUp"
        delay={1200}
        style={successStyles.title}
      >
        Success!
      </Animatable.Text>

      <Animatable.Text
        animation="fadeInUp"
        delay={1400}
        style={successStyles.message}
      >
        Sales Representative added successfully
      </Animatable.Text>

      <Animatable.View animation="fadeInUp" delay={1600}>
        <TouchableOpacity
          style={successStyles.button}
          onPress={() => router.replace("/(salesreps)")}
        >
          <Text style={successStyles.buttonText}>Go to Sales Rep List</Text>
        </TouchableOpacity>
      </Animatable.View>
    </View>
  );
};

// Interface for the sales rep form data
interface FormData {
  username: string;
  password: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  area: string;
  commission_rate: string;
}

// Main component for adding a sales representative
export default function AddSalesRepScreen() {
  // Get permission check function from auth context
  const { hasPermission } = useAuth(); // Get permission check function

  // Check if user has permission to manage sales reps on mount
  useEffect(() => {
    if (!hasPermission("manage_sales_reps")) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to add sales representatives.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // State for loading indicator
  const [loading, setLoading] = useState(false);
  // State for form data
  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
    full_name: "",
    email: "",
    phone: "",
    address: "",
    area: "",
    commission_rate: "10.00",
  });

  // State for form validation errors
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  // State to show success screen
  const [showSuccess, setShowSuccess] = useState(false);
  // Ref for animation (not used in this code)
  const animRef = useRef(null);

  // Validate Sri Lankan phone numbers
  const isValidSriLankanPhone = (phoneNumber: string) => {
    // All Sri Lankan phone numbers are 10 digits and start with 0
    // Valid prefixes include: 07x (mobile), 011 (Colombo), 038 (Galle), 055 (Badulla),
    // 031 (Negombo), 081 (Kandy), 025 (Anuradhapura), 021 (Jaffna), etc.

    const validPrefixes = [
      // Mobile prefixes
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
      // City/area codes
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

    // Basic format check: 10 digits starting with 0
    if (!/^0\d{9}$/.test(phoneNumber)) {
      return false;
    }

    // Check for valid prefix
    return validPrefixes.some((prefix) => phoneNumber.startsWith(prefix));
  };

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate name (letters, spaces, periods)
  const isValidName = (name: string): boolean => {
    const nameRegex = /^[A-Za-z\s.]+$/;
    return nameRegex.test(name);
  };

  // Handle changes to form fields
  const handleChange = (field: keyof FormData, value: string) => {
    // Special handling for phone numbers - only allow digits
    if (field === "phone") {
      value = value.replace(/[^0-9]/g, "");
    }

    setFormData({ ...formData, [field]: value });

    // Clear error when user types
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  // Handle commission rate input (only allow valid numbers)
  const handleCommissionChange = (value: string) => {
    // Only allow numbers and up to two decimal places
    const regex = /^\d*\.?\d{0,2}$/;
    if (regex.test(value)) {
      handleChange("commission_rate", value);
    }
  };

  // Validate the form and set errors if any
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Required fields
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 4) {
      newErrors.username = "Username must be at least 4 characters";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Full name is required";
    } else if (!isValidName(formData.full_name)) {
      newErrors.full_name =
        "Name should only contain letters, spaces, and periods";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!isValidSriLankanPhone(formData.phone)) {
      newErrors.phone = "Invalid Sri Lankan phone number";
    }

    if (!formData.area.trim()) {
      newErrors.area = "Area is required";
    }

    // Email validation - only if provided
    if (formData.email.trim() && !isValidEmail(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Commission rate validation
    if (!formData.commission_rate.trim()) {
      newErrors.commission_rate = "Commission rate is required";
    } else {
      const rate = parseFloat(formData.commission_rate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        newErrors.commission_rate = "Rate must be between 0 and 100";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Format data for API
      const salesRepData = {
        ...formData,
        commission_rate: parseFloat(formData.commission_rate),
      };

      // Call the API to add the sales rep
      const response = await addSalesRep(salesRepData);

      setLoading(false);
      setShowSuccess(true);
    } catch (error: any) {
      setLoading(false);
      Alert.alert(
        "Error",
        error.message || "Failed to add sales representative"
      );
    }
  };

  // Show loading indicator while submitting
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Sales Representative</Text>
          <View style={{ width: 24 }} />
        </View>
        <Animatable.View
          animation="fadeIn"
          duration={500}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Adding sales representative...</Text>
        </Animatable.View>
      </SafeAreaView>
    );
  }

  // Show success screen after successful submission
  if (showSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <SuccessScreen onAnimationEnd={() => {}} />
      </SafeAreaView>
    );
  }

  // Main form UI
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.light} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Sales Representative</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Introduction Card */}
          <Animatable.View
            animation="fadeInUp"
            duration={500}
            style={styles.introCard}
          >
            <View style={styles.introIconContainer}>
              <FontAwesome5 name="user-plus" size={24} color={COLORS.light} />
            </View>
            <Text style={styles.introTitle}>
              Register New Sales Representative
            </Text>
            <Text style={styles.introText}>
              Fill in the details below to add a new sales representative to the
              system. They will be able to collect orders and manage customers.
            </Text>
          </Animatable.View>

          {/* Form Section: Account Information */}
          <Animatable.View
            animation="fadeInUp"
            duration={500}
            style={styles.formSection}
          >
            <Text style={styles.sectionTitle}>Account Information</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Username <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.username ? styles.inputError : null,
                ]}
              >
                <MaterialCommunityIcons
                  name="account"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter username"
                  value={formData.username}
                  onChangeText={(text) => handleChange("username", text)}
                  autoCapitalize="none"
                  maxLength={20}
                />
              </View>
              {errors.username ? (
                <Text style={styles.errorText}>{errors.username}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Password <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.password ? styles.inputError : null,
                ]}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  value={formData.password}
                  onChangeText={(text) => handleChange("password", text)}
                  secureTextEntry
                />
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>
          </Animatable.View>

          {/* Form Section: Personal Information */}
          <Animatable.View
            animation="fadeInUp"
            duration={500}
            style={styles.formSection}
          >
            <Text style={styles.sectionTitle}>Personal Information</Text>

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
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter email (optional)"
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

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Phone Number <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.phone ? styles.inputError : null,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={20}
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

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.address ? styles.inputError : null,
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Enter address (optional)"
                  value={formData.address}
                  onChangeText={(text) => handleChange("address", text)}
                  multiline
                  numberOfLines={3}
                />
              </View>
              {errors.address ? (
                <Text style={styles.errorText}>{errors.address}</Text>
              ) : null}
            </View>
          </Animatable.View>

          {/* Form Section: Assignment Details */}
          <Animatable.View
            animation="fadeInUp"
            duration={500}
            style={styles.formSection}
          >
            <Text style={styles.sectionTitle}>Assignment Details</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Assigned Area <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.area ? styles.inputError : null,
                ]}
              >
                <MaterialIcons
                  name="map"
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter assigned area (e.g., Badulla)"
                  value={formData.area}
                  onChangeText={(text) => handleChange("area", text)}
                />
              </View>
              {errors.area ? (
                <Text style={styles.errorText}>{errors.area}</Text>
              ) : null}
            </View>

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
                  size={20}
                  color="#ADB5BD"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter commission rate"
                  value={formData.commission_rate}
                  onChangeText={handleCommissionChange}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.commission_rate ? (
                <Text style={styles.errorText}>{errors.commission_rate}</Text>
              ) : null}
            </View>
          </Animatable.View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>
              Register Sales Representative
            </Text>
          </TouchableOpacity>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles for the main form and UI
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 16 : 16,
  },
  backButton: {
    width: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.light,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100, // Increased padding at the bottom to prevent overlap with navigation
  },
  introCard: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  introIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 10,
  },
  introText: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    lineHeight: 20,
  },
  formSection: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    paddingLeft: 10,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 8,
    fontWeight: "500",
  },
  requiredStar: {
    color: "#FF6B6B",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: "#FF6B6B",
    backgroundColor: "rgba(255, 107, 107, 0.05)",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: COLORS.dark,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginTop: 5,
    marginLeft: 5,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  submitButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "700",
  },
  bottomSpacer: {
    height: 60, // Increased from 20 to 60 for more space at the bottom
  },
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
});

// Styles for the success screen
const successStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.light,
  },
  circleContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  checkmarkContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  buttonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "700",
  },
});
