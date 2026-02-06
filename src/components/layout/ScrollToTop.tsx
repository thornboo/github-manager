import { useState, useEffect, useCallback, RefObject } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollToTopProps {
  scrollContainerRef?: RefObject<HTMLElement>;
  threshold?: number;
}

export function ScrollToTop({
  scrollContainerRef,
  threshold = 400,
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef?.current || window;

    const handleScroll = () => {
      const scrollTop = scrollContainerRef?.current
        ? scrollContainerRef.current.scrollTop
        : window.scrollY;
      setIsVisible(scrollTop > threshold);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef, threshold]);

  const scrollToTop = useCallback(() => {
    const container = scrollContainerRef?.current || window;
    container.scrollTo({ top: 0, behavior: "smooth" });
  }, [scrollContainerRef]);

  return (
    <Button
      variant="secondary"
      size="icon"
      className={cn(
        "fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full shadow-lg transition-all duration-300",
        "hover:shadow-xl hover:scale-110",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none",
      )}
      onClick={scrollToTop}
      aria-label="回到顶部"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}
