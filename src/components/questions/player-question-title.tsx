"use client";

import type { ChangeEventHandler, FocusEventHandler } from "react";
import { ErrorText } from "@/components/form/error-text";
import { TEST_COUNTRIES } from "@/data/cricket";
import {
  COUNTRY_NAME_TOKEN,
  fillPlayerQuestionTitle,
  FORMAT_NAME_TOKEN,
  FORMAT_QUESTION_PHRASES,
  insertCountryToken,
  insertFormatToken,
  insertPlayerNameToken,
  insertYearToken,
  PLAYER_NAME_TOKEN,
  PLAYER_QUESTION_FORMATS,
  YEAR_NAME_TOKEN,
} from "@/lib/questions";

const inputClass =
  "w-full rounded-[22px] border bg-[#0c0c10] px-5 py-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";
const labelClass = "mb-1 block text-sm font-medium text-white";

type PlayerQuestionTitleProps = {
  title: string;
  error?: string;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  onBlur: FocusEventHandler<HTMLTextAreaElement>;
  onTitleChange: (title: string) => void;
};

export function PlayerQuestionTitle({
  title,
  error,
  onChange,
  onBlur,
  onTitleChange,
}: PlayerQuestionTitleProps) {
  const hasFormat = title.includes(FORMAT_NAME_TOKEN);
  const hasCountry = title.includes(COUNTRY_NAME_TOKEN);
  const hasPlayerName = title.includes(PLAYER_NAME_TOKEN);
  const sampleCountry = TEST_COUNTRIES[0];
  const samplePlayer = "Virat Kohli";

  const previewOptions = {
    country: sampleCountry,
    playerName: samplePlayer,
  };

  const previews = hasFormat
    ? PLAYER_QUESTION_FORMATS.map((format) =>
        fillPlayerQuestionTitle(title, { ...previewOptions, format }),
      )
    : hasCountry || hasPlayerName
      ? [fillPlayerQuestionTitle(title, previewOptions)]
      : title.trim()
        ? [title]
        : [];

  return (
    <div>
      <label className="block">
        <span className={labelClass}>
          Question Title<span className="text-red-400">*</span>
        </span>
        <p className="mb-3 text-sm text-zinc-500">
          Comparison questions pick four players. Insert{" "}
          <span className="font-medium text-white">{FORMAT_NAME_TOKEN}</span> to reuse the
          template for ODIs, T20 Internationals, and Test cricket. Stats questions name one
          player: insert <span className="font-medium text-white">{PLAYER_NAME_TOKEN}</span>{" "}
          and write the format in the title if needed. Use{" "}
          <span className="font-medium text-white">{COUNTRY_NAME_TOKEN}</span> for a country
          (the player’s home country on stats questions). Use{" "}
          <span className="font-medium text-white">{YEAR_NAME_TOKEN}</span> for a debut year
          the generator fills (for example “debut in {YEAR_NAME_TOKEN}”).
        </p>
        <textarea
          name="title"
          rows={4}
          value={title}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={`e.g. What is the batting average of ${PLAYER_NAME_TOKEN} in ODIs?`}
          className={`${inputClass} resize-none ${error ? "border-red-500/50" : "border-white/8"}`}
        />
        <ErrorText message={error} />
      </label>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => onTitleChange(insertPlayerNameToken(title))}
          className="text-sm font-medium text-purple hover:underline"
        >
          Insert player name
        </button>
        <button
          type="button"
          onClick={() => onTitleChange(insertFormatToken(title))}
          className="text-sm font-medium text-purple hover:underline"
        >
          Insert format
        </button>
        <button
          type="button"
          onClick={() => onTitleChange(insertCountryToken(title))}
          className="text-sm font-medium text-purple hover:underline"
        >
          Insert country
        </button>
        <button
          type="button"
          onClick={() => onTitleChange(insertYearToken(title))}
          className="text-sm font-medium text-purple hover:underline"
        >
          Insert year
        </button>
      </div>
      {previews.length > 0 ? (
        <div className="mt-3 text-sm text-zinc-500">
          <p>Preview:</p>
          <ul className="mt-1 space-y-1 text-zinc-200">
            {hasFormat
              ? PLAYER_QUESTION_FORMATS.map((format) => (
                  <li key={format}>
                    {fillPlayerQuestionTitle(title, { ...previewOptions, format })}
                  </li>
                ))
              : previews.map((item) => (
                  <li key={item}>{item}</li>
                ))}
          </ul>
          {hasFormat || hasCountry || hasPlayerName ? null : (
            <p className="mt-2 text-zinc-500">
              Add {PLAYER_NAME_TOKEN} for a single-player stats question, or {FORMAT_NAME_TOKEN}{" "}
              so a comparison template can be used for {FORMAT_QUESTION_PHRASES.odi},{" "}
              {FORMAT_QUESTION_PHRASES.t20}, and {FORMAT_QUESTION_PHRASES.test}.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
