export interface ConchitaAuthenticatedPrincipal {
  readonly userId: string;
  readonly authenticationMethod: string;
}

export function validateConchitaPrincipal(
  principal: ConchitaAuthenticatedPrincipal | undefined,
): string[] {
  if (!principal?.userId?.trim()) return ["AUTHENTICATED_PRINCIPAL_REQUIRED"];
  if (!principal.authenticationMethod?.trim()) return ["AUTHENTICATION_METHOD_REQUIRED"];
  return [];
}
