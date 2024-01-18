import React from "react";

function useMediaQuery() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);
  const [isTablet, setIsTablet] = React.useState<boolean>(false);
  const [isDesktop, setIsDesktop] = React.useState<boolean>(false);

  React.useLayoutEffect(() => {
    let remove: (() => void) | null = null;

    const updateMediaScreen = () => {
      if (remove != null) {
        remove();
      }

      const mobileQuery = window.matchMedia("(max-width: 576px)");
      const tabletQuery = window.matchMedia(
        "(min-width: 576px) and (max-width: 1200px)"
      );
      const desktopQuery = window.matchMedia("(min-width: 1200px)");

      if (mobileQuery.matches) {
        setIsMobile(true);
        setIsTablet(false);
        setIsDesktop(false);
      } else if (tabletQuery.matches) {
        setIsMobile(false);
        setIsTablet(true);
        setIsDesktop(false);
      } else {
        setIsMobile(false);
        setIsTablet(false);
        setIsDesktop(true);
      }

      mobileQuery.addEventListener("change", updateMediaScreen);
      tabletQuery.addEventListener("change", updateMediaScreen);
      desktopQuery.addEventListener("change", updateMediaScreen);

      remove = () => {
        mobileQuery.removeEventListener("change", updateMediaScreen);
        tabletQuery.removeEventListener("change", updateMediaScreen);
        desktopQuery.removeEventListener("change", updateMediaScreen);
      };
    };

    updateMediaScreen();

    return () => {
      if (remove) {
        remove();
      }
    };
  }, []);

  return { isMobile, isTablet, isDesktop };
}

export { useMediaQuery };
