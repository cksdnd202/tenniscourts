import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const romanMap: Array<[RegExp, string]> = [
  [/물재생/g, "muljaesaeng"],
  [/테니스장/g, "tennis-court"],
  [/테니스/g, "tennis"],
  [/공원/g, "park"],
  [/센터/g, "center"],
  [/구장/g, "court"],
  [/경기장/g, "stadium"],
  [/실내/g, "indoor"],
  [/실외/g, "outdoor"],
  [/야외/g, "outdoor"],
  [/평일/g, "weekday"],
  [/주말/g, "weekend"],
  [/공휴일/g, "holiday"],
  [/인조잔디/g, "artificial-grass"],
  [/잔디/g, "grass"],
  [/클레이/g, "clay"],
  [/하드/g, "hard"],
];

const choseong = [
  "g",
  "kk",
  "n",
  "d",
  "tt",
  "r",
  "m",
  "b",
  "pp",
  "s",
  "ss",
  "",
  "j",
  "jj",
  "ch",
  "k",
  "t",
  "p",
  "h",
];

const jungseong = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
];

const jongseong = [
  "",
  "k",
  "k",
  "ks",
  "n",
  "nj",
  "nh",
  "t",
  "l",
  "lk",
  "lm",
  "lb",
  "ls",
  "lt",
  "lp",
  "lh",
  "m",
  "p",
  "ps",
  "t",
  "t",
  "ng",
  "t",
  "t",
  "k",
  "t",
  "p",
  "t",
];

function isLocalhost(req: NextRequest) {
  return ["localhost", "127.0.0.1", "::1"].includes(req.nextUrl.hostname);
}

function fallbackHash(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

function romanizeHangul(value: string) {
  return Array.from(value)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code < 0xac00 || code > 0xd7a3) {
        return char;
      }

      const syllableIndex = code - 0xac00;
      const initialIndex = Math.floor(syllableIndex / 588);
      const vowelIndex = Math.floor((syllableIndex % 588) / 28);
      const finalIndex = syllableIndex % 28;

      return `${choseong[initialIndex]}${jungseong[vowelIndex]}${jongseong[finalIndex]}`;
    })
    .join("");
}

function toSlugBase(name: string) {
  let value = name
    .trim()
    .toLowerCase()
    .replace(/[()[\]]/g, " ");

  for (const [pattern, replacement] of romanMap) {
    value = value.replace(pattern, ` ${replacement} `);
  }

  value = romanizeHangul(value);

  value = value
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return value || `court-${fallbackHash(name)}`;
}

async function slugExists(slug: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("courtinfo")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.length);
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" || !isLocalhost(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "테니스장명이 필요합니다." }, { status: 400 });
  }

  try {
    const base = toSlugBase(name);
    let slug = base;
    let suffix = 2;

    while (await slugExists(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }

    return NextResponse.json({ slug });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "slug 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
