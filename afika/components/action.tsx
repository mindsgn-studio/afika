import { Dimensions, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/shared/button";
import Animated from "react-native-reanimated";

export default function ActionCard() {
  const router = useRouter();
  return (
    <Animated.View>
      <View style={styles.container} testID="action-container">
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Button
            label="SEND"
            color="white"
            onPress={() => {
              router.navigate("/send");
            }}
          />

          <Button
            label="RECEIVE"
            backgroundColor="none"
            color="#1f1f1f"
            onPress={() => {
              router.navigate("/recieve");
            }}
          />
        </View>
        {/*

          <Button
            label="TOP UP"
            color="white"
            width={Dimensions.get("screen").width - 30}
            onPress={() => {
              router.navigate("/top-up");
            }}
          />
          */}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    marginTop: 20,
  },
  button: {
    borderRadius: 20,
    backgroundColor: "#161B27",
    padding: 20,
    gap: 6,
    width: 150,
    borderWidth: 1,
    // borderColor: '#2A3143',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#F1F5F9",
    letterSpacing: -0.5,
    marginHorizontal: 10,
  },
});
