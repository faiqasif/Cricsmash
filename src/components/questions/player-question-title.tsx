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
  PLAYER_QUESTION_FORMATS,
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
  const sampleCountry = TEST_COUNTRIES[0];

  const previews = hasFormat
    ? PLAYER_QUESTION_FORMATS.map((format) =>
        fillPlayerQuestionTitle(title, { format, country: sampleCountry }),
      )
    : hasCountry
      ? TEST_COUNTRIES.map((country) => fillPlayerQuestionTitle(title, { country }))
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
          Write the question once. Do not put ODI, T20, or Test in the text. Insert{" "}
          <span className="font-medium text-white">{FORMAT_NAME_TOKEN}</span> where the format
          should appear — the daily quiz will reuse this template once for ODIs, once for T20
          Internationals, and once for Test cricket. Use{" "}
          <span className="font-medium text-white">{COUNTRY_NAME_TOKEN}</span> for India,
          Australia, England, or South Africa.
        </p>
        <textarea
          name="title"
          rows={4}
          value={title}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={`e.g. Among these batters, who has scored the most runs in ${FORMAT_NAME_TOKEN}?`}
          className={`${inputClass} resize-none ${error ? "border-red-500/50" : "border-white/8"}`}
        />
        <ErrorText message={error} />
      </label>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
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
      </div>
      {previews.length > 0 ? (
        <div className="mt-3 text-sm text-zinc-500">
          <p>Preview:</p>
          <ul className="mt-1 space-y-1 text-zinc-200">
            {hasFormat
              ? PLAYER_QUESTION_FORMATS.map((format) => (
                  <li key={format}>
                    {fillPlayerQuestionTitle(title, { format, country: sampleCountry })}
                  </li>
                ))
              : previews.map((item) => (
                  <li key={item}>{item}</li>
                ))}
          </ul>
          {hasFormat || hasCountry ? null : (
            <p className="mt-2 text-zinc-500">
              Add {FORMAT_NAME_TOKEN} so the same template can be used for{" "}
              {FORMAT_QUESTION_PHRASES.odi}, {FORMAT_QUESTION_PHRASES.t20}, and{" "}
              {FORMAT_QUESTION_PHRASES.test}.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
