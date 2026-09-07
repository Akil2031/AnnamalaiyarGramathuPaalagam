import React from "react";
import { Text as RNText, StyleSheet } from "react-native";

function getFontFamily(weight) {
  if (weight === "bold") {
    return "Inter_700Bold";
  }

  const numericWeight = Number(weight);

  if (!Number.isNaN(numericWeight)) {
    if (numericWeight >= 800) {
      return "Inter_800ExtraBold";
    }

    if (numericWeight >= 600) {
      return "Inter_600SemiBold";
    }

    if (numericWeight >= 500) {
      return "Inter_500Medium";
    }
  }

  return "Inter_400Regular";
}

export default function AppText({
  style,
  children,
  ...props
}) {
  const flattenedStyle = StyleSheet.flatten(style) || {};

  const fontWeight =
    flattenedStyle.fontWeight || "400";

  const originalFontSize =
    typeof flattenedStyle.fontSize === "number"
      ? flattenedStyle.fontSize
      : 16;

  return (
    <RNText
      {...props}
      style={[
        style,
        {
          fontFamily: getFontFamily(fontWeight),
          fontSize: originalFontSize + 1,
          fontWeight: undefined,
        },
      ]}
    >
      {children}
    </RNText>
  );
}