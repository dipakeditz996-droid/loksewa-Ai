import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag");
    const path = searchParams.get("path");

    if (!tag && !path) {
      // Revalidate default homepage, banners, and testimonials
      try { (revalidateTag as any)("testimonials", { expire: 0 }); } catch {}
      try { (revalidateTag as any)("public-reviews", { expire: 0 }); } catch {}
      try { (revalidateTag as any)("banners", { expire: 0 }); } catch {}
      try { (revalidateTag as any)("homepage-hero", { expire: 0 }); } catch {}
      try { revalidatePath("/", "page"); } catch {}
      return NextResponse.json({ revalidated: true, message: "Default paths and tags revalidated" });
    }

    if (tag) {
      try { (revalidateTag as any)(tag, { expire: 0 }); } catch {}
      if (tag === "testimonials") {
        try { (revalidateTag as any)("public-reviews", { expire: 0 }); } catch {}
      }
      if (tag === "banners") {
        try { (revalidateTag as any)("homepage-hero", { expire: 0 }); } catch {}
      }
    }
    if (path) {
      try { revalidatePath(path, "page"); } catch {}
    }

    return NextResponse.json({
      revalidated: true,
      tag: tag || null,
      path: path || null,
      now: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { revalidated: false, error: err?.message || "Failed to revalidate" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
