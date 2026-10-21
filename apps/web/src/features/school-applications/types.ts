export type SubmitSchoolApplicationState = {
  error: string | null;
  success: string | null;
  fieldErrors: Record<string, string>;
};

export const initialSubmitSchoolApplicationState: SubmitSchoolApplicationState =
  {
    error: null,
    success: null,
    fieldErrors: {},
  };
