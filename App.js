import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";

import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";

import { SafeAreaProvider } from "react-native-safe-area-context";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./src/firebase/firebase";

import LoginScreen from "./src/screens/LoginScreen";
import AppShell from "./src/navigation/AppShell";
import { useFonts } from "expo-font";




/* ============================================================
   KEEP SPLASH SCREEN VISIBLE WHILE APP STARTS
   ============================================================ */

SplashScreen.preventAutoHideAsync();


/* ============================================================
   MAIN APP
   ============================================================ */

export default function App() {

  /* ==========================================================
     INTER FONT
     ========================================================== */

  const [fontsLoaded] = useFonts({
  Inter_400Regular: require("./assets/fonts/Inter_400Regular.ttf"),
  Inter_500Medium: require("./assets/fonts/Inter_500Medium.ttf"),
  Inter_600SemiBold: require("./assets/fonts/Inter_600SemiBold.ttf"),
  Inter_700Bold: require("./assets/fonts/Inter_700Bold.ttf"),
  Inter_800ExtraBold: require("./assets/fonts/Inter_800ExtraBold.ttf"),

  Ionicons: require("./assets/fonts/Ionicons.ttf"),
});


  /* ==========================================================
     FIREBASE AUTH
     ========================================================== */

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


  /* ==========================================================
     WAIT FOR BOTH:
     1. INTER FONT
     2. FIREBASE AUTH
     ========================================================== */

  if (!fontsLoaded || authLoading) {

    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F6F8F6",
        }}
      >
        <ActivityIndicator
          size="large"
        />
      </View>
    );
  }


  /* ==========================================================
     APPLICATION
     ========================================================== */

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