import * as Yup from "yup";

export const loginSchema = Yup.object({
  email: Yup.string().trim().required("Email is required").email("Enter a valid email"),
  password: Yup.string().required("Password is required"),
});

export type LoginFormValues = Yup.InferType<typeof loginSchema>;
