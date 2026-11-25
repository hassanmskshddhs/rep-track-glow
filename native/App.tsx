import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

// FORGED dark theme, same tokens as the web app (src/styles.css)
const colors = {
  background: "#101411",
  foreground: "#f0f2e9",
  card: "#1b231e",
  primary: "#c8f2cb",
  primaryForeground: "#101411",
  mutedForeground: "#a5b2a8",
  border: "#303b33",
  input: "#3a493e",
  brand: "#ff8459",
};

function RiseIn({
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

function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <View style={styles.wordmark}>
      <Text style={[styles.brandBars, { fontSize: size + 2 }]}>Ⅱ</Text>
      <Text style={[styles.wordmarkText, { fontSize: size }]}>IRONLOG</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.welcomeBody}>
        <RiseIn>
          <Wordmark size={26} />
        </RiseIn>
        <RiseIn delay={120} style={{ marginTop: 48 }}>
          <Text style={styles.heroTitle}>Your next{"\n"}rep.</Text>
        </RiseIn>
        <RiseIn delay={220} style={{ marginTop: 14 }}>
          <Text style={styles.heroSub}>
            Track every lift. Crush every PR. Built for the gym floor, not the
            desk.
          </Text>
        </RiseIn>
      </View>
      <RiseIn delay={340} style={styles.footer}>
        <PrimaryButton label="Get started" onPress={onStart} />
      </RiseIn>
    </SafeAreaView>
  );
}

function SignInScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.authBody}>
          <RiseIn>
            <Wordmark size={18} />
          </RiseIn>
          <RiseIn delay={100} style={{ marginTop: 36 }}>
            <Text style={styles.authTitle}>Welcome back</Text>
            <Text style={styles.authSub}>Sign in to continue logging.</Text>
          </RiseIn>
          <RiseIn delay={200} style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colors.mutedForeground}
              style={styles.input}
            />
            <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={colors.mutedForeground}
              style={styles.input}
            />
            <View style={{ marginTop: 24 }}>
              <PrimaryButton label="Sign in" onPress={() => {}} />
            </View>
            <Pressable onPress={() => {}} style={{ marginTop: 16 }}>
              <Text style={styles.switchMode}>
                No account? <Text style={styles.switchModeStrong}>Sign up</Text>
              </Text>
            </Pressable>
          </RiseIn>
        </View>
        <Pressable onPress={onBack} style={styles.backLink}>
          <Text style={styles.switchMode}>Back</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function App() {
  const [screen, setScreen] = useState<"welcome" | "signin">("welcome");
  return (
    <View style={styles.flex}>
      <StatusBar style="light" />
      {screen === "welcome" ? (
        <WelcomeScreen onStart={() => setScreen("signin")} />
      ) : (
        <SignInScreen onBack={() => setScreen("welcome")} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  wordmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandBars: { color: colors.brand, fontWeight: "800" },
  wordmarkText: {
    color: colors.foreground,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  welcomeBody: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  heroTitle: {
    color: colors.foreground,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 48,
  },
  heroSub: {
    color: colors.mutedForeground,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
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
  authBody: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  authTitle: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  authSub: { color: colors.mutedForeground, fontSize: 14, marginTop: 4 },
  card: {
    marginTop: 24,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  label: { color: colors.foreground, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.input,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.foreground,
    fontSize: 15,
  },
  switchMode: {
    color: colors.mutedForeground,
    fontSize: 14,
    textAlign: "center",
  },
  switchModeStrong: { color: colors.primary, fontWeight: "700" },
  backLink: { paddingVertical: 16, alignItems: "center" },
});
