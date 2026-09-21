import { Composition } from "remotion";
import { AutocompleteDemo } from "./compositions/AutocompleteDemo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="AutocompleteDemo"
      component={AutocompleteDemo}
      durationInFrames={150}
      fps={30}
      width={1280}
      height={720}
    />
  );
};
