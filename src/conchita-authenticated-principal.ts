export interface ConchitaAuthenticatedPrincipal {
  userId: string;
  authenticationMethod: string;
}

export function validateConchitaPrincipal(principal?: ConchitaAuthenticatedPrincipal): string[] {
  if (!principal) return ['AUTHENTICATED_PRINCIPAL_REQUIRED'];
  const blockers: string[] = [];
  if (!principal.userId?.trim()) blockers.push('AUTHENTICATED_USER_REQUIRED');
  if (!principal.authenticationMethod?.trim()) blockers.push('AUTHENTICATION_METHOD_REQUIRED');
  return blockers;
}
