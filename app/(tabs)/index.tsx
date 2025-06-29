import { Redirect } from "expo-router";

export default function Index() {
  // Redirect to the login screen on app launch
  return <Redirect href="/(auth)/login" />;
}
