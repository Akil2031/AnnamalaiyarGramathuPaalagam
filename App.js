import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./src/firebase/firebase";

import TabNavigator from "./src/navigation/TabNavigator";
import LoginScreen from "./src/screens/LoginScreen";

// Keep splash screen visible
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function prepare() {
      // ⏱ SPLASH INTERVAL (unchanged)
      await new Promise((resolve) =>
        setTimeout(resolve, 2500)
      );

       // 🚨 FORCE LOGOUT ON APP START
    await auth.signOut();

      // Listen to auth state
      const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthLoading(false);
      });

      // Hide splash only after auth check
      await SplashScreen.hideAsync();

      return unsub;
    }

    prepare();
  }, []);

  // ⛔ Prevent rendering until auth is known
  if (authLoading) return null;

  return (
    <NavigationContainer>
      {user ? <TabNavigator /> : <LoginScreen />}
    </NavigationContainer>
  );
}
