import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const ALLOWED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['jpeg', 'jpg', 'png'];

interface DecodedImage {
    buffer: Buffer;
    mimeType: string;
    extension: string;
}

/**
 * Decode base64 image string
 */
export function decodeBase64Image(base64String: string): DecodedImage {
    // Remove data:image/xxx;base64, prefix if present
    const matches = base64String.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);

    let buffer: Buffer;
    let extension: string;
    let mimeType: string;

    if (matches) {
        // Has data URI prefix
        extension = matches[1].toLowerCase();
        mimeType = `image/${extension}`;
        buffer = Buffer.from(matches[2], 'base64');
    } else {
        // Plain base64 string - assume jpeg
        buffer = Buffer.from(base64String, 'base64');
        extension = 'jpg';
        mimeType = 'image/jpeg';
    }

    return { buffer, mimeType, extension };
}

/**
 * Validate image format (jpeg, jpg, png only)
 */
export function validateImageFormat(mimeType: string, extension: string): boolean {
    const normalizedExt = extension.toLowerCase();
    const normalizedMime = mimeType.toLowerCase();

    return ALLOWED_FORMATS.includes(normalizedMime) && ALLOWED_EXTENSIONS.includes(normalizedExt);
}

/**
 * Save user image to user-specific folder
 */
export async function saveUserImage(userId: string, buffer: Buffer, extension: string): Promise<string> {
    // Create user folder
    const userFolder = path.join(UPLOADS_DIR, userId);

    if (!fs.existsSync(userFolder)) {
        fs.mkdirSync(userFolder, { recursive: true });
    }

    // Save image with consistent name
    const filename = `profileImage.${extension}`;
    const filepath = path.join(userFolder, filename);

    await fs.promises.writeFile(filepath, buffer);

    return filename;
}

/**
 * Delete existing user image
 */
export async function deleteUserImage(userId: string): Promise<void> {
    const userFolder = path.join(UPLOADS_DIR, userId);

    if (!fs.existsSync(userFolder)) {
        return;
    }

    // Delete all profileImage files (any extension)
    const files = await fs.promises.readdir(userFolder);

    for (const file of files) {
        if (file.startsWith('profileImage.')) {
            const filepath = path.join(userFolder, file);
            await fs.promises.unlink(filepath);
        }
    }
}

/**
 * Generate complete image URL for database storage
 */
export function generateImageUrl(userId: string, filename: string, baseUrl: string): string {
    return `${baseUrl}/uploads/${userId}/${filename}`;
}

/**
 * Process and save profile image
 * Returns the complete URL to be saved in database
 */
export async function processProfileImage(
    userId: string,
    base64String: string,
    baseUrl: string
): Promise<string> {
    // Decode base64
    const { buffer, mimeType, extension } = decodeBase64Image(base64String);

    // Validate format
    if (!validateImageFormat(mimeType, extension)) {
        throw new Error('Invalid image format. Only JPEG, JPG, and PNG are allowed.');
    }

    // Delete existing image
    await deleteUserImage(userId);

    // Save new image
    const filename = await saveUserImage(userId, buffer, extension);

    // Generate and return URL
    return generateImageUrl(userId, filename, baseUrl);
}
