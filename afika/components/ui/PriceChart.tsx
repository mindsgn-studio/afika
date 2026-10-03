import { useMemo, useRef, useState } from "react";
import { View, Text, PanResponder, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, { Path, Line, Circle } from "react-native-svg";
import { colors, fonts } from "@/theme";

type Props = {
  data: number[];
  height?: number;
};

const AXIS_W = 48;

export default function PriceChart({ data, height = 190 }: Props) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(Math.max(0, data.length - 1));
  const widthRef = useRef(0);
  const safe = data.length > 1 ? data : [0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const span = max - min || 1;
  const yLabels = [max, min + span * 0.66, min + span * 0.33, min].map((v) => Math.round(v));

  const pts = useMemo(
    () =>
      safe.map((v, i) => ({
        x: (i / (safe.length - 1)) * width,
        y: ((max - v) / span) * height,
      })),
    [safe, width, height, min, max, span]
  );

  const path = useMemo(() => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1].x + pts[i].x) / 2;
      const my = (pts[i - 1].y + pts[i].y) / 2;
      d += ` Q ${pts[i - 1].x} ${pts[i - 1].y} ${mx} ${my}`;
    }
    d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return d;
  }, [pts]);

  const scrub = (x: number) => {
    const w = widthRef.current || 1;
    const i = Math.round((Math.min(Math.max(x, 0), w) / w) * (safe.length - 1));
    setActive(i);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => scrub(e.nativeEvent.locationX),
      onPanResponderMove: (e) => scrub(e.nativeEvent.locationX),
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width - AXIS_W;
    widthRef.current = w;
    setWidth(w);
  };

  const cur = pts[active] ?? pts[pts.length - 1];

  return (
    <View onLayout={onLayout} testID="price-chart">
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: Math.max(width, 0), height }} {...pan.panHandlers}>
          {width > 0 && cur ? (
            <>
              <Svg width={width} height={height}>
                {yLabels.map((v) => {
                  const y = ((max - v) / span) * height;
                  return <Line key={v} x1={0} x2={width} y1={y} y2={y} stroke={colors.line} strokeWidth={1} />;
                })}
                <Line x1={0} x2={width} y1={cur.y} y2={cur.y} stroke="#C9CBD0" strokeDasharray="3 3" />
                <Line x1={cur.x} x2={cur.x} y1={0} y2={height} stroke="#C9CBD0" strokeDasharray="3 3" />
                <Path d={path} stroke={colors.limeLine} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx={cur.x} cy={cur.y} r={6} fill={colors.paper} stroke={colors.ink} strokeWidth={2} />
              </Svg>
              <View
                pointerEvents="none"
                style={[
                  styles.tip,
                  { left: Math.min(Math.max(cur.x - 26, 0), width - 56), top: Math.min(cur.y + 14, height - 30) },
                ]}
              >
                <Text style={styles.tipText}>${Math.round(safe[active] ?? 0).toLocaleString("en-US")}</Text>
              </View>
            </>
          ) : null}
        </View>
        <View style={{ width: AXIS_W, height }}>
          {yLabels.map((v) => {
            const y = ((max - v) / span) * height;
            return (
              <Text key={v} style={[styles.yLabel, { top: y - 8 }]}>
                ${v.toLocaleString("en-US")}
              </Text>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tip: {
    position: "absolute",
    backgroundColor: colors.paper,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  tipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink },
  yLabel: { position: "absolute", right: 0, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});
