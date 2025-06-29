import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { router, Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { COLORS } from "../app/theme/colors";
import { AuthProvider } from "./context/AuthContext";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // Check if we should show the bottom navigation
  // Don't show it on login screen or other specific screens
  const shouldShowNav =
    !pathname.includes("(auth)") &&
    !pathname.includes("+not-found") &&
    !pathname.includes("/login");

  // Determine which tab is active
  const isHomeActive =
    pathname.includes("/home") ||
    pathname.includes("(customers)") ||
    pathname.includes("(suppliers)") ||
    pathname.includes("(drivers)") ||
    pathname.includes("(orders)") ||
    pathname.includes("(salesreps)") ||
    pathname.includes("(reports)");

  const isProductsActive = pathname.includes("/products");
  const isProfileActive = pathname.includes("/profile");

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <View style={styles.container}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="(auth)/login"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="(main)/products"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="(main)/product-detail"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="(main)/dashboard"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="(main)/product-add"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="(main)/product-edit"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
            <Stack.Screen name="(tabs)/home" options={{ headerShown: false }} />
            <Stack.Screen name="(customers)" options={{ headerShown: false }} />
            <Stack.Screen name="(suppliers)" options={{ headerShown: false }} />
            <Stack.Screen name="(reports)" options={{ headerShown: false }} />
            <Stack.Screen name="(drivers)" options={{ headerShown: false }} />
            <Stack.Screen name="(orders)" options={{ headerShown: false }} />
            <Stack.Screen name="(salesreps)" options={{ headerShown: false }} />
            <Stack.Screen name="(main)" options={{ headerShown: false }} />
          </Stack>

          {shouldShowNav && (
            <View style={styles.bottomNavigation}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => router.push("/(tabs)/home")}
              >
                <Text
                  style={[
                    styles.navIcon,
                    isHomeActive ? styles.activeIcon : null,
                  ]}
                >
                  🏠
                </Text>
                <Text
                  style={[
                    styles.navLabel,
                    isHomeActive ? styles.activeLabel : null,
                  ]}
                >
                  Home
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navButton}
                onPress={() => router.push("/(tabs)/products")}
              >
                <Text
                  style={[
                    styles.navIcon,
                    isProductsActive ? styles.activeIcon : null,
                  ]}
                >
                  📦
                </Text>
                <Text
                  style={[
                    styles.navLabel,
                    isProductsActive ? styles.activeLabel : null,
                  ]}
                >
                  Products
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navButton}
                onPress={() => router.push("/(tabs)/profile")}
              >
                <Text
                  style={[
                    styles.navIcon,
                    isProfileActive ? styles.activeIcon : null,
                  ]}
                >
                  👤
                </Text>
                <Text
                  style={[
                    styles.navLabel,
                    isProfileActive ? styles.activeLabel : null,
                  ]}
                >
                  Profile
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </View>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  bottomNavigation: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: COLORS.light,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 25 : 10,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  navButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 2,
    color: COLORS.secondary,
  },
  navLabel: {
    fontSize: 12,
    color: COLORS.secondary,
  },
  activeIcon: {
    color: COLORS.primary,
  },
  activeLabel: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
});
