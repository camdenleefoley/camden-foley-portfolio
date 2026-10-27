"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import Slider from "react-slick";
import ProjectMedia from "@/app/_components/project-media";

const GRID_GAP = 10; // matches gap-2.5

const SPRING_TRANSITION = { type: "spring", stiffness: 300, damping: 30 };
const SIBLING_FADE = { duration: 0.3, ease: "easeInOut" };

function getCellRect(containerRect, index) {
  const cellSize = (containerRect.width - GRID_GAP) / 2;
  const col = index % 2;
  const row = Math.floor(index / 2);
  return {
    x: containerRect.x + col * (cellSize + GRID_GAP),
    y: containerRect.y + row * (cellSize + GRID_GAP),
    width: cellSize,
    height: cellSize,
  };
}

const TAP_MOVE_THRESHOLD = 10; // px of travel below which a pointer gesture is a tap
const TAP_TIME_THRESHOLD = 300; // ms

const ExpandableImageGrid = ({
  images,
  expanded,
  activeIndex,
  onImageSelect,
  onSlideChange,
  onCollapse,
}) => {
  const containerRef = useRef(null);
  const pointerStartRef = useRef(null);
  const wasExpandedRef = useRef(expanded);
  const [transition, setTransition] = useState(null);
  const [showSlider, setShowSlider] = useState(expanded);

  useLayoutEffect(() => {
    const wasExpanded = wasExpandedRef.current;
    wasExpandedRef.current = expanded;
    if (wasExpanded === expanded) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const cellRect = getCellRect(containerRect, activeIndex);

    // getBoundingClientRect() only reflects the just-committed grid/slider
    // layout after paint, so this can't be derived during render.
    setShowSlider(false);
    setTransition({
      image: images[activeIndex],
      from: expanded ? cellRect : containerRect,
      to: expanded ? containerRect : cellRect,
      direction: expanded ? "expanding" : "collapsing",
    });
  }, [expanded, activeIndex, images]);

  const handleTransitionComplete = () => {
    setTransition(null);
    setShowSlider(expanded);
  };

  // Separate a tap (collapse) from a swipe (navigate): react-slick handles the
  // drag-to-navigate, and we only treat a near-stationary, quick press as a tap.
  const handleSlidePointerDown = (event) => {
    const point = event.touches?.[0] ?? event;
    pointerStartRef.current = {
      x: point.clientX,
      y: point.clientY,
      time: Date.now(),
    };
  };

  const handleSlidePointerUp = (event) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) {
      return;
    }
    const point = event.changedTouches?.[0] ?? event;
    const movedX = Math.abs(point.clientX - start.x);
    const movedY = Math.abs(point.clientY - start.y);
    const elapsed = Date.now() - start.time;
    if (
      movedX < TAP_MOVE_THRESHOLD &&
      movedY < TAP_MOVE_THRESHOLD &&
      elapsed < TAP_TIME_THRESHOLD
    ) {
      onCollapse?.();
    }
  };

  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    swipeToSlide: true,
    initialSlide: activeIndex,
    // Fire on transition start (not afterChange) so the caption swaps/slides in
    // step with the image movement instead of lagging until the slide settles.
    beforeChange: (currentSlide, nextSlide) => {
      const count = images.length;
      const forward = (nextSlide - currentSlide + count) % count;
      const backward = (currentSlide - nextSlide + count) % count;
      const direction = forward <= backward ? 1 : -1;
      onSlideChange?.(nextSlide, direction);
    },
  };

  return (
    <div className="relative">
      <div className="px-5">
        <div ref={containerRef}>
          {!showSlider ? (
            <div className="grid grid-cols-2 gap-2.5 grid-rows-2">
              {images.map((image, index) => {
                const isActive = index === activeIndex;
                const hidden =
                  (isActive && transition) ||
                  (!isActive && transition?.direction === "expanding");
                const initialHidden = isActive
                  ? Boolean(transition)
                  : transition?.direction === "collapsing";

                return (
                  <motion.button
                    key={image.sys.id}
                    onClick={() => onImageSelect(index)}
                    className="relative w-full h-full"
                    initial={{ opacity: initialHidden ? 0 : 1 }}
                    animate={{ opacity: hidden ? 0 : 1 }}
                    transition={isActive ? { duration: 0 } : SIBLING_FADE}
                  >
                    <ProjectMedia
                      src={image.url}
                      contentType={image.contentType}
                      height={image.height}
                      width={image.width * 2}
                      alt={image.description || ""}
                      priority={isActive}
                      controls={false}
                    />
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <Slider {...settings} className="-mx-5">
              {images.map((image, index) => (
                <div
                  key={image.sys.id}
                  className="px-5"
                  onMouseDown={handleSlidePointerDown}
                  onMouseUp={handleSlidePointerUp}
                  onTouchStart={handleSlidePointerDown}
                  onTouchEnd={handleSlidePointerUp}
                >
                  <div
                    style={{
                      width: "100%",
                      position: "relative",
                      paddingTop: "100%",
                    }}
                  >
                    <ProjectMedia
                      src={image.url}
                      contentType={image.contentType}
                      alt={image.description || ""}
                      style={{
                        width: "100%",
                        height: "100%",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        objectFit: "cover",
                      }}
                      width={image.width}
                      height={image.height}
                      priority={index === activeIndex}
                    />
                  </div>
                </div>
              ))}
            </Slider>
          )}
        </div>
      </div>

      {transition &&
        typeof document !== "undefined" &&
        createPortal(
          <motion.div
            initial={{
              left: transition.from.x,
              top: transition.from.y,
              width: transition.from.width,
              height: transition.from.height,
            }}
            animate={{
              left: transition.to.x,
              top: transition.to.y,
              width: transition.to.width,
              height: transition.to.height,
            }}
            transition={SPRING_TRANSITION}
            onAnimationComplete={handleTransitionComplete}
            style={{ position: "fixed", zIndex: 15, overflow: "hidden" }}
          >
            {transition.direction === "expanding" ? (
              <ProjectMedia
                src={transition.image.url}
                contentType={transition.image.contentType}
                alt={transition.image.description || ""}
                style={{
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  objectFit: "cover",
                }}
                width={transition.image.width}
                height={transition.image.height}
                priority
                controls={false}
              />
            ) : (
              <ProjectMedia
                src={transition.image.url}
                contentType={transition.image.contentType}
                height={transition.image.height}
                width={transition.image.width * 2}
                alt={transition.image.description || ""}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                priority
                controls={false}
              />
            )}
          </motion.div>,
          document.body,
        )}
    </div>
  );
};

export default ExpandableImageGrid;
