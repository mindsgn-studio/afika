import { colors } from "@/constants";
import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="house.fill"
          selectedColor={colors.primary}
        />
      </NativeTabs.Trigger>
      {
      /*
      <NativeTabs.Trigger name="portfollio">
        <NativeTabs.Trigger.Label>Portfolio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="chart.pie.fill"
          selectedColor={colors.primary}
        />
      </NativeTabs.Trigger>
      */
      }

      <NativeTabs.Trigger name="markets">
        <NativeTabs.Trigger.Label>Markets</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="chart.line.uptrend.xyaxis"
          selectedColor={colors.primary}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="person.fill"
          selectedColor={colors.primary}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
