# Booking Calendar App

A beautiful React booking calendar application with a popup form for appointment scheduling, built with **Vite** and **TypeScript**.

## Features

- 📅 Interactive calendar with date selection
- 📝 Popup booking form with validation
- 🎨 Modern, responsive UI design
- ⏰ Time slot selection
- ✅ Form validation for all fields
- 📱 Mobile-friendly design
- 🔧 Built with Vite for fast development
- 📘 Full TypeScript support with type safety

## Form Fields

The booking form includes:
- **Name** (required)
- **Email** (required, with validation)
- **Phone Number** (required, with validation)
- **Preferred Time** (required, dropdown selection)
- **Message** (optional)

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Usage

1. **Select a Date**: Click on any available date in the calendar
2. **Fill the Form**: Complete the booking form that appears in the popup
3. **Submit**: Click "Book Appointment" to submit your booking

## Project Structure

```
src/
├── components/
│   ├── Calendar.tsx         # Calendar component
│   ├── Calendar.css         # Calendar styles
│   ├── BookingModal.tsx    # Booking form modal
│   └── BookingModal.css    # Modal styles
├── App.tsx                  # Main app component
├── App.css                  # App styles
├── main.tsx                 # Entry point
└── index.css                # Global styles
```

## TypeScript Features

- **Type Safety**: Full TypeScript support with strict type checking
- **Interface Definitions**: Proper interfaces for props and data structures
- **Type Annotations**: All functions and variables are properly typed
- **React Types**: Uses React.FC and proper event typing

## Customization

You can easily customize:
- Time slots in `BookingModal.tsx`
- Calendar styling in `Calendar.css`
- Form fields by modifying `BookingModal.tsx`
- Colors and themes in the CSS files
- TypeScript interfaces for new data structures

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is open source and available under the MIT License.
