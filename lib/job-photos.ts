// Which of a ticket's photo_urls prove the work was done. Technician uploads are
// stored under "<ticketId>/" (lib/actions/photos.ts). Images a customer sent over
// Messenger or Viber are platform URLs, and a path under another ticket belongs
// to a different job, so neither counts. Import-free so it can be unit tested.

/** True for a photo uploaded to Storage for this ticket. */
export function isJobPhotoPath(ticketId: string, path: string): boolean {
  return path.startsWith(ticketId + '/')
}
