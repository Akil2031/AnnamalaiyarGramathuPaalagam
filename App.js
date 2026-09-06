import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";

import { SafeAreaProvider } from "react-native-safe-area-context";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./src/firebase/firebase";

import LoginScreen from "./src/screens/LoginScreen";
import AppShell from "./src/navigation/AppShell";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    console.log(
      "Starting Firebase authentication listener..."
    );

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {
          console.log(
            "Firebase auth state:",
            currentUser
              ? currentUser.email
              : "NOT LOGGED IN"
          );

          setUser(currentUser);
          setAuthLoading(false);

          await SplashScreen.hideAsync();
        }
      );

    return unsubscribe;
  }, []);

  if (authLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {user ? (
          <AppShell />
        ) : (
          <LoginScreen />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}