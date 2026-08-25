"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getIn, useFormik } from "formik";
import { ArrowLeft, ChevronDown, Plus, Trash2 } from "lucide-react";
import { ErrorText } from "@/components/form/error-text";
import { CreateFieldModal } from "@/components/players/create-field-modal";
import { ConfirmDeleteModal, openConfirm } from "@/components/ui/confirm-delete-modal";
import { COUNTRIES, customAppliesToForRole, FORMAT_LABELS, FORMATS, ROLES, TEST_COUNTRIES } from "@/data/cricket";
import { api, ApiError, uploadPlayerPhoto } from "@/lib/api";
import type { FormatKey, FormatStats, Player, PlayerCustomField } from "@/lib/players";
import {
  playerInitialValues,
  playerPayloadFromValues,
  playerSchema,
  showsBatting,
  showsBowling,
  showsKeeping,
  type FormFormat,
  type PlayerFormValues,
} from "@/validation/player";

type FormatRow = {
  key: keyof FormatStats;
  label: string;
  placeholder: string;
  group: "common" | "batting" | "bowling" | "keeping";
  input?: "text" | "team";
  formats?: readonly FormatKey[];
};

const FORMAT_ROWS: FormatRow[] = [
  { key: "debut_year", label: "Debut Year", placeholder: "Add debut year", group: "common" },
  { key: "debut_team", label: "Debut against which team?", placeholder: "Select team", group: "common", input: "team" },
  { key: "last_match_year", label: "Last Match Year", placeholder: "Add last match year", group: "common" },
  { key: "last_match_team", label: "Last Match against which team?", placeholder: "Select team", group: "common", input: "team" },
  { key: "matches", label: "Number of matches", placeholder: "Enter number of matches", group: "common" },
  { key: "man_of_the_match", label: "Number of Man of the match awards", placeholder: "Enter man of the match awards", group: "common" },
  { key: "runs", label: "Number of runs", placeholder: "Enter runs", group: "batting" },
  { key: "batting_average", label: "Batting average", placeholder: "Enter average", group: "batting" },
  { key: "batting_strike_rate", label: "Batting Strike rate", placeholder: "Enter strike rate", group: "batting" },
  { key: "hundreds", label: "Number of hundreds", placeholder: "Enter number of hundreds", group: "batting" },
  { key: "fifties", label: "Number of 50's", placeholder: "Enter number of fifties", group: "batting" },
  { key: "highest_score", label: "Highest score", placeholder: "Enter highest score", group: "batting" },
  { key: "most_hundreds_against", label: "Most number of hundreds against which team?", placeholder: "Select team", group: "batting", input: "team" },
  { key: "sixes", label: "Number of sixes", placeholder: "Enter number of sixes", group: "batting" },
  { key: "batting_position", label: "Which batting position did he bat the most number of times?", placeholder: "Position 1-11", group: "batting", formats: ["odi", "test"] },
  { key: "wickets", label: "Number of wickets", placeholder: "Enter number of wickets", group: "bowling" },
  { key: "bowling_strike_rate", label: "Bowling strike rate", placeholder: "Enter strike rate", group: "bowling" },
  { key: "bowling_average", label: "Bowling average", placeholder: "Enter average", group: "bowling" },
  { key: "wicket_hauls", label: "Number of 5 wicket hauls", placeholder: "Enter number of 5 wicket hauls", group: "bowling" },
  { key: "catches", label: "Number of catches", placeholder: "Enter number of catches", group: "keeping" },
  { key: "stumpings", label: "Number of stumpings", placeholder: "Enter number of stumpings", group: "keeping" },
];

const COMMON_ROWS = FORMAT_ROWS.filter((row) => row.group === "common");
const BATTING_ROWS = FORMAT_ROWS.filter((row) => row.group === "batting" && row.key !== "batting_position");
const BATTING_POSITION_ROW = FORMAT_ROWS.find((row) => row.key === "batting_position")!;
const BOWLING_ROWS = FORMAT_ROWS.filter((row) => row.group === "bowling");
const KEEPING_ROWS = FORMAT_ROWS.filter((row) => row.group === "keeping");

