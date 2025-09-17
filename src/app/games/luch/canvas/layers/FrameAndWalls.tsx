// luch/canvas/layers/FrameAndWalls.tsx
"use client";

import React from "react";
import { SegmentObj } from "../../engine/types";
import { Walls } from "../render/Walls";

function FrameAndWallsBase({ frameWalls, innerWalls }: { frameWalls: SegmentObj[]; innerWalls: SegmentObj[] }) {
  return <Walls frameWalls={frameWalls} innerWalls={innerWalls} />;
}

const FrameAndWalls = React.memo(FrameAndWallsBase);
export default FrameAndWalls;
