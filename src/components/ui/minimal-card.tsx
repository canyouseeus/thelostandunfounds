import * as React from "react";
import { cn } from "./utils";

interface MinimalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const MinimalCard = React.forwardRef<HTMLDivElement, MinimalCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "group relative overflow-hidden rounded-none",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MinimalCard.displayName = "MinimalCard";

interface MinimalCardImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

const MinimalCardImage = React.forwardRef<HTMLImageElement, MinimalCardImageProps>(
  ({ className, src, alt, ...props }, ref) => {
    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn(
          "w-full h-auto object-cover",
          className
        )}
        {...props}
      />
    );
  }
);
MinimalCardImage.displayName = "MinimalCardImage";

interface MinimalCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

const MinimalCardTitle = React.forwardRef<HTMLHeadingElement, MinimalCardTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          "text-base font-black text-white mb-2 tracking-wide",
          className
        )}
        {...props}
      >
        {children}
      </h3>
    );
  }
);
MinimalCardTitle.displayName = "MinimalCardTitle";

interface MinimalCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const MinimalCardDescription = React.forwardRef<HTMLParagraphElement, MinimalCardDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          "text-white/60 text-sm leading-relaxed",
          className
        )}
        {...props}
      >
        {children}
      </p>
    );
  }
);
MinimalCardDescription.displayName = "MinimalCardDescription";

export {
  MinimalCard,
  MinimalCardImage,
  MinimalCardTitle,
  MinimalCardDescription,
};

