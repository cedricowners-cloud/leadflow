import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PaginationProps extends React.ComponentProps<"nav"> {
  className?: string;
}

function Pagination({ className, ...props }: PaginationProps) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}
Pagination.displayName = "Pagination";

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}
PaginationContent.displayName = "PaginationContent";

function PaginationItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("", className)} {...props} />;
}
PaginationItem.displayName = "PaginationItem";

interface PaginationLinkProps extends React.ComponentProps<"button"> {
  isActive?: boolean;
}

function PaginationLink({
  className,
  isActive,
  children,
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      aria-current={isActive ? "page" : undefined}
      variant={isActive ? "outline" : "ghost"}
      size="icon"
      className={cn(
        "h-9 w-9",
        isActive && "border-primary bg-primary/10",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
PaginationLink.displayName = "PaginationLink";

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <Button
      aria-label="Go to previous page"
      variant="ghost"
      size="sm"
      className={cn("gap-1 pl-2.5", className)}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>이전</span>
    </Button>
  );
}
PaginationPrevious.displayName = "PaginationPrevious";

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <Button
      aria-label="Go to next page"
      variant="ghost"
      size="sm"
      className={cn("gap-1 pr-2.5", className)}
      {...props}
    >
      <span>다음</span>
      <ChevronRight className="h-4 w-4" />
    </Button>
  );
}
PaginationNext.displayName = "PaginationNext";

function PaginationFirst({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <Button
      aria-label="Go to first page"
      variant="ghost"
      size="icon"
      className={cn("", className)}
      {...props}
    >
      <ChevronsLeft className="h-4 w-4" />
    </Button>
  );
}
PaginationFirst.displayName = "PaginationFirst";

function PaginationLast({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <Button
      aria-label="Go to last page"
      variant="ghost"
      size="icon"
      className={cn("", className)}
      {...props}
    >
      <ChevronsRight className="h-4 w-4" />
    </Button>
  );
}
PaginationLast.displayName = "PaginationLast";

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn("flex h-9 w-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationFirst,
  PaginationLast,
};
