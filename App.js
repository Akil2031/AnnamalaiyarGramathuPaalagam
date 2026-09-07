import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";

import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";

import { SafeAreaProvider } from "react-native-safe-area-context";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./src/firebase/firebase";

import LoginScreen from "./src/screens/LoginScreen";
import AppShell from "./src/navigation/AppShell";

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";


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
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
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