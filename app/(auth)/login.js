import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator, // Loading spinner component
  Alert, // Alert dialog component
  SafeAreaView, // Safe area container that respects device notches/status bars
  StatusBar, // Status bar component for controlling device status bar
  StyleSheet, // Utility for creating styles
  Text, // Text display component
  TextInput, // Text input field component
  TouchableOpacity, // Touchable button component
  View, // Basic container component
} from "react-native";

import { useAuth } from "../context/AuthContext"; // Import authentication context hook for managing user authentication state
import { login } from "../services/api"; // Import login API function to handle user authentication requests
import { COLORS } from "../theme/colors"; // Import color constants for consistent theming

// Defining the main login screen component as default export
export default function LoginScreen() {
  const [username, setUsername] = useState(""); // State hook for storing the username input value

  const [password, setPassword] = useState(""); // State hook for storing the password input value

  const [userType, setUserType] = useState("sales"); // State hook for storing the selected user type (defaults to "sales")

  const [loading, setLoading] = useState(false); // State hook for managing loading state during login process

  const { login: authLogin } = useAuth(); // Extract login function from authentication context

  // Async function to handle login process when login button is pressed
  const handleLogin = async () => {
    // Log to console for debugging purposes
    console.log("Login button pressed");

    // Validate that both username and password fields are filled
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }

    // Try-catch block to handle login process and potential errors
    try {
      // Set loading state to true to show loading indicator
      setLoading(true);
      // Log login attempt details for debugging
      console.log("Attempting to login with:", {
        username,
        password,
        userType,
      });

      // Call the login API function with user credentials
      const result = await login(username, password, userType);

      console.log("Login successful:", result);

      // Save user data to authentication context for app-wide access
      await authLogin(result.user);

      // Check if user has valid role and navigate accordingly
      if (
        result.user.role === "owner" ||
        result.user.role === "sales_rep" ||
        result.user.role === "lorry_driver"
      ) {
        // Log navigation action for debugging
        console.log(`Navigating to home as ${result.user.role}`);
        // Navigate to home screen and replace current screen in navigation stack
        router.replace("../(tabs)/home");
      } else {
        // Show error alert for invalid user roles
        Alert.alert("Login Error", "Invalid user role");
      }
    } catch (error) {
      // Log any errors that occur during login process
      console.error("Login error:", error);
      // Show user-friendly error alert with error message or default message
      Alert.alert(
        "Login Failed",
        error.message || "Please check your credentials"
      );
    } finally {
      // Always set loading to false when login process completes (success or failure)
      setLoading(false);
    }
  }; // Note: userType from the UI is mapped to backend roles as follows:
  // admin -> owner
  // sales -> sales_rep
  // driver -> lorry_driver

  // Return the JSX structure for the login screen UI
  return (
    // SafeAreaView ensures content doesn't overlap with device status bar/notches
    <SafeAreaView style={styles.container}>
      {/* Hide the device status bar for full screen experience */}
      <StatusBar hidden={true} />

      {/* Container for logo, title and subtitle */}
      <View style={styles.logoContainer}>
        {/* Circular logo container with company initials */}
        <View style={styles.logoCircle}>
          {/* Company initials text inside logo circle */}
          <Text style={styles.logoText}>RH</Text>
        </View>
        {/* Main company name title */}
        <Text style={styles.title}>Roo Herbals</Text>
        {/* Subtitle describing the application purpose */}
        <Text style={styles.subtitle}>Distribution Management System</Text>
      </View>

      {/* Container for the login form elements */}
      <View style={styles.formContainer}>
        {/* Container for user type selection tabs */}
        <View style={styles.tabContainer}>
          {/* Sales Rep tab button */}
          <TouchableOpacity
            style={[
              styles.tabButton,
              // Apply active tab style if sales is selected
              userType === "sales" ? styles.activeTab : null,
            ]}
            // Set user type to "sales" when pressed
            onPress={() => setUserType("sales")}
          >
            {/* Sales Rep tab text */}
            <Text
              style={[
                styles.tabText,
                // Apply active tab text style if sales is selected
                userType === "sales" ? styles.activeTabText : null,
              ]}
            >
              Sales Rep
            </Text>
          </TouchableOpacity>
          {/* Admin tab button */}
          <TouchableOpacity
            style={[
              styles.tabButton,
              // Apply active tab style if admin is selected
              userType === "admin" ? styles.activeTab : null,
            ]}
            // Set user type to "admin" when pressed
            onPress={() => setUserType("admin")}
          >
            {/* Admin tab text */}
            <Text
              style={[
                styles.tabText,
                // Apply active tab text style if admin is selected
                userType === "admin" ? styles.activeTabText : null,
              ]}
            >
              Admin
            </Text>
          </TouchableOpacity>
          {/* Driver tab button */}
          <TouchableOpacity
            style={[
              styles.tabButton,
              // Apply active tab style if driver is selected
              userType === "driver" ? styles.activeTab : null,
            ]}
            // Set user type to "driver" when pressed
            onPress={() => setUserType("driver")}
          >
            {/* Driver tab text */}
            <Text
              style={[
                styles.tabText,
                // Apply active tab text style if driver is selected
                userType === "driver" ? styles.activeTabText : null,
              ]}
            >
              Driver
            </Text>
          </TouchableOpacity>
        </View>

        {/* Username input field */}
        <TextInput
          style={styles.input} // Apply input field styling
          placeholder="Username" // Placeholder text when field is empty
          value={username} // Current value of username state
          onChangeText={setUsername} // Update username state when text changes
          autoCapitalize="none" // Disable automatic capitalization
          editable={!loading} // Disable input when loading
        />
        {/* Password input field */}
        <TextInput
          style={styles.input} // Apply input field styling
          placeholder="Password" // Placeholder text when field is empty
          value={password} // Current value of password state
          onChangeText={setPassword} // Update password state when text changes
          secureTextEntry // Hide password text for security
          editable={!loading} // Disable input when loading
        />
        {/* Login button */}
        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]} // Apply button styles and disabled style when loading
          onPress={handleLogin} // Call handleLogin function when pressed
          disabled={loading} // Disable button interaction when loading
        >
          {/* Conditional rendering: show loading spinner or login text */}
          {loading ? (
            // Show white loading spinner when loading
            <ActivityIndicator color={COLORS.light} />
          ) : (
            // Show "Login" text when not loading
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer container positioned at bottom of screen */}
      <View style={styles.footer}>
        {/* Copyright text */}
        <Text style={styles.footerText}>
          © 2024 Roo Herbals Pvt Ltd, Badalkumbura
        </Text>
      </View>
    </SafeAreaView> // End of SafeAreaView container
  ); // End of return statement
} // End of LoginScreen component function

