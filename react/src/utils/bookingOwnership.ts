const normalizePersonName = (value?: string | null): string =>
  (value || '').trim().split(/\s+/).join(' ').toLocaleLowerCase('fr-FR')

/**
 * Mirrors backend `is_booking_owner`: a booking belongs to the concepteur whose
 * name matches `designer_name`. UI-only convenience; the API enforces the rule.
 */
export const isBookingDesignedBy = (designerName?: string | null, userName?: string | null): boolean => {
  const user = normalizePersonName(userName)
  return user !== '' && user === normalizePersonName(designerName)
}
