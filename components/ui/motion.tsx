"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";

const MotionNextLink = motion.create(Link);

const staggerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 25 },
  },
};

export function MotionButton(props: ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 260, damping: 25 }}
      {...props}
    />
  );
}

export function MotionLink(props: ComponentProps<typeof MotionNextLink>) {
  return (
    <MotionNextLink
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 260, damping: 25 }}
      {...props}
    />
  );
}

export function Reveal({ children, className, offset = 16 }: { children: ReactNode; className?: string; offset?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: offset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full min-w-0 ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGroup({ children, className, ...props }: ComponentProps<typeof motion.div>) {
  return (
    <motion.div variants={staggerVariants} initial="hidden" animate="visible" className={`w-full ${className ?? ""}`} {...props}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}