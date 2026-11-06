// V5 · the picture on a badge's medal. The catalog seeds each badge with an `icon` name (`ti-paw` and so on, Tabler's names); each is a white
// PNG mask in assets/glyphs (rasterised from Tabler Icons, MIT: see LICENSE-tabler.txt there) that the medal tints. A name nothing here knows,
// a new catalog row ahead of the app, shows the star rather than nothing.
import { ImageSourcePropType } from "react-native";

const GLYPHS: Record<string, ImageSourcePropType> = {
  "ti-paw": require("../assets/glyphs/paw.png"),
  "ti-walk": require("../assets/glyphs/walk.png"),
  "ti-shoe": require("../assets/glyphs/shoe.png"),
  "ti-heart-handshake": require("../assets/glyphs/heart-handshake.png"),
  "ti-home-heart": require("../assets/glyphs/home-heart.png"),
  "ti-award": require("../assets/glyphs/award.png"),
  "ti-star": require("../assets/glyphs/star.png")
};

export const BADGE_GLYPH_NAMES = Object.keys(GLYPHS);

export function badgeGlyph(icon: string | null | undefined): ImageSourcePropType {
  return GLYPHS[(icon ?? "").trim()] ?? GLYPHS["ti-star"];
}
