# Show Admin Past Bookings on SAV/Metré

- Update booking loading in [react/src/components/Calendar.tsx](react/src/components/Calendar.tsx) to include past bookings in `bookingDetails`/`bookedTimeSlots` when the user is admin for `calendar2`/`calendar3`, while keeping creation on past days disabled.
- Adjust helpers (`isSlotBooked`, `getBookingsForDate`, related status getters) so admin can see booked states and fetch bookings for past dates on SAV/Metré; other roles continue to hide past data and cannot book past days.
- Keep edit/delete/info rendering for admin on past SAV/Metré slots/dates, ensuring UI still treats past dates as non-bookable (disabled) for new reservations; sanity-check in UI after refresh trigger.