"use client";

import { useCallback, useReducer } from "react";

type SubmitState = {
  status: "idle" | "submitting" | "error" | "success";
  error: string | null;
};

type SubmitAction =
  | { type: "START" }
  | { type: "ERROR"; message: string }
  | { type: "SUCCESS" }
  | { type: "SET_ERROR"; message: string };

function reducer(state: SubmitState, action: SubmitAction): SubmitState {
  switch (action.type) {
    case "START":
      return { status: "submitting", error: null };
    case "ERROR":
    case "SET_ERROR":
      return { status: "error", error: action.message };
    case "SUCCESS":
      return { status: "success", error: null };
  }
}

export function useAuthSubmit<TPayload>(endpoint: string) {
  const [state, dispatch] = useReducer(reducer, { status: "idle", error: null });

  const submit = useCallback(
    async (payload: TPayload, onSuccess: (data: unknown) => void) => {
      dispatch({ type: "START" });
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (response.ok) {
          dispatch({ type: "SUCCESS" });
          onSuccess(data);
        } else {
          dispatch({ type: "ERROR", message: data.error || "Something went wrong. Please try again." });
        }
      } catch {
        dispatch({ type: "ERROR", message: "Something went wrong. Please try again." });
      }
    },
    [endpoint]
  );

  const setError = useCallback((message: string) => dispatch({ type: "SET_ERROR", message }), []);

  return { error: state.error, isLoading: state.status === "submitting", submit, setError };
}
