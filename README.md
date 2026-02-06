# Tus Abogados 24/7 - Legal Lead Intake CRM UI Prototype

## Overview
High-fidelity UI prototype for Tus Abogados 24/7 - a Legal Lead Intake CRM targeting the Hispanic market in the New York/New Jersey metro area. The design features a professional, franchise-style aesthetic with metallic/chrome UI elements.

## Screens Included

### 1. Dashboard / Lead Queue View
- **Stats Cards**: New leads today, matched this week, avg response time, conversion rate
- **AI Overview Card**: Real-time metric showing "Calls Handled by AI Today" (52)
- **Filter Bar**: Filter by Case Type, Geographic Segment, Status
- **Lead Table**: 
  - Lead_ID
  - Contact_Phone_Number (prominently featured with green phone icon)
  - Case_Type (with color-coded badges)
  - Geographic_Segment
  - Lead_Qualification_Score/Status
  - Time_Received
  - Actions

### 2. Individual Lead Detail View
- **Contact Information Panel**: Phone, language, case type, location, scores
- **AI Intake Summary**: Automated transcript analysis with key insights
- **Intake Notes**: Full AI transcript with case details
- **Action Buttons**:
  - Match & Hand-off to Attorney (Primary CTA - green)
  - Negotiate Lead Price (amber)
  - Flag for Human Review (purple)
  - Archive Lead (red)
- **Lead Timeline**: Visual progress tracker
- **Lead Metrics**: Call duration, language detection, sentiment analysis
- **Similar Closed Cases**: Comparable case settlements

## Design Features

### Metallic/Chrome Aesthetic
- Gradient backgrounds on buttons and cards
- Subtle inner shadows and highlights
- Glossy "shine" effect on buttons
- Professional silver/gray color palette with blue accents

### Color Palette
- **Primary Blue**: #2563eb (Trust, professionalism)
- **Success Green**: #10b981 (Actions, positive states)
- **Amber**: #f59e0b (Warnings, negotiation)
- **Purple**: #8b5cf6 (Secondary actions)
- **Red**: #ef4444 (Archive, urgent)
- **Background**: Light gray/silver gradients

### Typography
- Font: Inter (Google Fonts)
- Clean, professional hierarchy
- Monospace for Lead IDs

## Navigation

The prototype includes a floating toggle in the bottom-right corner to switch between:
- **Dashboard** - Lead queue table view
- **Lead Detail** - Individual lead view

Click on any lead row in the dashboard to view its detail page.

## Non-Functional Elements

All buttons and form elements are visual only (no backend):
- Buttons show click animations
- Action buttons display toast notifications when clicked
- Filters are styled but non-functional
- Table sorting is visual only

## How to View

Open `index.html` in any modern web browser:
```bash
open index.html
```

Or serve locally:
```bash
cd tusa-gatos-crm-ui
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## Brand Alignment

- **Tus Abogados 24/7 Brand Colors**: Navy blue (#1e3a5f) from the website
- **Hispanic Market Focus**: Spanish language support indicators
- **NY/NJ Metro**: Geographic segments reflect this area
- **Trust & Professionalism**: Clean, legal-industry appropriate design

## Tech Stack

- Pure HTML5/CSS3/JavaScript
- No frameworks or dependencies (except Google Fonts and Font Awesome icons)
- Fully responsive design
- Modern CSS features: Grid, Flexbox, Custom Properties
