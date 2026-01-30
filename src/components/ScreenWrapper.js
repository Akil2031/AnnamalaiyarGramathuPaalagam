import React from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";

export default function ScreenWrapper({
  children,
  headerColor = "#2E7D32",
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        backgroundColor={headerColor}
        barStyle="light-content"
      />

      <View
        style={[
          styles.container,
          Platform.OS === "android" && {
            paddingTop: StatusBar.currentHeight,
          },
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F1F8E9",
  },
  container: {
    flex: 1,
  },
});