// StyleSheet object containing all styling definitions for the component
const styles = StyleSheet.create({
  // Main container style - fills entire screen with light background
  container: {
    flex: 1, // Take up full available space
    backgroundColor: COLORS.light, // Set background to light color from theme
  },
  // Logo section container style - centers logo elements with spacing
  logoContainer: {
    alignItems: "center", // Center items horizontally
    marginTop: 80, // Space from top of screen
    marginBottom: 40, // Space below logo section
  },
  // Circular logo background style
  logoCircle: {
    width: 100, // Circle width
    height: 100, // Circle height
    borderRadius: 50, // Make it circular (half of width/height)
    backgroundColor: COLORS.primary, // Primary color background
    justifyContent: "center", // Center content vertically
    alignItems: "center", // Center content horizontally
    marginBottom: 15, // Space below logo circle
  },
  // Logo text style (company initials)
  logoText: {
    fontSize: 40, // Large font size for visibility
    fontWeight: "bold", // Bold font weight
    color: COLORS.light, // Light color text (white)
  },
  // Main title style (company name)
  title: {
    fontSize: 30, // Large font size for prominence
    fontWeight: "bold", // Bold font weight
    color: COLORS.primary, // Primary color text
  },
  // Subtitle style (app description)
  subtitle: {
    fontSize: 16, // Medium font size
    color: COLORS.secondary, // Secondary color text
    marginTop: 5, // Small space above subtitle
  },
  // Form container style - contains input fields and buttons
  formContainer: {
    paddingHorizontal: 30, // Horizontal padding for form elements
  },
  // Tab container style - contains user type selection tabs
  tabContainer: {
    flexDirection: "row", // Arrange tabs horizontally
    marginBottom: 20, // Space below tab container
    backgroundColor: COLORS.lightGray, // Light gray background
    borderRadius: 8, // Rounded corners
    overflow: "hidden", // Hide content that overflows rounded corners
  },
  // Individual tab button style
  tabButton: {
    flex: 1, // Equal width for all tabs
    paddingVertical: 12, // Vertical padding for touch area
    alignItems: "center", // Center text horizontally
  },
  // Active tab style - applied to selected tab
  activeTab: {
    backgroundColor: COLORS.primary, // Primary color background for active tab
  },
  // Tab text style
  tabText: {
    fontSize: 16, // Medium font size
    color: COLORS.dark, // Dark color text
  },
  // Active tab text style - applied to selected tab text
  activeTabText: {
    color: COLORS.light, // Light color text (white)
    fontWeight: "bold", // Bold font weight for emphasis
  },
  // Input field style for username and password
  input: {
    height: 50, // Fixed height for input fields
    backgroundColor: COLORS.gray, // Gray background color
    borderRadius: 8, // Rounded corners
    paddingHorizontal: 15, // Horizontal padding for text
    marginBottom: 15, // Space below each input field
    fontSize: 16, // Medium font size for readability
  },
  // Login button style
  loginButton: {
    height: 50, // Fixed height matching input fields
    backgroundColor: COLORS.primary, // Primary color background
    borderRadius: 8, // Rounded corners
    justifyContent: "center", // Center content vertically
    alignItems: "center", // Center content horizontally
    marginTop: 10, // Space above login button
  },
  // Disabled login button style - applied when loading
  loginButtonDisabled: {
    backgroundColor: COLORS.primary + "80", // Adding opacity to primary color
  },
  // Login button text style
  buttonText: {
    color: COLORS.light, // Light color text (white)
    fontSize: 18, // Larger font size for button
    fontWeight: "bold", // Bold font weight for emphasis
  },
  // Footer container style - positioned at bottom of screen
  footer: {
    position: "absolute", // Absolute positioning
    bottom: 20, // 20 units from bottom of screen
    left: 0, // Align to left edge
    right: 0, // Align to right edge
    alignItems: "center", // Center content horizontally
  },
  // Footer text style (copyright text)
  footerText: {
    color: COLORS.secondary, // Secondary color text
    fontSize: 12, // Small font size
  },
});
