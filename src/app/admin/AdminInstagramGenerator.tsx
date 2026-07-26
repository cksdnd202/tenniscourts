"use client";

import { useMemo, useState } from "react";
import type { Court } from "../types";
import { supabase } from "@/lib/supabase";
import {
  getNextNormalBookingOpen,
  getNextOwnerBookingOpen,
  getPriorityBookingLabel,
} from "@/lib/nextBookingOpen";

type InstagramSlide = {
  title: string;
  svg: string;
  fileName: string;
  kind: "cover" | "court" | "cta";
  courtId?: string;
};

type CoverPhoto = {
  dataUrl: string;
  sourceUrl: string;
  title?: string | null;
};

type CourtSlideEdit = {
  courtName: string;
  audience: string;
  label: string;
  text: string;
  photo?: CoverPhoto | null;
};

type CoverSlideEdit = {
  title: string;
};

const WIDTH = 1080;
const HEIGHT = 1350;

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cleanName(name: string | null) {
  return (name ?? "이름 없는 테니스장").replace(/\s+/g, " ").trim();
}

function slugifyFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function wrapText(value: string, maxLength: number, maxLines = 2) {
  const text = value.trim();
  if (text.length <= maxLength) return [text];

  const lines: string[] = [];
  let remaining = text;

  while (remaining.length > 0 && lines.length < maxLines) {
    if (remaining.length <= maxLength) {
      lines.push(remaining);
      break;
    }

    let cutIndex = remaining.lastIndexOf(" ", maxLength);
    if (cutIndex < maxLength * 0.55) cutIndex = maxLength;
    lines.push(remaining.slice(0, cutIndex).trim());
    remaining = remaining.slice(cutIndex).trim();
  }

  if (remaining.length > 0 && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/…$/, "")}…`;
  }

  return lines;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function textBlock(lines: string[], x: number, y: number, options: { size: number; color: string; weight?: number; gap?: number }) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * (options.gap ?? options.size * 1.35)}" fill="${options.color}" font-size="${options.size}" font-weight="${options.weight ?? 600}" font-family="SB AggroOTF, Pretendard, Apple SD Gothic Neo, Arial, sans-serif">${escapeXml(line)}</text>`
    )
    .join("");
}

function formatCourtCount(courts: Court[]) {
  const hard = courts.reduce(
    (sum, court) => sum + (court.court_count_hard_indoor ?? 0) + (court.court_count_hard_outdoor ?? 0),
    0
  );
  const grass = courts.reduce(
    (sum, court) => sum + (court.court_count_grass_indoor ?? 0) + (court.court_count_grass_outdoor ?? 0),
    0
  );
  const clay = courts.reduce(
    (sum, court) => sum + (court.court_count_clay_indoor ?? 0) + (court.court_count_clay_outdoor ?? 0),
    0
  );

  return { hard, grass, clay, total: hard + grass + clay };
}

function getOwnerLabel(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  if (!normalized || normalized.toUpperCase() === "NULL") return "";
  if (normalized === "public_city") return "시립";
  if (normalized === "public_district") return "구립";
  if (normalized === "private") return "사설";
  return normalized;
}

