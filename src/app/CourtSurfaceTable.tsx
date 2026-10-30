import Image from "next/image";
import type { Court } from "./types";
import { fmt, td, tdIcon, th } from "./styles";
import { getCourtSurfaceRows, normalizeSportType } from "@/lib/sports";

export function CourtSurfaceTable({ court }: { court: Court }) {
  const sportType = normalizeSportType(court.sport_type);
  if (sportType === "badminton") return null;

  const rows = getCourtSurfaceRows(court);

  return (
    <table className="w-full table-fixed">
      <thead>
        <tr>
          <th className={th}>구분</th>
          <th className={th}>실내</th>
          <th className={th}>실외</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td className={tdIcon}>
              <div className="flex items-center justify-center gap-1.5" title={row.label}>
                {row.icon ? (
                  <Image
                    src={row.icon}
                    alt=""
                    aria-hidden="true"
                    width={20}
                    height={36}
                  />
                ) : null}
              </div>
            </td>
            <td className={td}>{fmt(row.indoor)}</td>
            <td className={td}>{fmt(row.outdoor)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
