# Boatra.com Data Model Documentation

This document describes the Firestore data model for the Boatra.com application.

## Collections

### `trips`
Trip/plavba records.

**Fields:**
- `organizerId` (string): User ID of the trip organizer
- `name` (string): Trip name
- `description` (string): Trip description
- `startDate` (Timestamp): Trip start date
- `endDate` (Timestamp): Trip end date
- `startLocation` (string): Starting location
- `endLocation` (string): Ending location
- `locationName` (string, optional): Main location name displayed on location card
- `locationDescription` (string, optional): Description of the location
- `locationImageUrl` (string, optional): URL of image to display on location card
- `checkInDateTime` (Timestamp): Check-in date and time
- `checkOutDateTime` (Timestamp): Check-out date and time
- `tripStops` (array): Trip stops/route (array of objects with id, name, description, imageUrl)
- `descriptionForParticipants` (string): Description visible to participants
- `price` (number): Trip price
- `priceNote` (string): Price notes
- `deposit` (number): Deposit amount
- `status` (string): Trip status (draft, active, completed, cancelled)
- `tripId` (string): Public trip ID for joining
- `pin` (string): PIN for joining
- `maxParticipants` (number): Maximum number of participants
- `location` (string): General location
- `sourceTemplateId` (string, optional): ID of template used to create this trip
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### `participants`
Participant records linking users to trips.

**Fields:**
- `tripId` (string): Trip ID
- `userId` (string): User ID
- `role` (string): Role in trip ('participant', 'captain', 'organizer')
- `boatId` (string, optional): Assigned boat ID
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### `boats`
Boat records.

**Fields:**
- `tripId` (string): Trip ID
- `name` (string): Boat name
- `model` (string): Boat model
- `length` (string): Boat length
- `year` (number): Year of manufacture
- `cabins` (number): Number of cabins
- `capacity` (number): Maximum capacity
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### `timelineEvents`
Timeline events for trips (main checklist items).

**Fields:**
- `tripId` (string): Trip ID
- `name` (string): Event name
- `description` (string): Event description
- `type` (string): Event type ('custom', 'crewlist', 'payment')
- `date` (Timestamp, optional): Due date
- `roles` (array): Array of roles this event applies to ('organizer', 'captain', 'participant', 'all')
- `checkable` (boolean): Whether this event can be checked off
- `order` (number): Display order
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### `timelineCompletions`
Completion records for timeline events.

**Fields:**
- `eventId` (string): Timeline event ID
- `userId` (string): User ID who completed the event
- `completed` (boolean): Completion status
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### `crewlistEntries`
Crewlist entries for participants.

**Fields:**
- `tripId` (string): Trip ID
- `participantId` (string): Participant ID
- `name` (string): First name
- `surname` (string): Last name
- `nationality` (string): Nationality
- `dateOfBirth` (string): Date of birth
- `passportNumber` (string): Passport/ID number
- `contactEmail` (string): Contact email
- `contactPhone` (string): Contact phone
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### `crewlistTemplates`
Crewlist templates for trips.

**Fields:**
- `tripId` (string): Trip ID
- `fields` (array): Array of field definitions
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### `crewlistData`
Crewlist data entries (alternative structure).

**Fields:**
- `tripId` (string): Trip ID
- `boatId` (string): Boat ID
- `userId` (string): User ID
- `[dynamic fields]`: Fields defined by template
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### `boatLogs`
Boat log entries (lodní deník).

**Fields:**
- `tripId` (string): Trip ID
- `boatId` (string): Boat ID
- `date` (Timestamp): Log entry date
- `route` (string): Route description
- `engineHours` (number, optional): Engine hours
- `distanceTotal` (number, optional): Total distance in NM
- `distanceSails` (number, optional): Distance on sails in NM
- `fuel` (number, optional): Fuel percentage
- `notes` (string): Additional notes
- `locations` (array, optional): Array of location data
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### `checklistTemplates`
Checklist templates created by organizers.

**Fields:**
- `organizerId` (string): Organizer user ID
- `name` (string): Template name
- `description` (string): Template description
- `categories` (array): Array of category names
- `items` (array): Array of checklist items
  - `id` (string): Item ID
  - `text` (string): Item text
  - `category` (string): Category name
  - `required` (boolean): Whether item is required
- `isDefault` (boolean): Whether this is a default template
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### `checklistInstances`
Checklist instances assigned to trips/boats/roles.

**Fields:**
- `tripId` (string): Trip ID
- `templateId` (string): Template ID
- `boatId` (string, optional): Boat ID if assigned to boat
- `role` (string, optional): Role if assigned to role
- `userId` (string, optional): User ID if assigned to user
- `items` (array): Array of checklist items with completion status
  - `id` (string): Item ID
  - `text` (string): Item text
  - `category` (string): Category name
  - `completed` (boolean): Completion status
  - `note` (string): Optional note
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### `tripTemplates`
Trip templates for quick trip creation.

**Fields:**
- `organizerId` (string): Organizer user ID
- `name` (string): Template name
- `description` (string): Template description
- `startDate` (Timestamp, optional): Default start date
- `endDate` (Timestamp, optional): Default end date
- `location` (string): Default location
- `maxParticipants` (number, optional): Default max participants
- `sourceTripId` (string, optional): ID of trip this template was created from
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### `tripDocuments`
Documents uploaded for trips.

**Fields:**
- `tripId` (string): Trip ID
- `name` (string): Document name
- `description` (string): Document description
- `category` (string): Document category ('other', 'itinerary', 'rules', 'map', 'weather')
- `fileName` (string): Original file name
- `fileSize` (number): File size in bytes
- `fileType` (string): MIME type
- `storagePath` (string): Firebase Storage path
- `downloadURL` (string): Download URL
- `uploadedBy` (string, optional): User ID who uploaded
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

## Indexes Required

The following composite indexes may be required for efficient queries:

1. `participants`: `tripId` + `userId` (for getting participant by trip and user)
2. `participants`: `tripId` + `boatId` (for getting boat participants)
3. `participants`: `userId` + `createdAt` (for getting user participations)
4. `timelineEvents`: `tripId` + `order` (for ordered timeline events)
5. `timelineCompletions`: `eventId` + `userId` (for getting completion status)
6. `boatLogs`: `tripId` + `boatId` + `date` (for ordered boat logs)
7. `checklistTemplates`: `organizerId` + `createdAt` (for ordered templates)
8. `tripTemplates`: `organizerId` + `createdAt` (for ordered templates)
9. `tripDocuments`: `tripId` + `createdAt` (for ordered documents)

## Security Rules

See `firestore.rules` for detailed security rules. General principles:

- Organizers have full control over their trips
- Participants can read trip data and update their own records
- Captains can manage their assigned boats and logs
- All authenticated users can read public trip information
- Only organizers can create/update/delete templates and documents



