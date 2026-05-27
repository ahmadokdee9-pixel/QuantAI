import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "main";
};

/** Centered 1440px beta shell */
export default function BetaShell({ children, className = "", as: Tag = "div" }: Props) {
  return <Tag className={`qbeta-shell ${className}`.trim()}>{children}</Tag>;
}
