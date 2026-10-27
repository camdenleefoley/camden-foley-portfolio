"use client";

import { useContext, useState } from "react";

import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { motion, cubicBezier, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

import AppContext from "@/app/_context/app-context";

import useViewTransitionSupport from "@/app/_hooks/use-view-transition-support";

const variants = {
  closed: (position) => {
    const originPosition = position[0];
    return {
      position: "fixed",
      opacity: 1,
      width: originPosition.width,
      height: originPosition.height,
      zIndex: 100,
    };
  },
  open: (position) => {
    const originPosition = position[0];
    const targetPosition = position[1];

    return {
      position: "fixed",
      x: targetPosition.x - originPosition.x,
      y: targetPosition.y - originPosition.y,
      width: targetPosition.width,
      height: targetPosition.height,
      zIndex: 100,
    };
  },
};

// Prevents instant page opening
const FrozenRouter = (props) => {
  const context = useContext(LayoutRouterContext ?? {});
  const [frozen] = useState(context);
  return (
    <LayoutRouterContext.Provider value={frozen}>
      {props.children}
    </LayoutRouterContext.Provider>
  );
};

export default function Template({ children }) {
  let pathname = usePathname();

  const {
    clonedElement,
    originPosition,
    targetPosition,
    setOriginPosition,
    setTargetPosition,
    isAnimating,
    setIsAnimating,
    clearClonedElement,
  } = useContext(AppContext);

  const viewTransitionsSupported = useViewTransitionSupport();
  if (typeof viewTransitionsSupported === "undefined") {
    return children;
  }

  if (viewTransitionsSupported) {
    return children;
  }

  return (
    <>
      {clonedElement && originPosition && targetPosition && (
        <motion.div
          animate={pathname.includes("/projects") ? "open" : "closed"}
          variants={variants}
          custom={[originPosition, targetPosition]}
          transition={{
            ease: cubicBezier(0.65, 0, 0.35, 1),
            duration: 0.8,
          }}
          style={{
            position: "fixed",
            left: originPosition.x,
            top: originPosition.y,
            width: originPosition.width,
            height: originPosition.height,
            zIndex: 100,
            opacity: 0.55,
            visibility: isAnimating ? "visible" : "hidden",
            //zIndex: isAnimating ? 100 : -1
          }}
          //className="bg-blue-300"
          onAnimationStart={() => {
            if (!isAnimating) {
              setIsAnimating(true);
            }
          }}
          onAnimationComplete={() => {
            setIsAnimating(false);
            if (pathname === "/info") {
              setOriginPosition(null);
              setTargetPosition(null);
              clearClonedElement();
            }
            if (pathname === "/" || pathname.includes("/collections")) {
              clearClonedElement();
            }
          }}
        >
          {clonedElement}
        </motion.div>
      )}
      <AnimatePresence initial={false} mode="popLayout">
        <motion.main
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: [0.27, 0.94, 0.48, 1.0] }}
          className="lg:h-[calc(100%-60px)]"
        >
          <FrozenRouter> {children} </FrozenRouter>
        </motion.main>
      </AnimatePresence>
    </>
  );
}
