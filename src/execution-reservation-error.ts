/** Classifies durable execution reservation failures without confusing storage failure with duplicate work. */
export type ExecutionReservationFailure =
  | "RESERVATION_EXISTS"
  | "RESULT_STORE_UNAVAILABLE";

export function classifyReservationFailure(error: unknown): ExecutionReservationFailure {
  if (error instanceof Error && error.message.startsWith("RESERVATION_EXISTS:")) {
    return "RESERVATION_EXISTS";
  }
  return "RESULT_STORE_UNAVAILABLE";
}
