import { useState, useEffect } from "react";
import { debounce } from "../util";

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({ width: null, height: null });

  useEffect(() => {
    // Add event listener
    window.addEventListener("resize", debounce(handleResize, 100));

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleResize = () => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }

  return windowSize;
};

export default useWindowSize;
