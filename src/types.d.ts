interface RadarTrailMaterialComponentProps {
  ref: React.Ref<MaterialRefState | null>;
  transparent: boolean;
  blending: THREE.Blending;
  depthWrite: boolean;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      radarTrailMaterial: React.Component<RadarTrailMaterialComponentProps>;
    }
  }
}
