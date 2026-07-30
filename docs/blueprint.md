# **App Name**: CalificApp - Innovemos Juntos

## Core Features:

- User Authentication: Secure user login with username and password, managed by Firebase Authentication. Business logic differentiates roles (Jurado, Admin, Organizer) based on a database field.
- Idea List: Display a comprehensive list of all submitted ideas. Each jurado sees the ideas that they need to rate, with status indicators showing 'pending' or 'completed'.
- Search Ideas: Enable jurados to quickly find ideas using a search bar. This filters by name or group.
- Idea Details View: Show detailed information for each idea, including its name, group, area, description, and an associated image, drawn from a URL provided by the administrator. This image URL is accessible by all roles.
- Rating Module: Allow jurados to rate ideas based on four criteria: Originality, Scalability, Impact, and Clarity. Uses a star rating system.
- Admin Idea Upload: The admin role will be able to upload lists of ideas along with image urls. These images are expected to live on a cloud storage service, but the tool must reason about how to generate the formatted upload instructions.

## Style Guidelines:

- Primary color: Vibrant rose (#EE2B7B) for headers, main buttons, interactive icons, and active status indicators, giving a sense of energy.
- Background color: Light, almost-white blue (#F0F3FF) for the general page background.
- Accent color: An analogous and desaturated violet (#746674) to highlight some page labels and hover states.
- Font: 'Poppins' (sans-serif) for a clean, modern, geometric look in titles, subtitles, menus, and labels. Note: currently only Google Fonts are supported.
- Use minimalist line icons to illustrate services and navigation functions.
- The layout will use clear visual hierarchy, and ensure all interactive elements have plenty of whitespace.