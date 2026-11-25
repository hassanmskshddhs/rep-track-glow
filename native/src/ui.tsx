import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

// FORGED dark theme, same tokens as the web app (src/styles.css)
export const colors = {
  background: "#101411",
  foreground: "#f0f2e9",
  card: "#1b231e",
  primary: "#c8f2cb",
  primaryForeground: "#101411",
  mutedForeground: "#a5b2a8",
  border: "#303b33",
  input: "#3a493e",
  brand: "#ff8459",
  destructive: "#f17d79",
};

export function RiseIn({
  delay = 0,
  children,
  style,
}: {
  delay?: number;
  children: React.ReactNode;
  style?: object;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      delay,
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <View style={ui.wordmark}>
      <Text style={[ui.brandBars, { fontSize: size + 2 }]}>Ⅱ</Text>
      <Text style={[ui.wordmarkText, { fontSize: size }]}>IRONLOG</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        ui.primaryButton,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={ui.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const ui = StyleSheet.create({
  wordmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandBars: { color: colors.brand, fontWeight: "800" },
  wordmarkText: {
    color: colors.foreground,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: "700",
  },
});