function getDominantOwnerLabel(courts: Court[]) {
  const counts = new Map<string, number>();

  for (const court of courts) {
    const ownerLabel = getOwnerLabel(court.basic_owner_type);
    if (!ownerLabel) continue;
    counts.set(ownerLabel, (counts.get(ownerLabel) ?? 0) + 1);
  }

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function getBookingLines(court: Court) {
  const priorityLabel = getPriorityBookingLabel(court);
  const priority = getNextOwnerBookingOpen(court);
  const normal = getNextNormalBookingOpen(court);
  const lines: Array<{ label: string; text: string; color: string }> = [];

  if (priorityLabel && priority) {
    lines.push({
      label: priorityLabel,
      text: `${priority.dateLabel} ${priority.timeLabel}`,
      color: priorityLabel === "시민" ? "#6FCF97" : "#FF884D",
    });
  }

  if (normal) {
    lines.push({
      label: "일반",
      text: `${normal.dateLabel} ${normal.timeLabel}`,
      color: "#4DA3FF",
    });
  }

  if (lines.length === 0 && court.booking_lottery_desc) {
    lines.push({ label: "추첨", text: court.booking_lottery_desc, color: "#6FCF97" });
  }

  if (lines.length === 0) {
    lines.push({ label: "예약", text: "상세페이지에서 확인", color: "#6FCF97" });
  }

  return lines.slice(0, 2);
}

function formatKoreanTime(value: string | null | undefined) {
  const [hourPart, minutePart] = (value ?? "").split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";

  const meridiem = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 || 12;
  return `${meridiem} ${hour12}:${String(minute).padStart(2, "0")}`;
}

function getCourtBookingSummary(court: Court) {
  const priorityLabel = getPriorityBookingLabel(court);

  if (priorityLabel && court.booking_open_day_owner && court.booking_open_time_owner) {
    const region = court.basic_region ?? "";
    const city = court.basic_city ?? "";
    const audience =
      priorityLabel === "구민"
        ? `${region} ${city}민`
        : priorityLabel === "시민"
          ? `${region} 시민`
          : priorityLabel === "주민"
            ? `${region} ${city} 주민`
            : priorityLabel;
    const offset = court.booking_open_offset || "다음달";

    return {
      audience: `${audience.replace(/\s+/g, " ").trim()} 우선 예약`,
      label: `${priorityLabel} 예약 오픈 시간`,
      text: `매월 ${court.booking_open_day_owner}일 ${formatKoreanTime(court.booking_open_time_owner)}, ${offset} 예약 오픈`,
    };
  }

  if (court.booking_open_day_normal && court.booking_open_time_normal) {
    const offset = court.booking_open_offset || "다음달";

    return {
      audience: "일반 예약",
      label: "일반 예약 오픈 시간",
      text: `매월 ${court.booking_open_day_normal}일 ${formatKoreanTime(court.booking_open_time_normal)}, ${offset} 예약 오픈`,
    };
  }

  if (court.booking_lottery_desc) {
    return {
      audience: "추첨 예약",
      label: "추첨 방식",
      text: court.booking_lottery_desc,
    };
  }

  return {
    audience: "예약 정보",
    label: "예약 오픈 시간",
    text: "상세페이지에서 확인",
  };
}

function slideShell(content: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050505"/>
      <stop offset="58%" stop-color="#101412"/>
      <stop offset="100%" stop-color="#06150D"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="930" cy="180" r="260" fill="#2C8B56" opacity="0.16"/>
  <circle cx="180" cy="1110" r="280" fill="#4DA3FF" opacity="0.08"/>
  ${content}
  <text x="80" y="1262" fill="#8A8F98" font-size="30" font-weight="700" font-family="SB AggroOTF, Pretendard, Apple SD Gothic Neo, Arial, sans-serif">courtskorea.com</text>
  <text x="805" y="1262" fill="#6FCF97" font-size="30" font-weight="800" font-family="SB AggroOTF, Pretendard, Apple SD Gothic Neo, Arial, sans-serif">@_courts_korea</text>
</svg>`;
}

function getDefaultCoverTitle(areaLabel: string, courts: Court[]) {
  const ownerLabel = getDominantOwnerLabel(courts);
  return ownerLabel
    ? [areaLabel, `${ownerLabel} 테니스장`, "예약 정보"]
    : [areaLabel, "테니스장", "예약 정보"];
}

function createCoverSlide(
  areaLabel: string,
  courts: Court[],
  coverPhoto?: CoverPhoto | null,
  coverEdit?: CoverSlideEdit
): InstagramSlide {
  const titleLines = (coverEdit?.title.trim() ? coverEdit.title.split("\n") : getDefaultCoverTitle(areaLabel, courts))
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
  const background = coverPhoto?.dataUrl
    ? `<image href="${escapeXml(coverPhoto.dataUrl)}" x="0" y="0" width="${WIDTH}" height="${HEIGHT}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect width="${WIDTH}" height="${HEIGHT}" fill="#121512"/>
       <rect x="0" y="0" width="${WIDTH}" height="660" fill="#1D2C22"/>
       <path d="M-80 520 C210 300 440 640 700 410 C870 260 1040 330 1160 220 L1160 760 L-80 760 Z" fill="#284D37" opacity="0.78"/>
       <path d="M0 600 L1080 310 M0 760 L1080 470 M110 760 L1080 610 M300 350 L890 760 M520 270 L1030 760" stroke="#E8EEE8" stroke-width="5" opacity="0.38"/>`;

  const titleSvg = titleLines
    .map(
      (line, index) =>
        `<text x="540" y="${955 + index * 136}" text-anchor="middle" fill="#FFFFFF" font-size="104" font-weight="500" letter-spacing="-2" font-family="SB AggroOTF, Pretendard, Apple SD Gothic Neo, Arial, sans-serif">${escapeXml(line)}</text>`
    )
    .join("");

  return {
    title: "커버",
    kind: "cover",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="coverShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.08"/>
      <stop offset="45%" stop-color="#000000" stop-opacity="0.18"/>
      <stop offset="70%" stop-color="#000000" stop-opacity="0.82"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="1"/>
    </linearGradient>
    <filter id="titleShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.52"/>
    </filter>
  </defs>
  ${background}
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#coverShade)"/>
  <line x1="0" y1="794" x2="405" y2="794" stroke="#FFFFFF" stroke-width="2" opacity="0.9"/>
  <text x="540" y="808" text-anchor="middle" fill="#FFFFFF" font-size="34" font-weight="500" font-family="SB AggroOTF, Pretendard, Apple SD Gothic Neo, Arial, sans-serif">Courts Korea</text>
  <line x1="680" y1="794" x2="1080" y2="794" stroke="#FFFFFF" stroke-width="2" opacity="0.9"/>
  <g filter="url(#titleShadow)">${titleSvg}</g>
</svg>`,
    fileName: `${slugifyFileName(areaLabel)}-tennis-cover.png`,
  };
}

