"use client";

import type { TemplateInput } from "../lib/api";

export default function FormField({
  input,
  value,
  onChange,
  error,
}: {
  input: TemplateInput;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const renderField = () => {
    switch (input.type) {
      case "select":
        return (
          <select value={(value as string) ?? input.default ?? ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select...</option>
            {input.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case "boolean":
        return (
          <button
            type="button"
            role="switch"
            aria-checked={!!value}
            onClick={() => onChange(!value)}
            className={`toggle ${value ? "on" : ""}`}
          >
            <span className="knob" />
          </button>
        );

      case "number":
        return (
          <input
            type="number"
            value={(value as number) ?? (input.default as number) ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            min={input.min ?? undefined}
            max={input.max ?? undefined}
            placeholder={input.description || ""}
          />
        );

      case "multiline":
        return (
          <textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            placeholder={input.description || ""}
          />
        );

      default:
        return (
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            pattern={input.pattern ?? undefined}
            placeholder={input.description || ""}
          />
        );
    }
  };

  return (
    <div className="field">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ marginBottom: 0 }}>
          {input.title}
          {input.required && <span className="req">*</span>}
        </label>
        {input.type === "boolean" && (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{value ? "Enabled" : "Disabled"}</span>
        )}
      </div>
      {input.description && input.type !== "boolean" && input.type !== "multiline" && (
        <p className="hint" style={{ marginBottom: 6 }}>
          {input.description}
        </p>
      )}
      <div style={{ marginTop: 6 }}>{renderField()}</div>
      {error && <p className="err">{error}</p>}
    </div>
  );
}
