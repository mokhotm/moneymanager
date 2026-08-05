import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(135deg, #0a101e 0%, #111827 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1.5px solid #eab308",
        }}
      >
        <span
          style={{
            color: "#eab308",
            fontSize: 18,
            fontWeight: 800,
            fontFamily: "serif",
            lineHeight: 1,
          }}
        >
          M
        </span>
      </div>
    ),
    { ...size }
  );
}