function createCourtListSlide(
  areaLabel: string,
  court: Court,
  page: number,
  edit: CourtSlideEdit
): InstagramSlide {
  const courtName = edit.courtName;
  const titleLines = wrapText(courtName, 13, 2);
  const titleY = titleLines.length === 1 ? 152 : 126;
  const titleBoxHeight = titleLines.length === 1 ? 94 : 162;
  const titleBoxWidth = clamp(Math.max(...titleLines.map((line) => line.length)) * 62 + 80, 360, 980);
  const titleBoxX = (WIDTH - titleBoxWidth) / 2;
  const background = edit.photo?.dataUrl
    ? `<image href="${escapeXml(edit.photo.dataUrl)}" x="0" y="595" width="${WIDTH}" height="755" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="0" y="595" width="${WIDTH}" height="755" fill="#233D2D"/>
       <path d="M-40 1040 L1120 760 M-40 1180 L1120 900 M150 1350 L800 610 M430 1350 L1080 710" stroke="#DDE8DD" stroke-width="5" opacity="0.42"/>
       <path d="M0 775 C220 650 420 800 620 690 C780 605 960 650 1080 590 L1080 870 L0 870 Z" fill="#1B2A20" opacity="0.72"/>`;

  return {
    title: `목록 ${page}`,
    kind: "court",
    courtId: court.id,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="listShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="1"/>
      <stop offset="43%" stop-color="#000000" stop-opacity="1"/>
      <stop offset="58%" stop-color="#000000" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.08"/>
    </linearGradient>
    <filter id="listShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#000000"/>
  ${background}
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#listShade)"/>
  <g filter="url(#listShadow)">
    <rect x="${titleBoxX}" y="84" width="${titleBoxWidth}" height="${titleBoxHeight}" fill="#FFFFFF"/>
    ${titleLines
      .map(
        (line, index) =>
          `<text x="540" y="${titleY + index * 70}" text-anchor="middle" fill="#000000" font-size="68" font-weight="500" letter-spacing="-1.5" font-family="SB AggroOTF, Pretendard, Apple SD Gothic Neo, Arial, sans-serif">${escapeXml(line)}</text>`
      )
      .join("")}
  </g>
  <text x="540" y="340" text-anchor="middle" fill="#FFFFFF" font-size="48" font-weight="300" font-family="SB AggroOTF, Pretendard, Apple SD Gothic Neo, Arial, sans-serif">${escapeXml(edit.audience)}</text>
  <text x="540" y="424" text-anchor="middle" fill="#FFFFFF" font-size="30" font-weight="500" text-decoration="underline" font-family="SB AggroOTF, Pretendard, Apple SD Gothic Neo, Arial, sans-serif">${escapeXml(edit.label)}</text>
  <text x="540" y="500" text-anchor="middle" fill="#FFFFFF" font-size="46" font-weight="500" letter-spacing="-1" font-family="SB AggroOTF, Pretendard, Apple SD Gothic Neo, Arial, sans-serif">${escapeXml(edit.text)}</text>
</svg>`,
    fileName: `${slugifyFileName(areaLabel)}-${slugifyFileName(courtName)}-${page}.png`,
  };
}

function createCtaSlide(areaLabel: string): InstagramSlide {
  const content = `
    <text x="80" y="126" fill="#6FCF97" font-size="34" font-weight="800" font-family="SB AggroOTF, Pretendard, Apple SD Gothic Neo, Arial, sans-serif">Courts Korea</text>
    ${textBlock(wrapText("테니스장 예약은 타이밍이 중요하니까", 13, 2), 80, 280, {
      size: 72,
      color: "#FFFFFF",
      weight: 900,
      gap: 92,
    })}
    <rect x="80" y="610" width="920" height="330" rx="36" fill="#17191B" stroke="#2C2C2C" filter="url(#softShadow)"/>
    <text x="138" y="710" fill="#F2F2F2" font-size="42" font-weight="850" font-family="SB AggroOTF, Pretendard, Apple SD Gothic Neo, Arial, sans-serif">예약 오픈일 확인</text>
    <text x="138" y="785" fill="#F2F2F2" font-size="42" font-weight="850" font-family="SB AggroOTF, Pretendard, Apple SD Gothic Neo, Arial, sans-serif">찜한 코트 캘린더 모아보기</text>
    <text x="138" y="860" fill="#F2F2F2" font-size="42" font-weight="850" font-family="SB AggroOTF, Pretendard, Apple SD Gothic Neo, Arial, sans-serif">상세페이지에서 예약 링크 이동</text>
    <rect x="80" y="1030" width="920" height="110" rx="28" fill="#2C8B56"/>
    <text x="220" y="1100" fill="#FFFFFF" font-size="40" font-weight="900" font-family="SB AggroOTF, Pretendard, Apple SD Gothic Neo, Arial, sans-serif">courtskorea.com 에서 ${escapeXml(areaLabel)} 검색</text>
  `;

  return {
    title: "마지막",
    kind: "cta",
    svg: slideShell(content),
    fileName: `${slugifyFileName(areaLabel)}-tennis-cta.png`,
  };
}

function createCaption(areaLabel: string, courts: Court[]) {
  const names = courts.slice(0, 8).map((court) => cleanName(court.basic_court_name));
  return `${areaLabel} 테니스장 예약 정보 모음 🎾

티켓팅처럼 빠르게 마감되는 테니스장 예약,
예약 오픈일을 미리 확인하고 준비해보세요.

${names.map((name) => `- ${name}`).join("\n")}

더 자세한 예약 링크와 위치 정보는 courtskorea.com에서 확인할 수 있어요.

#테니스장예약 #테니스예약 #${areaLabel.replace(/\s+/g, "")}테니스 #코트코리아 #courtskorea`;
}

async function downloadSvgAsPng(svg: string, fileName: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("이미지를 생성하지 못했습니다."));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지를 생성하지 못했습니다.");
    context.drawImage(image, 0, 0, WIDTH, HEIGHT);

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = fileName;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AdminInstagramGenerator({ courts }: { courts: Court[] }) {
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([]);
  const [isCourtPickerOpen, setIsCourtPickerOpen] = useState(false);
  const [draftCourtIds, setDraftCourtIds] = useState<string[]>([]);
  const [courtSearch, setCourtSearch] = useState("");
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [draggingCourtId, setDraggingCourtId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ courtId: string; position: "before" | "after" } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFindingPhoto, setIsFindingPhoto] = useState(false);
  const [coverPhoto, setCoverPhoto] = useState<CoverPhoto | null>(null);
  const [coverEdit, setCoverEdit] = useState<CoverSlideEdit | null>(null);
  const [courtSlideEdits, setCourtSlideEdits] = useState<Record<string, CourtSlideEdit>>({});
  const [photoSearchHistory, setPhotoSearchHistory] = useState<Record<string, string[]>>({});
  const [manualPhotoUrl, setManualPhotoUrl] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const selectableCourts = useMemo(() => {
    return courts
      .filter((court) => court.use_or_not)
      .sort((a, b) => cleanName(a.basic_court_name).localeCompare(cleanName(b.basic_court_name), "ko"));
  }, [courts]);

  const filteredPickerCourts = useMemo(() => {
    const keyword = courtSearch.replace(/\s+/g, " ").trim().toLowerCase();
    if (!keyword) return selectableCourts;

    return selectableCourts.filter((court) =>
      [
        court.basic_court_name,
        court.basic_region,
        court.basic_city,
        court.basic_address,
        court.basic_owner_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [courtSearch, selectableCourts]);

  const targetCourts = useMemo(() => {
    const courtsById = new Map(selectableCourts.map((court) => [court.id, court]));
    return selectedCourtIds.map((courtId) => courtsById.get(courtId)).filter(Boolean) as Court[];
  }, [selectableCourts, selectedCourtIds]);

  const areaLabel = useMemo(() => {
    if (targetCourts.length === 0) return "선택한 테니스장";

    const regions = Array.from(new Set(targetCourts.map((court) => court.basic_region).filter(Boolean)));
    const cities = Array.from(new Set(targetCourts.map((court) => court.basic_city).filter(Boolean)));

    if (regions.length === 1 && cities.length === 1) return `${regions[0]} ${cities[0]}`;
    if (regions.length === 1) return String(regions[0]);
    return "선택한 테니스장";
  }, [targetCourts]);

  function getDefaultCourtSlideEdit(court: Court): CourtSlideEdit {
    const summary = getCourtBookingSummary(court);

    return {
      courtName: cleanName(court.basic_court_name),
      audience: summary.audience,
      label: summary.label,
      text: summary.text,
      photo: null,
    };
  }

  function getCourtSlideEdit(court: Court) {
    return {
      ...getDefaultCourtSlideEdit(court),
      ...(courtSlideEdits[court.id] ?? {}),
    };
  }

  const slides = useMemo<InstagramSlide[]>(() => {
    if (targetCourts.length === 0) return [];
    return [
      createCoverSlide(areaLabel, targetCourts, coverPhoto, coverEdit ?? undefined),
      ...targetCourts.map((court, index) =>
        createCourtListSlide(areaLabel, court, index + 1, getCourtSlideEdit(court))
      ),
      createCtaSlide(areaLabel),
    ];
  }, [areaLabel, coverEdit, coverPhoto, courtSlideEdits, targetCourts]);
  const currentSlide = slides[Math.min(selectedSlideIndex, Math.max(slides.length - 1, 0))];
  const selectedCourt =
    currentSlide?.kind === "court"
      ? targetCourts.find((court) => court.id === currentSlide.courtId) ?? null
      : null;
  const selectedCourtEdit = selectedCourt ? getCourtSlideEdit(selectedCourt) : null;
  const caption = useMemo(() => createCaption(areaLabel, targetCourts), [areaLabel, targetCourts]);

  const previewSrc = currentSlide
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(currentSlide.svg)}`
    : "";
  const coverTitle = coverEdit?.title ?? getDefaultCoverTitle(areaLabel, targetCourts).join("\n");

  async function downloadCurrentSlide() {
    if (!currentSlide) return;
    setIsDownloading(true);
    try {
      await downloadSvgAsPng(currentSlide.svg, currentSlide.fileName);
    } finally {
      setIsDownloading(false);
    }
  }

  async function downloadAllSlides() {
    if (slides.length === 0) return;
    setIsDownloading(true);
    try {
      for (const slide of slides) {
        await downloadSvgAsPng(slide.svg, slide.fileName);
        await new Promise((resolve) => window.setTimeout(resolve, 180));
      }
    } finally {
      setIsDownloading(false);
    }
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(caption);
    setCopyMessage("캡션을 복사했습니다.");
    window.setTimeout(() => setCopyMessage(null), 1800);
  }

  function updateCourtSlideEdit(courtId: string, patch: Partial<CourtSlideEdit>) {
    const court = targetCourts.find((item) => item.id === courtId);
    if (!court) return;

    setCourtSlideEdits((current) => ({
      ...current,
      [courtId]: {
        ...getDefaultCourtSlideEdit(court),
        ...(current[courtId] ?? {}),
        ...patch,
      },
    }));
  }

  function applyPhotoToSelectedSlide(photo: CoverPhoto) {
    if (selectedCourt && currentSlide?.kind === "court") {
      updateCourtSlideEdit(selectedCourt.id, { photo });
    } else if (currentSlide?.kind === "cover") {
      setCoverPhoto(photo);
      setSelectedSlideIndex(0);
    }
  }

  async function findSelectedSlidePhoto() {
    setIsFindingPhoto(true);
    setPhotoError(null);

    try {
      const photoHistoryKey = selectedCourt && currentSlide?.kind === "court" ? selectedCourt.id : "cover";
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers = new Headers({ "Content-Type": "application/json" });
      if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
      }

      const query =
        selectedCourt && currentSlide?.kind === "court"
          ? [
              selectedCourt.basic_region,
              selectedCourt.basic_city,
              cleanName(selectedCourt.basic_court_name),
              "테니스장",
            ]
              .filter(Boolean)
              .join(" ")
          : [areaLabel, getDominantOwnerLabel(targetCourts), "테니스장"].filter(Boolean).join(" ");
      const response = await fetch("/api/admin/instagram/image-search", {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: query || `${areaLabel} 테니스장`,
          excludeUrls: Array.from(
            new Set([...(photoSearchHistory[photoHistoryKey] ?? []), selectedPhoto?.sourceUrl].filter(Boolean))
          ),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "사진을 찾지 못했습니다.");
      }

      applyPhotoToSelectedSlide(data.image);

      if (data.image?.sourceUrl) {
        setPhotoSearchHistory((current) => ({
          ...current,
          [photoHistoryKey]: [...(current[photoHistoryKey] ?? []), data.image.sourceUrl],
        }));
      }
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "사진을 찾지 못했습니다.");
    } finally {
      setIsFindingPhoto(false);
    }
  }

  async function applyManualPhotoUrl() {
    const trimmedUrl = manualPhotoUrl.trim();
    if (!trimmedUrl) return;

    setIsFindingPhoto(true);
    setPhotoError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers = new Headers({ "Content-Type": "application/json" });
      if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
      }

      const response = await fetch("/api/admin/instagram/image-search", {
        method: "POST",
        headers,
        body: JSON.stringify({ imageUrl: trimmedUrl }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "이미지를 적용하지 못했습니다.");
      }

      applyPhotoToSelectedSlide(data.image);
      setManualPhotoUrl("");
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "이미지를 적용하지 못했습니다.");
    } finally {
      setIsFindingPhoto(false);
    }
  }

  function applyUploadedPhoto(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        setPhotoError("이미지 파일을 읽지 못했습니다.");
        return;
      }

      applyPhotoToSelectedSlide({
        dataUrl: result,
        sourceUrl: `업로드한 이미지 · ${file.name}`,
        title: file.name,
      });
      setPhotoError(null);
    };
    reader.onerror = () => setPhotoError("이미지 파일을 읽지 못했습니다.");
    reader.readAsDataURL(file);
  }

  function openCourtPicker() {
    setDraftCourtIds(selectedCourtIds);
    setCourtSearch("");
    setIsCourtPickerOpen(true);
  }

  function toggleDraftCourt(courtId: string) {
    setDraftCourtIds((current) =>
      current.includes(courtId) ? current.filter((id) => id !== courtId) : [...current, courtId]
    );
  }

  function applyPickedCourts() {
    setSelectedCourtIds(draftCourtIds);
    setSelectedSlideIndex(0);
    setCoverPhoto(null);
    setCoverEdit(null);
    setPhotoSearchHistory({});
    setManualPhotoUrl("");
    setPhotoError(null);
    setIsCourtPickerOpen(false);
  }

  function moveCourtSlide(fromCourtId: string, toCourtId: string, position: "before" | "after") {
    setSelectedCourtIds((current) => {
      const fromIndex = current.indexOf(fromCourtId);
      const toIndex = current.indexOf(toCourtId);
      if (fromIndex < 0 || toIndex < 0) return current;

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      const targetIndexAfterRemoval = next.indexOf(toCourtId);
      const insertIndex = position === "after" ? targetIndexAfterRemoval + 1 : targetIndexAfterRemoval;
      next.splice(insertIndex, 0, moved);
      return next;
    });
  }

  function getDropPosition(event: React.DragEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  }

  const selectedPhoto =
    currentSlide?.kind === "court" ? selectedCourtEdit?.photo : currentSlide?.kind === "cover" ? coverPhoto : null;
  const canFindPhoto = currentSlide?.kind === "cover" || currentSlide?.kind === "court";
  const selectedPhotoSourceIsLink =
    selectedPhoto?.sourceUrl?.startsWith("http://") || selectedPhoto?.sourceUrl?.startsWith("https://");

  return (
    <section className="grid gap-5 lg:h-[720px] lg:grid-cols-[280px_minmax(360px,1fr)_360px] lg:items-stretch">
      <aside className="flex min-h-0 flex-col rounded-lg border border-[#2f2f2f] bg-[#151515] p-4">
        <button
          type="button"
          onClick={openCourtPicker}
          className="w-full rounded-lg bg-[#4ade80] px-4 py-3 text-sm font-semibold text-black"
        >
          테니스장 불러오기
        </button>

        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-[#a7a7a7]">장표 목록</p>
            <span className="text-xs text-[#777]">{slides.length}장</span>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {slides.length === 0 ? (
              <p className="rounded-lg border border-[#2f2f2f] bg-black px-3 py-6 text-center text-sm text-[#8c8c8c]">
                테니스장을 불러오면 장표가 생성됩니다.
              </p>
            ) : (
              slides.map((slide, index) => {
                const isCourtSlide = slide.kind === "court" && !!slide.courtId;
                const isDropTarget =
                  isCourtSlide && dropIndicator?.courtId === slide.courtId && draggingCourtId !== slide.courtId;

                return (
                <div key={`${slide.title}-${index}`} className="relative">
                  {isDropTarget && dropIndicator?.position === "before" ? (
                    <div className="absolute -top-[7px] left-0 right-0 z-10 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#4ade80]" />
                      <span className="h-[3px] flex-1 rounded-full bg-[#4ade80] shadow-[0_0_12px_rgba(74,222,128,0.75)]" />
                    </div>
                  ) : null}
                  <button
                  type="button"
                  draggable={slide.kind === "court"}
                  onDragStart={(event) => {
                    if (slide.kind !== "court" || !slide.courtId) return;
                    setDraggingCourtId(slide.courtId);
                    setDropIndicator(null);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", slide.courtId);
                  }}
                  onDragOver={(event) => {
                    if (slide.kind !== "court" || !slide.courtId || draggingCourtId === slide.courtId) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDropIndicator({ courtId: slide.courtId, position: getDropPosition(event) });
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) {
                      setDropIndicator((current) => (current?.courtId === slide.courtId ? null : current));
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (slide.kind !== "court" || !slide.courtId) return;
                    const fromCourtId = event.dataTransfer.getData("text/plain") || draggingCourtId;
                    if (!fromCourtId) return;
                    const position = dropIndicator?.courtId === slide.courtId ? dropIndicator.position : getDropPosition(event);
                    moveCourtSlide(fromCourtId, slide.courtId, position);
                    setDraggingCourtId(null);
                    setDropIndicator(null);
                  }}
                  onDragEnd={() => {
                    setDraggingCourtId(null);
                    setDropIndicator(null);
                  }}
                  onClick={() => {
                    setSelectedSlideIndex(index);
                    setPhotoError(null);
                  }}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                    index === selectedSlideIndex
                      ? "border-[#4ade80] bg-[#14301f]"
                      : "border-[#2f2f2f] bg-black hover:border-[#555]"
                  } ${draggingCourtId && draggingCourtId === slide.courtId ? "opacity-45" : ""} ${
                    slide.kind === "court" ? "cursor-grab active:cursor-grabbing" : ""
                  } ${
                    isDropTarget ? "border-[#4ade80]/70 bg-[#0f2217]" : ""
                  }`}
                >
                  <span className="block text-xs text-[#8c8c8c]">{index + 1}</span>
                  <span className="mt-1 block truncate text-sm font-semibold text-white">
                    {slide.kind === "cover"
                      ? "커버"
                      : slide.kind === "cta"
                        ? "마지막"
                        : selectedCourt?.id === slide.courtId
                          ? selectedCourtEdit?.courtName
                          : targetCourts.find((court) => court.id === slide.courtId)?.basic_court_name}
                  </span>
                  </button>
                  {isDropTarget && dropIndicator?.position === "after" ? (
                    <div className="absolute -bottom-[7px] left-0 right-0 z-10 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#4ade80]" />
                      <span className="h-[3px] flex-1 rounded-full bg-[#4ade80] shadow-[0_0_12px_rgba(74,222,128,0.75)]" />
                    </div>
                  ) : null}
                </div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      <main className="flex min-h-[520px] items-center justify-center rounded-lg border border-[#2f2f2f] bg-black p-5 lg:min-h-0 lg:h-full">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={`${areaLabel} 인스타 게시물 미리보기`}
            className="max-h-full w-auto rounded-lg border border-[#2f2f2f] object-contain"
          />
        ) : (
          <p className="text-sm text-[#8c8c8c]">좌측에서 테니스장을 불러오면 미리보기가 표시됩니다.</p>
        )}
      </main>

      <aside className="min-h-0 overflow-y-auto rounded-lg border border-[#2f2f2f] bg-[#151515] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#a7a7a7]">장표 편집</p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {currentSlide?.kind === "cover" ? "커버" : currentSlide?.kind === "cta" ? "마지막" : "목록"}
            </h3>
          </div>
        </div>

        {!currentSlide ? (
          <p className="mt-6 rounded-lg border border-[#2f2f2f] bg-black px-3 py-6 text-center text-sm text-[#8c8c8c]">
            편집할 장표가 없습니다.
          </p>
        ) : currentSlide.kind === "court" && selectedCourt && selectedCourtEdit ? (
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-[#a7a7a7]">테니스장명</span>
              <input
                value={selectedCourtEdit.courtName}
                onChange={(event) => updateCourtSlideEdit(selectedCourt.id, { courtName: event.target.value })}
                className="mt-2 w-full rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[#a7a7a7]">예약정보</span>
              <input
                value={selectedCourtEdit.audience}
                onChange={(event) => updateCourtSlideEdit(selectedCourt.id, { audience: event.target.value })}
                className="mt-2 w-full rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[#a7a7a7]">예약 오픈 시간 캡션</span>
              <input
                value={selectedCourtEdit.label}
                onChange={(event) => updateCourtSlideEdit(selectedCourt.id, { label: event.target.value })}
                className="mt-2 w-full rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[#a7a7a7]">예약 오픈 시간</span>
              <textarea
                value={selectedCourtEdit.text}
                onChange={(event) => updateCourtSlideEdit(selectedCourt.id, { text: event.target.value })}
                className="mt-2 h-24 w-full resize-none rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
              />
            </label>
          </div>
        ) : currentSlide.kind === "cover" ? (
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-[#a7a7a7]">커버 타이틀</span>
              <textarea
                value={coverTitle}
                onChange={(event) => setCoverEdit({ title: event.target.value })}
                className="mt-2 h-32 w-full resize-none rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm leading-6 text-white outline-none focus:border-[#4ade80]"
              />
            </label>
            <p className="rounded-lg border border-[#2f2f2f] bg-black px-3 py-3 text-xs leading-5 text-[#8c8c8c]">
              줄바꿈한 그대로 커버에 반영됩니다. 사진도 아래에서 바꿀 수 있습니다.
            </p>
          </div>
        ) : (
          <p className="mt-5 rounded-lg border border-[#2f2f2f] bg-black px-3 py-4 text-sm leading-6 text-[#a7a7a7]">
            마지막 장표는 기본 장표로 고정됩니다.
          </p>
        )}

        <div className="mt-5 border-t border-[#2f2f2f] pt-5">
          <p className="text-xs font-semibold text-[#a7a7a7]">테니스장 사진</p>
          <button
            type="button"
            onClick={findSelectedSlidePhoto}
            disabled={!canFindPhoto || targetCourts.length === 0 || isFindingPhoto}
            className="mt-2 w-full rounded-lg border border-[#3c3c3c] bg-[#242424] px-4 py-2 text-sm font-semibold text-white hover:bg-[#303030] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFindingPhoto ? "사진 찾는 중..." : "사진찾기"}
          </button>
          <p className="mt-3 text-xs leading-5 text-[#8c8c8c]">
            검색 사진이 마음에 들지 않으면 이미지 URL을 붙여넣거나 직접 업로드할 수 있습니다.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={manualPhotoUrl}
              onChange={(event) => setManualPhotoUrl(event.target.value)}
              placeholder="이미지 URL 붙여넣기"
              disabled={!canFindPhoto || isFindingPhoto}
              className="min-w-0 flex-1 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-xs text-white outline-none placeholder:text-[#666] focus:border-[#4ade80] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="button"
              onClick={applyManualPhotoUrl}
              disabled={!canFindPhoto || isFindingPhoto || !manualPhotoUrl.trim()}
              className="shrink-0 rounded-lg border border-[#3c3c3c] bg-[#242424] px-3 py-2 text-xs font-semibold text-white hover:bg-[#303030] disabled:cursor-not-allowed disabled:opacity-50"
            >
              URL 적용
            </button>
          </div>
          <label
            className={`mt-2 flex w-full cursor-pointer items-center justify-center rounded-lg border border-[#3c3c3c] bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-[#202020] ${
              !canFindPhoto || isFindingPhoto ? "pointer-events-none opacity-50" : ""
            }`}
          >
            이미지 업로드
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={!canFindPhoto || isFindingPhoto}
              onChange={(event) => {
                applyUploadedPhoto(event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {selectedPhoto?.sourceUrl ? (
            selectedPhotoSourceIsLink ? (
              <a
                href={selectedPhoto.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block break-all text-xs leading-5 text-[#6FCF97] underline underline-offset-4"
              >
                {selectedPhoto.sourceUrl}
              </a>
            ) : (
              <p className="mt-3 break-all text-xs leading-5 text-[#8c8c8c]">{selectedPhoto.sourceUrl}</p>
            )
          ) : (
            <p className="mt-3 text-xs text-[#8c8c8c]">아직 적용된 사진이 없습니다.</p>
          )}
          {photoError ? <p className="mt-2 text-xs leading-5 text-[#ffb4b4]">{photoError}</p> : null}
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-[#2f2f2f] pt-5">
          <button
            type="button"
            onClick={downloadCurrentSlide}
            disabled={!currentSlide || isDownloading}
            className="rounded-lg bg-[#4ade80] px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            현재 이미지 다운로드
          </button>
          <button
            type="button"
            onClick={downloadAllSlides}
            disabled={slides.length === 0 || isDownloading}
            className="rounded-lg border border-[#3c3c3c] bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            전체 다운로드
          </button>
        </div>

        <div className="mt-5 border-t border-[#2f2f2f] pt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-[#a7a7a7]">게시글 캡션</p>
            <button
              type="button"
              onClick={copyCaption}
              disabled={targetCourts.length === 0}
              className="text-xs font-semibold text-[#6FCF97] disabled:text-[#5c5c5c]"
            >
              복사
            </button>
          </div>
          <textarea
            readOnly
            value={targetCourts.length === 0 ? "선택한 테니스장이 없습니다." : caption}
            className="h-40 w-full resize-none rounded-lg border border-[#3c3c3c] bg-black px-3 py-3 text-xs leading-5 text-[#d8d8d8] outline-none"
          />
          {copyMessage ? <p className="mt-2 text-xs text-[#86efac]">{copyMessage}</p> : null}
        </div>
      </aside>

      {isCourtPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="flex max-h-[82vh] w-full max-w-3xl flex-col rounded-lg border border-[#3c3c3c] bg-[#171717] shadow-2xl">
            <div className="border-b border-[#2f2f2f] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">테니스장 불러오기</h3>
                  <p className="mt-1 text-sm text-[#a7a7a7]">검색 후 사용할 테니스장을 체크하세요.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCourtPickerOpen(false)}
                  className="rounded-md px-2 py-1 text-2xl leading-none text-[#a7a7a7] hover:text-white"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>
              <input
                value={courtSearch}
                onChange={(event) => setCourtSearch(event.target.value)}
                placeholder="테니스장명, 지역, 주소로 검색"
                className="mt-4 w-full rounded-lg border border-[#3c3c3c] bg-black px-4 py-3 text-sm text-white outline-none focus:border-[#4ade80]"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {filteredPickerCourts.length === 0 ? (
                <p className="rounded-lg border border-[#2f2f2f] bg-black px-4 py-8 text-center text-sm text-[#8c8c8c]">
                  검색 결과가 없습니다.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredPickerCourts.map((court) => {
                    const checked = draftCourtIds.includes(court.id);
                    return (
                      <label
                        key={court.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                          checked
                            ? "border-[#4ade80] bg-[#14301f]"
                            : "border-[#2f2f2f] bg-black hover:border-[#555]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDraftCourt(court.id)}
                          className="mt-1 h-4 w-4 accent-[#4ade80]"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-white">
                            {cleanName(court.basic_court_name)}
                          </span>
                          <span className="mt-1 block truncate text-xs text-[#8c8c8c]">
                            {[court.basic_region, court.basic_city, getOwnerLabel(court.basic_owner_type)]
                              .filter(Boolean)
                              .join(" · ")}
                            {court.basic_address ? ` · ${court.basic_address}` : ""}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#2f2f2f] p-4">
              <p className="text-sm text-[#a7a7a7]">{draftCourtIds.length}개 선택됨</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCourtPickerOpen(false)}
                  className="rounded-lg border border-[#3c3c3c] bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-[#242424]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={applyPickedCourts}
                  className="rounded-lg bg-[#4ade80] px-4 py-2 text-sm font-semibold text-black"
                >
                  불러오기
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
