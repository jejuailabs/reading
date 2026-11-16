import Image from "next/image";

type BookArtworkProps = {
  variant?: "coast" | "forest" | "night" | "mail";
  className?: string;
  alt?: string;
};

type JourneyLandscapeProps = {
  className?: string;
  alt?: string;
};

// Intrinsic dimensions of the selected originals; CSS controls their display size.
const illustrationSizes = {
  coast: { width: 1122, height: 1402 },
  forest: { width: 1122, height: 1402 },
  night: { width: 1122, height: 1402 },
  mail: { width: 1536, height: 1024 },
  journey: { width: 1672, height: 941 },
};
const illustrationDirectory = "/illustrations/pencil-v2";

/** Prepared local artwork; rendering does not invoke an image-generation service. */
export function BookArtwork({ variant = "coast", className, alt = "" }: BookArtworkProps) {
  return (
    <Image
      src={`${illustrationDirectory}/${variant}.webp`}
      alt={alt}
      {...illustrationSizes[variant]}
      className={["scene-art", className].filter(Boolean).join(" ")}
      unoptimized
    />
  );
}

export function JourneyLandscape({ className, alt = "" }: JourneyLandscapeProps) {
  return (
    <Image
      src={`${illustrationDirectory}/journey.webp`}
      alt={alt}
      {...illustrationSizes.journey}
      className={["journey-art", className].filter(Boolean).join(" ")}
      loading="eager"
      unoptimized
    />
  );
}

export function CollectionArtwork({collection, className}: {collection: "korean" | "aesop"; className?: string}) {
  return <Image src={`/illustrations/classics-v1/${collection}.webp`} alt="" width={1254} height={1254}
    className={["scene-art", className].filter(Boolean).join(" ")} unoptimized/>;
}
