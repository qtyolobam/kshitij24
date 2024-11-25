import React from "react";
import "ldrs/trefoil";

function DialogLoading() {
  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center z-[10000]">
      <l-trefoil
        size="40"
        stroke="4"
        stroke-length="0.15"
        bg-opacity="0.1"
        speed="1.4"
        color="white"
      ></l-trefoil>
    </div>
  );
}

export default DialogLoading;
