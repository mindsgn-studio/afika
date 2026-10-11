import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Feather } from "@expo/vector-icons";
import { colors } from "@/theme";
import { VectorIcon } from "expo-router";

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          selectedColor={colors.ink}
          src={<VectorIcon family={Feather} name="home" />}
        />
      </NativeTabs.Trigger>
      {
        /*
        <NativeTabs.Trigger name="portfollio">
          <NativeTabs.Trigger.Label>Portfolio</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            selectedColor={colors.ink}
            src={<VectorIcon family={Feather} name="pie-chart" />}
          />
        </NativeTabs.Trigger>
        */
      }

      <NativeTabs.Trigger name="markets">
        <NativeTabs.Trigger.Label>Markets</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon selectedColor={colors.ink} src={<VectorIcon family={Feather} name="trending-up" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          selectedColor={colors.ink}
          src={<VectorIcon family={Feather} name="user" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
