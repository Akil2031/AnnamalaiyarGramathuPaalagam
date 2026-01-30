import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import TabNavigator from "./src/navigation/TabNavigator";


export default function App() {
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
