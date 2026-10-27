"use client";
import { useRef, useEffect, useState, useContext } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

import AppContext from "@/app/_context/app-context";

import useViewTransitionSupport from "@/app/_hooks/use-view-transition-support";

import Image from "@/app/_components/image";
import RichText from "@/app/_components/rich-text";
import AccordionIcon from "@/app/_components/accordion-icon";

import { dateToYearString } from "@/lib/utils/format";

export default function Sidebar({
  id,
  image,
  name,
  client,
  date,
  tags,
  role,
  team,
  brief,
  highlights,
}) {
  const viewTransitionsSupported = useViewTransitionSupport();
  const [expandedSection, setExpandedSection] = useState("brief");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef(null);

  const imageRef = useRef(null);

  // Windows browsers flash a scrollbar on the sidebar while an accordion
  // section's height animates past the viewport bound; hide overflow for
  // the duration of the animation to suppress that flash.
  const handleExpand = (section) => {
    setExpandedSection(section);
    setIsTransitioning(true);
    clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 400);
  };

  const { isAnimating, setTargetPosition, currentProject } =
    useContext(AppContext);

  const viewTransitionName =
    currentProject && currentProject.startsWith(`image-${id}-`)
      ? currentProject
      : `image-${id}`;

  useEffect(() => {
    return () => clearTimeout(transitionTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      setTargetPosition({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
  }, [setTargetPosition]);

  return (
    <div
      className={clsx(
        "lg:sticky lg:w-[393px] lg:top-0 lg:pb-[60px] lg:border-r-[1px] lg:border-black",
        isTransitioning ? "lg:overflow-y-hidden" : "lg:overflow-y-auto",
      )}
    >
      <div className="p-5 flex flex-col space-y-2.5 border-b-[1px] border-black">
        <div
          // style={viewTransitionsSupported ? {
          //     viewTransitionName: `image-${id}`
          // }:{
          //     visibility: isAnimating ? 'hidden' : 'visible'
          // }}
          style={{
            viewTransitionName,
            ...(!viewTransitionsSupported && {
              visibility: isAnimating ? "hidden" : "visible",
            }),
          }}
        >
          <Image
            ref={imageRef}
            ratio={4 / 3}
            imageUrl={image.url}
            width={image.width}
            height={image.height}
            alt={image.description}
          />

          <div className="flex flex-col mt-2">
            <h1 className="font-display text-[32px]">{name}</h1>
            <h2 className="font-display text-sm tracking-widest mt-[3px]">
              <span>{client.toUpperCase()}</span>
              <span className="px-1">|</span>
              <span>{dateToYearString(new Date(date))}</span>
            </h2>
            <p className="font-display font-semibold text-[12px] leading-none text-gray-500 tracking-wider mt-2.5">
              {tags}
            </p>
          </div>
        </div>
      </div>
      <div
        onClick={() => handleExpand("brief")}
        className={`p-5 border-b-[1px] border-black ${expandedSection !== "brief" && "cursor-pointer"}`}
      >
        <motion.div
          animate={{
            height: expandedSection === "brief" ? "fit-content" : 20,
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="overflow-y-hidden flex relative"
        >
          <div>
            <motion.div
              animate={{
                opacity: expandedSection === "brief" ? 1 : 0,
                transform:
                  expandedSection === "brief"
                    ? "translateY(0)"
                    : "translateY(-20px)",
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <RichText
                document={brief.json}
                classNames={{
                  paragraph: "text-left	text-sm font-light",
                  bold: "font-medium",
                }}
              />
            </motion.div>
            <motion.div
              animate={{
                opacity: expandedSection === "brief" ? 0 : 1,
                transform:
                  expandedSection === "brief"
                    ? "translateY(20px)"
                    : "translateY(0)",
              }}
              className="absolute top-0"
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <p className="text-sm font-medium">BRIEF</p>
            </motion.div>
          </div>
          <AnimatePresence>
            {expandedSection !== "brief" && (
              <motion.div
                key="brief"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute right-0 top-0 h-5 w-2.5 flex items-center justify-center"
              >
                <AccordionIcon isToggled={expandedSection === "brief"} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div
        onClick={() => handleExpand("highlights")}
        className={`p-5 border-b-[1px] border-black ${expandedSection !== "highlights" && "cursor-pointer"} `}
      >
        <motion.div
          animate={{
            //opacity: expandedSection === "highlights" ? 1 : 0,
            height: expandedSection === "highlights" ? "fit-content" : 20,
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="overflow-y-hidden flex relative"
        >
          <div>
            <motion.div
              animate={{
                opacity: expandedSection === "highlights" ? 1 : 0,
                transform:
                  expandedSection === "highlights"
                    ? "translateY(0)"
                    : "translateY(-20px)",
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <RichText
                document={highlights.json}
                classNames={{
                  paragraph: "text-left	text-sm font-light",
                  bold: "font-medium",
                }}
              />
            </motion.div>
            <motion.div
              animate={{
                opacity: expandedSection === "highlights" ? 0 : 1,
                transform:
                  expandedSection === "highlights"
                    ? "translateY(20px)"
                    : "translateY(0)",
              }}
              className="absolute top-0"
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <p className="text-sm font-medium">OUTCOME</p>
            </motion.div>
          </div>
          <AnimatePresence>
            {expandedSection !== "highlights" && (
              <motion.div
                key="highlights"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute right-0 top-0 h-5 w-2.5 flex items-center justify-center"
              >
                <AccordionIcon isToggled={expandedSection === "highlights"} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <div
        onClick={() => handleExpand("role")}
        className={`p-5 border-b-[1px] border-black lg:border-0 ${expandedSection !== "team" && "cursor-pointer"}`}
      >
        <motion.div
          animate={{
            height: expandedSection === "role" ? "fit-content" : 20,
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="overflow-y-hidden flex relative"
        >
          <div>
            <motion.div
              animate={{
                opacity: expandedSection === "role" ? 1 : 0,
                transform:
                  expandedSection === "role"
                    ? "translateY(0)"
                    : "translateY(-20px)",
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <RichText
                document={role.json}
                classNames={{
                  paragraph: "text-left	text-sm font-light",
                  bold: "font-medium",
                }}
              />
            </motion.div>
            <motion.div
              animate={{
                opacity: expandedSection === "role" ? 0 : 1,
                transform:
                  expandedSection === "role"
                    ? "translateY(20px)"
                    : "translateY(0)",
              }}
              className="absolute top-0"
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <p className="text-sm font-medium">ROLE & TEAM</p>
            </motion.div>
          </div>
          <AnimatePresence>
            {expandedSection !== "role" && (
              <motion.div
                key="team"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute right-0 top-0 h-5 w-2.5 flex items-center justify-center"
              >
                <AccordionIcon isToggled={expandedSection === "role"} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
