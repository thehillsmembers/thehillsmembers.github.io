// Removes the small preview picture (the EXIF thumbnail) that cameras and photo apps embed in a
// JPEG. When the photographer's credit is written back, libvips keeps the original's preview, which
// shows the photo before any crop, so it never belongs in this public repository.
// Only the metadata changes: the photo itself is copied byte for byte.

const SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
const SUB_DIRECTORIES = new Set([0x8769, 0x8825, 0xa005]); // Exif, GPS, Interoperability

/** @param {Buffer} jpg */
export function dropThumbnail(jpg) {
  let at = 2; // after the start-of-image marker
  while (at + 4 <= jpg.length && jpg[at] === 0xff) {
    const marker = jpg[at + 1];
    if (marker === 0xda || marker === 0xd9) break; // the image data starts: no more metadata
    const length = jpg.readUInt16BE(at + 2);
    if (marker === 0xe1 && jpg.toString('latin1', at + 4, at + 10) === 'Exif\0\0') {
      const tiff = at + 10;
      const le = jpg.toString('latin1', tiff, tiff + 2) === 'II';
      const u16 = (o) => (le ? jpg.readUInt16LE(tiff + o) : jpg.readUInt16BE(tiff + o));
      const u32 = (o) => (le ? jpg.readUInt32LE(tiff + o) : jpg.readUInt32BE(tiff + o));
      const first = u32(4);
      const link = first + 2 + u16(first) * 12;
      const preview = u32(link); // the thumbnail's directory, 0 when there is none
      if (!preview) return jpg;

      // The block is cut where the thumbnail starts, so everything else must come before it
      const fitsBefore = (directory, depth = 0) => {
        if (depth > 3 || directory + 2 > preview) return false;
        const count = u16(directory);
        if (directory + 2 + count * 12 + 4 > preview) return false;
        for (let i = 0; i < count; i++) {
          const entry = directory + 2 + i * 12;
          const tag = u16(entry);
          const bytes = (SIZES[u16(entry + 2)] ?? 1) * u32(entry + 4);
          if (SUB_DIRECTORIES.has(tag)) {
            if (!fitsBefore(u32(entry + 8), depth + 1)) return false;
          } else if (bytes > 4 && u32(entry + 8) + bytes > preview) return false;
        }
        return true;
      };
      if (!fitsBefore(first)) return jpg;

      const out = Buffer.from(jpg);
      if (le) out.writeUInt32LE(0, tiff + link);
      else out.writeUInt32BE(0, tiff + link);
      const kept = 2 + 6 + preview; // the length field, "Exif\0\0", and the block up to the thumbnail
      out.writeUInt16BE(kept, at + 2);
      return Buffer.concat([out.subarray(0, at + 2 + kept), out.subarray(at + 2 + length)]);
    }
    at += 2 + length;
  }
  return jpg;
}
