// Import required icon libraries for UI elements
import {
  AntDesign,
  Feather,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
// Import router for navigation between screens
import { router } from "expo-router";
// Import React hooks for component lifecycle management
import React, { useEffect } from "react";
// Import React Native components for UI and animations
import {
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Import custom color theme for consistent styling
import { COLORS } from "../theme/colors";

// Main component for the customer registration success screen
export default function CustomerSuccessScreen() {
  // Animation values for creating smooth transitions and effects
  const scaleAnim = new Animated.Value(0); // Controls the scale animation for success icon
  const opacityAnim = new Animated.Value(0); // Controls the fade-in animation for content

  // useEffect hook to trigger animations when component mounts
  useEffect(() => {
    // Success icon animation - creates a spring effect for the checkmark icon
    Animated.spring(scaleAnim, {
      toValue: 1, // Final scale value (normal size)
      friction: 4, // Controls the "bounciness" of the spring
      tension: 40, // Controls the speed of the spring
      useNativeDriver: true, // Uses native driver for better performance
    }).start();

    // Content opacity animation - fades in the text content with a delay
    Animated.timing(opacityAnim, {
      toValue: 1, // Final opacity (fully visible)
      duration: 600, // Animation duration in milliseconds
      delay: 300, // Delay before animation starts
      useNativeDriver: true, // Uses native driver for better performance
    }).start();
  }, []); // Empty dependency array - animations only run once on mount

  return (
    // SafeAreaView ensures content stays within safe display area
    <SafeAreaView style={styles.safeArea}>
      {/* StatusBar configuration for consistent appearance */}
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Success Background Pattern - creates a decorative curved background */}
      <View style={styles.backgroundPattern} />

      {/* Main container that centers the success card */}
      <View style={styles.container}>
        {/* Success card - the main content container with shadow and styling */}
        <View style={styles.successCard}>
          {/* Animated Success Icon - checkmark with spring animation */}
          <Animated.View
            style={[
              styles.successIconContainer,
              {
                transform: [{ scale: scaleAnim }], // Applies the scale animation
              },
            ]}
          >
            {/* Inner circle for the success icon */}
            <View style={styles.successIconInner}>
              <AntDesign name="checkcircle" size={60} color={COLORS.primary} />
            </View>
          </Animated.View>

          {/* Success Content - text and buttons with fade-in animation */}
          <Animated.View
            style={[styles.successContent, { opacity: opacityAnim }]}
          >
            {/* Main success title */}
            <Text style={styles.successTitle}>Customer Registered!</Text>
            {/* Success message explaining what happened */}
            <Text style={styles.successMessage}>
              The new customer has been successfully added to your distribution
              network
            </Text>

            {/* Action Buttons Section */}
            {/* Primary action button - navigates to create new order */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/(orders)/order-add")}
            >
              <Feather
                name="shopping-cart"
                size={18}
                color={COLORS.light}
                style={styles.buttonIcon}
              />
              <Text style={styles.primaryButtonText}>
                Continue to New Order
              </Text>
            </TouchableOpacity>

            {/* Secondary action button - returns to customer list */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("../(customers)")}
            >
              <MaterialCommunityIcons
                name="account-group"
                size={18}
                color={COLORS.primary}
                style={styles.buttonIcon}
              />
              <Text style={styles.secondaryButtonText}>Back to Customers</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Bottom Navigation Bar - fixed navigation at the bottom */}
      <View style={styles.bottomNav}>
        {/* Home navigation button */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(tabs)")}
        >
          <AntDesign name="home" size={22} color={COLORS.dark} />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        {/* Customers navigation button - highlighted as current section */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("../(customers)")}
        >
          <FontAwesome5 name="users" size={20} color={COLORS.primary} />
          <Text style={[styles.navLabel, { color: COLORS.primary }]}>
            Customers
          </Text>
        </TouchableOpacity>

        {/* Profile navigation button */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(tabs)/profile")}
        >
          <FontAwesome5 name="user-alt" size={20} color={COLORS.dark} />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Get device dimensions for responsive styling
const { height } = Dimensions.get("window");

// StyleSheet containing all the styling rules for the component
const styles = StyleSheet.create({
  // Main container style - takes full screen with light background
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  // Decorative background pattern at the top of the screen
  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.3, // Takes 30% of screen height
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 30, // Creates curved bottom corners
    borderBottomRightRadius: 30,
    opacity: 0.9, // Slightly transparent for visual appeal
  },
  // Main content container - centers the success card vertically and horizontally
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  // Success card styling - main content area with shadow and rounded corners
  successCard: {
    backgroundColor: COLORS.light,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
    // Shadow properties for iOS
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    // Elevation for Android shadow
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  // Container for the animated success icon
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60, // Makes it circular
    backgroundColor: "rgba(125, 164, 83, 0.1)", // Light green background
    justifyContent: "center",
    alignItems: "center",
    marginTop: -80, // Negative margin to overlap with card edge
    // Shadow for the icon container
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 6,
    borderColor: COLORS.light, // White border around the icon
  },
  // Inner circle styling for the success icon
  successIconInner: {
    width: 90,
    height: 90,
    borderRadius: 45, // Makes it circular
    backgroundColor: COLORS.light,
    justifyContent: "center",
    alignItems: "center",
  },
  // Container for the success content (text and buttons)
  successContent: {
    width: "100%",
    alignItems: "center",
    marginTop: 16,
  },
  // Main success title styling
  successTitle: {
    fontSize: 24,
    fontWeight: "800", // Extra bold text
    color: COLORS.dark,
    marginBottom: 12,
    textAlign: "center",
  },
  // Success message text styling
  successMessage: {
    fontSize: 15,
    color: "#6c757d", // Muted gray color
    textAlign: "center",
    lineHeight: 22, // Improved readability with line spacing
    marginBottom: 30,
  },
  // Primary action button styling (green button)
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: "100%",
    flexDirection: "row", // Places icon and text side by side
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    // Shadow for the button
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  // Primary button text styling
  primaryButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "700", // Bold text
  },
  // Secondary action button styling (light green button)
  secondaryButton: {
    backgroundColor: "rgba(125, 164, 83, 0.1)", // Light green background
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
    flexDirection: "row", // Places icon and text side by side
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  // Secondary button text styling
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600", // Semi-bold text
  },
  // Styling for icons inside buttons
  buttonIcon: {
    marginRight: 8, // Space between icon and text
  },
  // Bottom navigation bar styling
  bottomNav: {
    flexDirection: "row", // Horizontal layout for nav items
    backgroundColor: COLORS.light,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5", // Light gray border
    paddingVertical: 10,
    justifyContent: "space-around", // Evenly distributes nav items
  },
  // Individual navigation item styling
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    width: "33%", // Each nav item takes 1/3 of the width
  },
  // Navigation label text styling
  navLabel: {
    fontSize: 12,
    marginTop: 4, // Space between icon and label
    color: COLORS.dark,
    fontWeight: "500", // Medium weight text
  },
});
