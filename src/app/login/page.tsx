"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorText } from "@/components/form/error-text";
import { ApiError } from "@/lib/api";
import { loginSchema } from "@/validation/login";

const inputClass =
  "h-12 w-full rounded-full border bg-[#0c0c10] px-5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace("/players");
    }
  }, [ready, user, router]);

  const formik = useFormik({
    initialValues: {
      email: "admin@admin.com",
      password: "",
    },
    validationSchema: loginSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus("");
      try {
        await login(values.email.trim(), values.password);
        router.replace("/players");
      } catch (err) {
        helpers.setStatus(err instanceof ApiError ? err.message : "Could not sign in.");
      }
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[420px]">
        <p className="text-center text-[32px] font-semibold tracking-tight text-white">
          Cricket Fan
        </p>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Sign in to the admin dashboard
        </p>

        <form
          onSubmit={formik.handleSubmit}
          noValidate
          className="mt-8 rounded-[28px] bg-card p-7"
        >
          {formik.status ? (
            <p className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {formik.status}
            </p>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Enter your email"
              className={`${inputClass} px-5 ${
                formik.touched.email && formik.errors.email
                  ? "border-red-500/50"
                  : "border-white/8"
              }`}
            />
            <ErrorText message={formik.touched.email ? formik.errors.email : undefined} />
          </label>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-medium text-white">Password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Enter your password"
                className={`${inputClass} pr-12 ${
                  formik.touched.password && formik.errors.password
                    ? "border-red-500/50"
                    : "border-white/8"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <ErrorText message={formik.touched.password ? formik.errors.password : undefined} />
          </label>

          <button
            type="submit"
            disabled={formik.isSubmitting}
            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-purple text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.35)] disabled:opacity-60"
          >
            {formik.isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
