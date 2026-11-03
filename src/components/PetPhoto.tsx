// NT-12 (My Pets test plan F7) · a pet's photo, or the paw placeholder when it has none OR the file won't load.
//
// An adopted pet keeps its previous owner's photos (PP5), so when that owner's file is gone the URL 404s.
// A bare `<Image>` then shows only its background: a blank tile that reads as broken. The failure is
// remembered per URL, so a replaced photo gets its own chance to load.
import { useState } from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { AdoptIcon } from "./AppIcons";

type Props = {
  uri: string | null | undefined;
  style: StyleProp<ImageStyle>;
  iconColor: string;
  iconSize: number;
  accessibilityLabel?: string;
};

export function PetPhoto({ uri, style, iconColor, iconSize, accessibilityLabel }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!uri || failed === uri) {
    return (
      <View style={[style as StyleProp<ViewStyle>, styles.placeholder]} testID="petPhoto.placeholder">
        <AdoptIcon color={iconColor} size={iconSize} />
      </View>
    );
  }
  return (
    <Image source={{ uri }} style={style} resizeMode="cover" accessibilityLabel={accessibilityLabel}
      onError={() => setFailed(uri)} />
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: "center", justifyContent: "center" },
});
