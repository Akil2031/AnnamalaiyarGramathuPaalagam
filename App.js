import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./src/firebase/firebase";

import LoginScreen from "./src/screens/LoginScreen";

import TabNavigator from "./src/navigation/TabNavigator";
// Keep splash screen visible
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;

    async function prepare() {
      await new Promise((resolve) =>
        setTimeout(resolve, 2500)
      );

      unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthLoading(false);
      });

      await SplashScreen.hideAsync();
    }

    prepare();

    return () => unsubscribe && unsubscribe();
  }, []);

  if (authLoading) return null;

  return (
    <NavigationContainer>
      {user ? <TabNavigator /> : <LoginScreen />}
    </NavigationContainer>
  );
}
