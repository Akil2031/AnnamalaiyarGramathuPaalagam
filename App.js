import { useEffect } from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";

import TabNavigator from "./src/navigation/TabNavigator";

// Keep splash screen visible
SplashScreen.preventAutoHideAsync();

export default function App() {

  useEffect(() => {
    async function prepare() {
      // ⏱ SPLASH INTERVAL (change time here)
      await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5 sec

      // Hide splash screen
      await SplashScreen.hideAsync();
    }

    prepare();
  }, []);

  return (
    <NavigationContainer>
      {Platform.OS === "web" ? (
        <TabNavigator />
      ) : (
        <TabNavigator />
      )}
    </NavigationContainer>
  );
}
