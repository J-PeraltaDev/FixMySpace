import {
  cloneElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

type FieldProps = {
  label: ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
  children: ReactElement<FieldControlProps>;
};

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "false" | "grammar" | "spelling" | "true";
};

export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const controlId = children.props.id ?? `${id}-control`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const showHint = Boolean(hint && !error);
  const describedBy = [
    children.props["aria-describedby"],
    showHint ? hintId : undefined,
    error ? errorId : undefined,
  ].filter(Boolean).join(" ");
  const childInvalid = children.props["aria-invalid"];
  const describedChild = cloneElement(children, {
    id: controlId,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": childInvalid ?? (error ? true : undefined),
  });

  return (
    <div className="field">
      <label htmlFor={controlId}>{label}</label>
      {describedChild}
      {showHint ? (
        <span className="text-xs font-medium text-slate-500" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span
          className="text-xs font-semibold text-red-600"
          id={errorId}
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