const inputClass =
  "h-12 w-full rounded-full border bg-[#0c0c10] px-5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";
const labelClass = "mb-2 block text-sm font-medium text-white";

type PlayerFormProps = {
  player?: Player;
};

export function PlayerForm({ player }: PlayerFormProps) {
  const router = useRouter();
  const editing = Boolean(player);
  const [photoPreview, setPhotoPreview] = useState(player?.photo_url ?? "");
  const [customFields, setCustomFields] = useState<PlayerCustomField[]>([]);
  const [fieldsError, setFieldsError] = useState("");
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PlayerCustomField | null>(null);

  const formik = useFormik<PlayerFormValues>({
    initialValues: playerInitialValues(player),
    enableReinitialize: true,
    validationSchema: playerSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus("");
      try {
        let photoUrl = player?.photo_url ?? null;
        if (values.photo) {
          photoUrl = await uploadPlayerPhoto(values.photo);
        }
        const body = playerPayloadFromValues(values, photoUrl);
        if (editing && player) {
          await api(`/api/v1/players/${player.id}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
        } else {
          await api("/api/v1/players", {
            method: "POST",
            body: JSON.stringify(body),
          });
        }
        router.push("/players");
        router.refresh();
      } catch (err) {
        helpers.setStatus(err instanceof ApiError ? err.message : "Could not save player.");
      }
    },
  });

  const title = editing ? "Edit player" : "Add a new player";
  const battingVisible = showsBatting(formik.values.role);
  const bowlingVisible = showsBowling(formik.values.role);
  const keepingVisible = showsKeeping(formik.values.role);
  const formats = useMemo(
    () => ({
      odi: formik.values.odi,
      t20: formik.values.t20,
      test: formik.values.test,
    }),
    [formik.values.odi, formik.values.t20, formik.values.test],
  );

  async function loadCustomFields() {
    try {
      const items = await api<PlayerCustomField[]>("/api/v1/player-fields");
      setCustomFields(Array.isArray(items) ? items : []);
      setFieldsError("");
    } catch (err) {
      setCustomFields([]);
      setFieldsError(err instanceof ApiError ? err.message : "Could not load custom fields.");
    }
  }

  useEffect(() => {
    void loadCustomFields();
  }, []);

  useEffect(() => {
    const next = { ...formik.values.custom_fields };
    let changed = false;
    for (const field of customFields) {
      if (!next[field.id]) {
        next[field.id] = { odi: "", t20: "", test: "" };
        changed = true;
      }
    }
    if (changed) {
      void formik.setFieldValue("custom_fields", next, false);
    }
    // Merge only when the field catalog changes; formik is omitted on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFields]);

  function ensureCustomField(field: PlayerCustomField) {
    if (!field?.id) {
      void loadCustomFields();
      return;
    }
    setCustomFields((current) => (current.some((item) => item.id === field.id) ? current : [...current, field]));
    if (!formik.values.custom_fields[field.id]) {
      void formik.setFieldValue(
        `custom_fields.${field.id}`,
        { odi: "", t20: "", test: "" },
        false,
      );
    }
  }

  function removeCustomField(field: PlayerCustomField) {
    setCustomFields((current) => current.filter((item) => item.id !== field.id));
    if (formik.values.custom_fields[field.id]) {
      const next = { ...formik.values.custom_fields };
      delete next[field.id];
      void formik.setFieldValue("custom_fields", next, false);
    }
  }

  const roleAppliesTo = customAppliesToForRole(formik.values.role);
  const battingCustom = customFields.filter((item) => item.applies_to === "batter" && roleAppliesTo === "batter");
  const bowlingCustom = customFields.filter((item) => item.applies_to === "bowler" && roleAppliesTo === "bowler");
  const allRounderCustom = customFields.filter(
    (item) => item.applies_to === "all-rounder" && roleAppliesTo === "all-rounder",
  );
  const wicketkeeperCustom = customFields.filter(
    (item) => item.applies_to === "wicketkeeper" && roleAppliesTo === "wicketkeeper",
  );

  function fieldError(name: string): string | undefined {
    if (!getIn(formik.touched, name)) return undefined;
    const error = getIn(formik.errors, name);
    return typeof error === "string" ? error : undefined;
  }

  function onRoleChange(next: string) {
    formik.setFieldValue("role", next);
    if (!showsBowling(next)) {
      void formik.setFieldValue("most_dismissed_batter", "");
      for (const key of [
        "wickets_home_test",
        "wickets_away_test",
        "wickets_vs_india",
        "wickets_vs_australia",
        "wickets_vs_england",
        "wickets_vs_south_africa",
        "wickets_in_india",
        "wickets_in_australia",
        "wickets_in_england",
        "wickets_in_south_africa",
      ] as const) {
        void formik.setFieldValue(key, "");
      }
    }
    if (!showsBatting(next)) {
      void formik.setFieldValue("most_dismissals_against_bowler", "");
      for (const key of [
        "batting_avg_home_test",
        "batting_avg_away_test",
        "batting_avg_in_india_test",
        "batting_avg_in_australia_test",
        "batting_avg_in_england_test",
        "batting_avg_in_south_africa_test",
        "batting_avg_vs_india_test",
        "batting_avg_vs_australia_test",
        "batting_avg_vs_england_test",
        "batting_avg_vs_south_africa_test",
      ] as const) {
        void formik.setFieldValue(key, "");
      }
    }
  }

  return (
    <>
    <form onSubmit={formik.handleSubmit} noValidate className="pb-10">
      <Link
        href="/players"
        className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Back to players
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500">Enter player details & statistics</p>
        </div>
        <button
          type="button"
          onClick={() => window.setTimeout(() => setFieldModalOpen(true), 0)}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-purple px-6 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.4)]"
        >
          <Plus className="size-4" />
          Create New Field
        </button>
      </div>

      {fieldsError ? (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {fieldsError}
        </p>
      ) : null}

      {formik.status ? (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {formik.status}
        </p>
      ) : null}

      <div className="mt-8">
        <p className={labelClass}>Player Photo</p>
        <div className="flex items-center gap-4">
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="" className="size-20 rounded-full object-cover" />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-full bg-purple-soft text-sm font-semibold text-purple">
              Photo
            </span>
          )}
          <label className="inline-flex h-11 cursor-pointer items-center rounded-full border border-white/10 bg-[#121218] px-5 text-sm text-zinc-300">
            Upload photo
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                formik.setFieldValue("photo", file);
                formik.setFieldTouched("photo", true, false);
                if (file) {
                  setPhotoPreview(URL.createObjectURL(file));
                }
              }}
            />
          </label>
        </div>
        <ErrorText message={fieldError("photo")} />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Field label="Player Name" required error={fieldError("name")}>
          <input
            name="name"
            className={inputClassName(fieldError("name"))}
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Enter player name"
          />
        </Field>
        <SelectField
          label="Player Country"
          required
          name="country"
          value={formik.values.country}
          onChange={(value) => formik.setFieldValue("country", value)}
          onBlur={formik.handleBlur}
          placeholder="Select player country"
          error={fieldError("country")}
        >
          {COUNTRIES.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Playing role"
          required
          name="role"
          value={formik.values.role}
          onChange={onRoleChange}
          onBlur={formik.handleBlur}
          placeholder="Select playing role"
          error={fieldError("role")}
        >
          {ROLES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </SelectField>
        <Field label="Number of International Tournaments won" error={fieldError("tournaments_won")}>
          <input
            name="tournaments_won"
            className={inputClassName(fieldError("tournaments_won"))}
            value={formik.values.tournaments_won}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Add number of tournaments won"
          />
        </Field>
        <SelectField
          label="Did he captain in international cricket?"
          name="captain"
          value={formik.values.captain}
          onChange={(value) => formik.setFieldValue("captain", value)}
          onBlur={formik.handleBlur}
          placeholder="Select"
          error={fieldError("captain")}
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </SelectField>
        <Field label="Number of catches" error={fieldError("catches")}>
          <input
            name="catches"
            className={inputClassName(fieldError("catches"))}
            value={formik.values.catches}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Enter number of catches"
          />
        </Field>
      </div>

      <div className="mt-8 space-y-6">
        {COMMON_ROWS.map((row) => (
          <FormatStatRow
            key={row.key}
            row={row}
            formats={formats}
            errors={formik.errors}
            touched={formik.touched}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
        ))}

        {!formik.values.role ? (
          <p className="rounded-2xl border border-purple/30 bg-purple/10 px-4 py-3 text-sm text-purple-100">
            Select a playing role to show batting, bowling, and related custom fields.
          </p>
        ) : null}

        {battingVisible ? (
          <section className="space-y-6">
            <h2 className="pt-2 text-lg font-semibold text-white">Batting statistics</h2>
            {BATTING_ROWS.map((row) => (
              <FormatStatRow
                key={row.key}
                row={row}
                formats={formats}
                errors={formik.errors}
                touched={formik.touched}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            ))}
            <Field
              label="Most dismissals against which bowler in International cricket?"
              required
              error={fieldError("most_dismissals_against_bowler")}
            >
              <input
                name="most_dismissals_against_bowler"
                className={inputClassName(fieldError("most_dismissals_against_bowler"))}
                value={formik.values.most_dismissals_against_bowler}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Enter player name"
              />
            </Field>
            <PairFields
              label="Batting average home vs away in Test cricket"
              leftName="batting_avg_home_test"
              rightName="batting_avg_away_test"
              leftLabel="Home"
              rightLabel="Away"
              leftValue={formik.values.batting_avg_home_test}
              rightValue={formik.values.batting_avg_away_test}
              leftError={fieldError("batting_avg_home_test")}
              rightError={fieldError("batting_avg_away_test")}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <CountryFields
              label="Batting average in India, Australia, England, South Africa in Tests"
              names={{
                India: "batting_avg_in_india_test",
                Australia: "batting_avg_in_australia_test",
                England: "batting_avg_in_england_test",
                "South Africa": "batting_avg_in_south_africa_test",
              }}
              values={formik.values}
              fieldError={fieldError}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <CountryFields
              label="Batting average vs India, Australia, England, South Africa in Tests"
              names={{
                India: "batting_avg_vs_india_test",
                Australia: "batting_avg_vs_australia_test",
                England: "batting_avg_vs_england_test",
                "South Africa": "batting_avg_vs_south_africa_test",
              }}
              values={formik.values}
              fieldError={fieldError}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <FormatStatRow
              row={BATTING_POSITION_ROW}
              formats={formats}
              errors={formik.errors}
              touched={formik.touched}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {battingCustom.map((field) => (
              <CustomFormatRow
                key={field.id}
                field={field}
                values={formik.values.custom_fields[field.id] ?? { odi: "", t20: "", test: "" }}
                onChange={(format, value) => {
                  void formik.setFieldValue(`custom_fields.${field.id}.${format}`, value);
                }}
                onDelete={() => openConfirm(setPendingDelete, field)}
              />
            ))}
          </section>
        ) : null}

        {bowlingVisible ? (
          <section className="space-y-6">
            <h2 className="pt-2 text-lg font-semibold text-white">Bowling statistics</h2>
            {BOWLING_ROWS.map((row) => (
              <FormatStatRow
                key={row.key}
                row={row}
                formats={formats}
                errors={formik.errors}
                touched={formik.touched}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            ))}
            <Field
              label="Which batter has he dismissed the most number of times?"
              error={fieldError("most_dismissed_batter")}
            >
              <input
                name="most_dismissed_batter"
                className={inputClassName(fieldError("most_dismissed_batter"))}
                value={formik.values.most_dismissed_batter}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Enter player name"
              />
            </Field>
            <PairFields
              label="Number of wickets home vs away in Test cricket"
              leftName="wickets_home_test"
              rightName="wickets_away_test"
              leftLabel="Home"
              rightLabel="Away"
              leftValue={formik.values.wickets_home_test}
              rightValue={formik.values.wickets_away_test}
              leftError={fieldError("wickets_home_test")}
              rightError={fieldError("wickets_away_test")}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <CountryFields
              label="Number of wickets vs India, Australia, England, South Africa"
              names={{
                India: "wickets_vs_india",
                Australia: "wickets_vs_australia",
                England: "wickets_vs_england",
                "South Africa": "wickets_vs_south_africa",
              }}
              values={formik.values}
              fieldError={fieldError}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <CountryFields
              label="Number of wickets in India, Australia, England, South Africa"
              names={{
                India: "wickets_in_india",
                Australia: "wickets_in_australia",
                England: "wickets_in_england",
                "South Africa": "wickets_in_south_africa",
              }}
              values={formik.values}
              fieldError={fieldError}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {bowlingCustom.map((field) => (
              <CustomFormatRow
                key={field.id}
                field={field}
                values={formik.values.custom_fields[field.id] ?? { odi: "", t20: "", test: "" }}
                onChange={(format, value) => {
                  void formik.setFieldValue(`custom_fields.${field.id}.${format}`, value);
                }}
                onDelete={() => openConfirm(setPendingDelete, field)}
              />
            ))}
          </section>
        ) : null}

        {keepingVisible ? (
          <section className="space-y-6">
            <h2 className="pt-2 text-lg font-semibold text-white">Wicketkeeping statistics</h2>
            {KEEPING_ROWS.map((row) => (
              <FormatStatRow
                key={row.key}
                row={row}
                formats={formats}
                errors={formik.errors}
                touched={formik.touched}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            ))}
            {wicketkeeperCustom.map((field) => (
              <CustomFormatRow
                key={field.id}
                field={field}
                values={formik.values.custom_fields[field.id] ?? { odi: "", t20: "", test: "" }}
                onChange={(format, value) => {
                  void formik.setFieldValue(`custom_fields.${field.id}.${format}`, value);
                }}
                onDelete={() => openConfirm(setPendingDelete, field)}
              />
            ))}
          </section>
        ) : null}

        {allRounderCustom.length > 0 ? (
          <section className="space-y-6">
            <h2 className="pt-2 text-lg font-semibold text-white">All-rounder fields</h2>
            {allRounderCustom.map((field) => (
              <CustomFormatRow
                key={field.id}
                field={field}
                values={formik.values.custom_fields[field.id] ?? { odi: "", t20: "", test: "" }}
                onChange={(format, value) => {
                  void formik.setFieldValue(`custom_fields.${field.id}.${format}`, value);
                }}
                onDelete={() => openConfirm(setPendingDelete, field)}
              />
            ))}
          </section>
        ) : null}
      </div>

      <div className="mt-8">
        <p className={labelClass}>
          Status<span className="text-red-400">*</span>
        </p>
        <p className="mb-3 text-sm text-zinc-500">Set the status of this player</p>
        <div className="grid gap-4 md:grid-cols-2">
          <StatusCard
            selected={formik.values.status === "active"}
            title="Active"
            description="Player will be available in games"
            onClick={() => formik.setFieldValue("status", "active")}
          />
          <StatusCard
            selected={formik.values.status === "inactive"}
            title="Inactive"
            description="Player will not be available in games"
            onClick={() => formik.setFieldValue("status", "inactive")}
          />
        </div>
        <ErrorText message={fieldError("status")} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/players"
          className="inline-flex h-12 items-center rounded-full border border-purple px-8 text-sm font-medium text-purple"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={formik.isSubmitting}
          className="inline-flex h-12 items-center rounded-full bg-purple px-8 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.35)] disabled:opacity-60"
        >
          {formik.isSubmitting ? "Saving..." : editing ? "Save Player" : "Add Player"}
        </button>
      </div>
    </form>
    {fieldModalOpen ? (
      <CreateFieldModal
        open
        onClose={() => setFieldModalOpen(false)}
        onCreated={ensureCustomField}
      />
    ) : null}
    <ConfirmDeleteModal
      open={Boolean(pendingDelete)}
      title="Delete custom field?"
      description={
        pendingDelete
          ? `“${pendingDelete.name}” will be removed from all players. Any saved values for this field will be deleted.`
          : ""
      }
      onClose={() => setPendingDelete(null)}
      onConfirm={async () => {
        if (!pendingDelete) return;
        await api(`/api/v1/player-fields/${pendingDelete.id}`, { method: "DELETE" });
        removeCustomField(pendingDelete);
      }}
    />
    </>
  );
}

function inputClassName(error?: string) {
  return `${inputClass} ${error ? "border-red-500/50" : "border-white/8"}`;
}

function looksLikeTeamField(name: string) {
  return /\bteams?\b/i.test(name);
}

function teamChoices(current: string) {
  const teams: string[] = COUNTRIES.map((item) => item.name);
  if (current.trim() && !teams.includes(current)) {
    return [current, ...teams];
  }
  return teams;
}

function FormatValueInput({
  name,
  value,
  placeholder,
  input,
  onChange,
  onBlur,
}: {
  name?: string;
  value: string;
  placeholder: string;
  input: "text" | "team";
  onChange: React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLSelectElement>;
}) {
  if (input === "team") {
    return (
      <span className="relative flex min-w-0 flex-1 items-center">
        <select
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className="h-full min-w-0 flex-1 appearance-none bg-transparent py-0 pl-3 pr-6 text-sm text-white outline-none"
        >
          <option value="" className="bg-[#0c0c10] px-3 py-2 text-white">
            {placeholder}
          </option>
          {teamChoices(value).map((team) => (
            <option key={team} value={team} className="bg-[#0c0c10] px-3 py-2 text-white">
              {team}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none size-4 shrink-0 text-zinc-500" />
      </span>
    );
  }

  return (
    <input
      name={name}
      className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
    />
  );
}

function FormatStatRow({
  row,
  formats,
  errors,
  touched,
  onChange,
  onBlur,
}: {
  row: FormatRow;
  formats: Record<FormatKey, FormFormat>;
  errors: unknown;
  touched: unknown;
  onChange: React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement | HTMLSelectElement>;
}) {
  const shown = row.formats ?? FORMATS;
  const cols = shown.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <div>
      <p className={labelClass}>{row.label}</p>
      <div className={`grid gap-4 ${cols}`}>
        {shown.map((format) => {
          const name = `${format}.${row.key}`;
          const raw = getIn(touched, name) ? getIn(errors, name) : undefined;
          const error = typeof raw === "string" ? raw : undefined;
          return (
            <div key={format}>
              <label className={`flex h-12 items-center rounded-full border bg-[#0c0c10] px-4 ${error ? "border-red-500/50" : "border-white/8"}`}>
                <span className="w-12 shrink-0 text-sm font-semibold text-white">
                  {FORMAT_LABELS[format]}
                </span>
                <span className="mx-3 h-5 w-px bg-white/15" />
                <FormatValueInput
                  name={name}
                  value={formats[format][row.key]}
                  placeholder={row.placeholder}
                  input={row.input ?? "text"}
                  onChange={onChange}
                  onBlur={onBlur}
                />
              </label>
              <ErrorText message={error} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PairFields({
  label,
  leftName,
  rightName,
  leftLabel,
  rightLabel,
  leftValue,
  rightValue,
  leftError,
  rightError,
  onChange,
  onBlur,
}: {
  label: string;
  leftName: string;
  rightName: string;
  leftLabel: string;
  rightLabel: string;
  leftValue: string;
  rightValue: string;
  leftError?: string;
  rightError?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
}) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <StatPill
          name={leftName}
          caption={leftLabel}
          value={leftValue}
          error={leftError}
          onChange={onChange}
          onBlur={onBlur}
        />
        <StatPill
          name={rightName}
          caption={rightLabel}
          value={rightValue}
          error={rightError}
          onChange={onChange}
          onBlur={onBlur}
        />
      </div>
    </div>
  );
}

function CountryFields({
  label,
  names,
  values,
  fieldError,
  onChange,
  onBlur,
}: {
  label: string;
  names: Record<(typeof TEST_COUNTRIES)[number], keyof PlayerFormValues>;
  values: PlayerFormValues;
  fieldError: (name: string) => string | undefined;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
}) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {TEST_COUNTRIES.map((country) => {
          const name = names[country];
          const raw = values[name];
          return (
            <StatPill
              key={country}
              name={name}
              caption={country}
              captionClass="w-28"
              value={typeof raw === "string" ? raw : ""}
              error={fieldError(name)}
              onChange={onChange}
              onBlur={onBlur}
            />
          );
        })}
      </div>
    </div>
  );
}

function StatPill({
  name,
  caption,
  captionClass = "w-16",
  value,
  error,
  onChange,
  onBlur,
}: {
  name: string;
  caption: string;
  captionClass?: string;
  value: string;
  error?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
}) {
  return (
    <div>
      <label className={`flex h-12 items-center rounded-full border bg-[#0c0c10] px-4 ${error ? "border-red-500/50" : "border-white/8"}`}>
        <span className={`${captionClass} shrink-0 text-sm font-semibold text-white`}>{caption}</span>
        <span className="mx-3 h-5 w-px bg-white/15" />
        <input
          name={name}
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="Enter value"
        />
      </label>
      <ErrorText message={error} />
    </div>
  );
}

function CustomFormatRow({
  field,
  values,
  onChange,
  onDelete,
}: {
  field: PlayerCustomField;
  values: { odi: string; t20: string; test: string };
  onChange: (format: FormatKey, value: string) => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white">{field.name}</p>
        <button
          type="button"
          aria-label={`Delete ${field.name}`}
          onClick={onDelete}
          className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:border-red-500/40 hover:text-red-400"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {FORMATS.map((format) => (
          <div key={format}>
            <label className="flex h-12 items-center rounded-full border border-white/8 bg-[#0c0c10] px-4">
              <span className="w-12 shrink-0 text-sm font-semibold text-white">{FORMAT_LABELS[format]}</span>
              <span className="mx-3 h-5 w-px bg-white/15" />
              <FormatValueInput
                value={values[format]}
                placeholder={looksLikeTeamField(field.name) ? "Select team" : "Leave empty for null"}
                input={looksLikeTeamField(field.name) ? "team" : "text"}
                onChange={(e) => onChange(format, e.target.value)}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>
        {label}
        {required ? <span className="text-red-400">*</span> : null}
      </span>
      {children}
      <ErrorText message={error} />
    </label>
  );
}

function SelectField({
  label,
  required,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: React.FocusEventHandler<HTMLSelectElement>;
  placeholder: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <Field label={label} required={required} error={error}>
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`${inputClassName(error)} appearance-none pr-10`}
        >
          <option value="">{placeholder}</option>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
      </div>
    </Field>
  );
}

function StatusCard({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-[22px] border px-5 py-5 text-left transition ${
        selected ? "border-purple bg-purple/5" : "border-white/8 bg-[#121218]"
      }`}
    >
      <span
        className={`mt-0.5 flex size-5 items-center justify-center rounded-full border ${
          selected ? "border-purple" : "border-zinc-500"
        }`}
      >
        {selected ? <span className="size-2.5 rounded-full bg-purple" /> : null}
      </span>
      <span>
        <span className="block font-semibold text-white">{title}</span>
        <span className="mt-1 block text-sm text-zinc-500">{description}</span>
      </span>
    </button>
  );
}
