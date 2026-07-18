const { validationResult } = require('express-validator');
const { Issue, statuses } = require('../models');
const { reverseGeocode } = require('../utils/geocoding');
const { computePHash, findSimilarImages } = require('../utils/phash');
const { classifyImage } = require('../utils/classifier');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Generates a short, human-shareable code (e.g. "CF-7K2M9Q") a citizen can
// use to check on their report later without an account. Excludes visually
// ambiguous characters (0/O, 1/I). Checked against existing rows since the
// column has no DB-level unique constraint (added via a plain ALTER TABLE
// migration on existing installs, so it can't easily gain one retroactively).
const TRACKING_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function generateUniqueTrackingCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    let code = 'CF-';
    for (let i = 0; i < 6; i++) {
      code += TRACKING_CODE_CHARS[crypto.randomInt(TRACKING_CODE_CHARS.length)];
    }
    // eslint-disable-next-line no-await-in-loop
    const existing = await Issue.findOne({ where: { tracking_code: code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate a unique tracking code');
}

// EXIF + geo distance validation
// We use exiftool to read EXIF metadata from uploaded images (if present)
// and geolib to compute distance between EXIF GPS and device GPS.
const { ExifTool } = require('exiftool-vendored');
const exiftool = new ExifTool({ taskTimeoutMillis: 5000 });
const { getDistance } = require('geolib');

const createIssue = async (req, res, next) => {
  try {
    console.log('=== CREATE ISSUE REQUEST ===');
    console.log('Body:', req.body);
    console.log(
      'File:',
      req.file
        ? { filename: req.file.filename, size: req.file.size }
        : 'No file'
    );
    console.log('Headers:', {
      'content-type': req.headers['content-type'],
      authorization: req.headers['authorization'] ? 'Present' : 'Missing',
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, latitude, longitude, status } = req.body;

    // Convert latitude and longitude to numbers if they're strings
    let lat = parseFloat(latitude);
    let lon = parseFloat(longitude);

    console.log('Location data received:', {
      latitudeRaw: latitude,
      longitudeRaw: longitude,
      latitudeParsed: lat,
      longitudeParsed: lon,
      latitudeValid: !isNaN(lat),
      longitudeValid: !isNaN(lon),
    });

    // Validate location coordinates
    if (
      isNaN(lat) ||
      isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return res.status(400).json({
        message: `Invalid location coordinates. Latitude: ${lat}, Longitude: ${lon}`,
      });
    }

    // Handle file upload - get photo URL from uploaded file
    let photoUrl = null;
    if (req.file) {
      // Construct full URL to the uploaded image.
      // If API_HOST is set (e.g., for mobile/tunnel access), use it so the app
      // always gets a consistent, reachable URL. Otherwise fall back to req.host.
      let host = req.get('host');
      if (process.env.API_HOST) {
        host = process.env.API_HOST;
      }
      const protocol =
        process.env.API_PROTOCOL ||
        req.protocol ||
        req.headers['x-forwarded-proto'] ||
        'http';
      photoUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
      console.log('File uploaded:', { filename: req.file.filename, photoUrl });
    } else if (req.body.photo_url) {
      // Fallback to photo_url if provided (for backward compatibility)
      photoUrl = req.body.photo_url;
    }
    console.log('photoUrl final:', photoUrl);

    // Flag to mark issues that require manual review (e.g. when EXIF GPS is missing)
    let needs_review = false;

    // If user provided a remote photo URL (no uploaded file), we won't have EXIF data.
    // Mark this for manual review so admins can validate the report.
    if (!req.file && req.body.photo_url) {
      needs_review = true;
    }

    // Lets a submitter explicitly bypass EXIF/GPS metadata verification (e.g.
    // desktop browser uploads commonly strip EXIF data, which would otherwise
    // hard-block a legitimate report). Bypassing never skips fraud review —
    // it always forces needs_review so staff manually verify the photo.
    const skipMetadataCheck =
      req.body.skip_metadata_check === 'true' || req.body.skip_metadata_check === true;

    // Reverse geocode coordinates to get address
    let address = null;
    try {
      if (latitude && longitude) {
        address = await reverseGeocode(latitude, longitude);
        console.log('📍 Address resolved:', address);
      }
    } catch (geocodeError) {
      // Even if geocoding fails, we have the coordinates
      // The geocoding function already returns a fallback, but handle errors here
      console.warn('⚠️  Geocoding error:', geocodeError.message);
      address = null; // Will be set by reverseGeocode function
    }
    if (req.file && skipMetadataCheck) {
      console.log('⚠️  Metadata verification bypassed by submitter — flagging for manual review');
      needs_review = true;
    } else if (req.file) {
      const uploadedPath =
        req.file.path ||
        path.join(__dirname, '../../uploads', req.file.filename);

      try {
        // Read EXIF metadata from the uploaded file
        const exif = await exiftool.read(uploadedPath);

        // Look for various forms of GPS data
        const gpsFields = Object.keys(exif).filter((key) =>
          key.startsWith('GPS')
        );

        // ========== EXIF VALIDATION ==========
        // Accept camera photos (with Make/Model) or gallery photos (without Make/Model)
        console.log('📸 EXIF validation:');
        console.log(`   - Has EXIF data: ${!!exif}`);
        console.log(`   - EXIF keys: ${Object.keys(exif).length}`);
        console.log(`   - Camera Make: ${exif.Make || 'N/A'}`);
        console.log(`   - Camera Model: ${exif.Model || 'N/A'}`);
        console.log(`   - DateTimeOriginal: ${exif.DateTimeOriginal || 'N/A'}`);
        console.log(`   - GPS Fields: ${gpsFields.length > 0 ? 'YES' : 'NO'}`);

        // 1. REJECT if no EXIF data or only has minimal/generic fields
        // Check for meaningful EXIF data - at least one of: Make/Model (camera), DateTimeOriginal, GPS
        const hasMakeOrModel = !!(exif.Make || exif.Model);
        const hasDateTimeOriginal = !!exif.DateTimeOriginal;
        const hasGPS = gpsFields.length > 0;
        const hasSignificantExif =
          hasMakeOrModel || hasDateTimeOriginal || hasGPS;

        if (!exif || Object.keys(exif).length === 0 || !hasSignificantExif) {
          console.log('❌ EXIF validation failed:', {
            hasMakeOrModel,
            hasDateTimeOriginal,
            hasGPS,
            hasSignificantExif,
            exifKeyCount: Object.keys(exif).length,
          });
          return res.status(400).json({
            message:
              'Photo has no camera metadata. Please capture a new photo directly with your device camera or select from your device photo which has accurate location information.',
          });
        }

        // ========== DATE VALIDATION ==========
        // Try to get photo date from DateTimeOriginal (camera photos) or file date (gallery)
        let photoDate = null;
        if (exif.DateTimeOriginal) {
          try {
            const normalized = String(exif.DateTimeOriginal)
              .replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
              .replace(
                /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/,
                '$1-$2-$3T$4:$5:$6'
              );
            const parsed = new Date(normalized);
            if (!isNaN(parsed.getTime())) {
              photoDate = parsed;
            }
          } catch (e) {
            // Fall through to FileModifyDate
          }
        }

        // If no DateTimeOriginal, try FileModifyDate (for gallery photos)
        if (!photoDate && exif.FileModifyDate) {
          try {
            const normalized = String(exif.FileModifyDate)
              .replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
              .replace(
                /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/,
                '$1-$2-$3T$4:$5:$6'
              );
            const parsed = new Date(normalized);
            if (!isNaN(parsed.getTime())) {
              photoDate = parsed;
            }
          } catch (e) {
            // Fall through
          }
        }

        // 2. REJECT if no valid date can be found
        if (!photoDate) {
          return res.status(400).json({
            message:
              'Photo has no date metadata. Please capture a new photo or select one with date information.',
          });
        }

        const ageMs = Date.now() - photoDate.getTime();
        const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours for both camera and gallery

        console.log(
          `   - Photo age: ${(ageMs / 1000 / 60).toFixed(0)} minutes`
        );

        // 3. REJECT if older than 24 hours
        if (ageMs > maxAgeMs) {
          return res.status(400).json({
            message:
              'Photo is older than 24 hours. Please capture a fresh photo or select a recent one.',
          });
        }

        // ========== GPS VALIDATION ==========
        let exifLat = null;
        let exifLon = null;
        let gpsRef = { lat: 'N', lon: 'E' };
        let hasEmbeddedGPS = false;

        console.log('📍 GPS EXIF fields:', {
          GPSLatitude: exif.GPSLatitude,
          GPSLongitude: exif.GPSLongitude,
          GPSLatitudeRef: exif.GPSLatitudeRef,
          GPSLongitudeRef: exif.GPSLongitudeRef,
          GPSPosition: exif.GPSPosition,
          allGpsKeys: Object.keys(exif).filter((k) => k.includes('GPS')),
        });

        // Try multiple ways to extract GPS from EXIF
        // Method 1: Direct GPS fields (usually works)
        if (
          exif.GPSLatitude !== undefined &&
          exif.GPSLongitude !== undefined &&
          !isNaN(exif.GPSLatitude) &&
          !isNaN(exif.GPSLongitude)
        ) {
          exifLat = exif.GPSLatitude;
          exifLon = exif.GPSLongitude;
          gpsRef.lat = exif.GPSLatitudeRef || 'N';
          gpsRef.lon = exif.GPSLongitudeRef || 'E';
          hasEmbeddedGPS = true;
          console.log('   📍 Method 1: GPS found in direct EXIF fields');
        }
        // Method 2: GPSPosition string (sometimes used)
        else if (exif.GPSPosition && typeof exif.GPSPosition === 'string') {
          const coords = exif.GPSPosition.split(' ').map(Number);
          if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            exifLat = coords[0];
            exifLon = coords[1];
            hasEmbeddedGPS = true;
            console.log('   📍 Method 2: GPS position found in string format');
          }
        }
        // Method 3: Check if there are ANY GPS fields present (indicates location was recorded)
        // In this case, use device location as it's more reliable
        else if (Object.keys(exif).some((k) => k.startsWith('GPS'))) {
          console.log(
            '   📍 Method 3: GPS fields exist but coordinates are unreadable (likely binary format)'
          );
          console.log('   📍 Using device location as fallback');
          exifLat = lat;
          exifLon = lon;
          hasEmbeddedGPS = true; // Mark as having GPS info even though we're using device location
        }

        const deviceLatNum = lat;
        const deviceLonNum = lon;

        // 4. If no EXIF GPS at all, use device location (for gallery photos)
        if (!hasEmbeddedGPS) {
          console.log(
            '   📍 No GPS fields found - using device location as fallback'
          );
          exifLat = deviceLatNum;
          exifLon = deviceLonNum;
        }

        // Handle GPS coordinate formats (can be array or string or number)
        let exifLatNum = null;
        let exifLonNum = null;

        if (Array.isArray(exifLat)) {
          // GPS format: [degrees, minutes, seconds]
          exifLatNum = exifLat[0] + exifLat[1] / 60 + exifLat[2] / 3600;
          console.log('   📍 Converted array GPS latitude:', {
            exifLat,
            exifLatNum,
          });
        } else {
          exifLatNum = Number(exifLat);
        }

        if (Array.isArray(exifLon)) {
          // GPS format: [degrees, minutes, seconds]
          exifLonNum = exifLon[0] + exifLon[1] / 60 + exifLon[2] / 3600;
          console.log('   📍 Converted array GPS longitude:', {
            exifLon,
            exifLonNum,
          });
        } else {
          exifLonNum = Number(exifLon);
        }

        // Apply GPS reference directions (N/S, E/W)
        if (gpsRef.lat === 'S') exifLatNum *= -1;
        if (gpsRef.lon === 'W') exifLonNum *= -1;

        console.log('   📍 Final GPS values:', {
          exifLatNum,
          exifLonNum,
          deviceLatNum,
          deviceLonNum,
        });

        // 5. REJECT if GPS coordinates are invalid
        if (
          isNaN(exifLatNum) ||
          isNaN(exifLonNum) ||
          isNaN(deviceLatNum) ||
          isNaN(deviceLonNum)
        ) {
          return res.status(400).json({
            message:
              'Location coordinates are invalid. Please try again with valid coordinates.',
          });
        }

        const distanceMeters = getDistance(
          { latitude: exifLatNum, longitude: exifLonNum },
          { latitude: deviceLatNum, longitude: deviceLonNum }
        );

        console.log(`   📍 GPS distance: ${distanceMeters.toFixed(0)}m`);

        // 6. REJECT if photo location is more than 200m from device location
        if (distanceMeters > 200) {
          return res.status(400).json({
            message:
              `Photo was taken ${distanceMeters.toFixed(0)}m away from reported location. ` +
              `Photo GPS: (${exifLatNum.toFixed(6)}, ${exifLonNum.toFixed(6)}), ` +
              `Reported: (${deviceLatNum.toFixed(6)}, ${deviceLonNum.toFixed(6)}). ` +
              `Please use a photo taken at the exact location of the issue.`,
          });
        }
      } catch (exifErr) {
        console.error('⚠️  EXIF read error:', exifErr.message);
        return res.status(400).json({
          message:
            'Unable to read photo metadata. Please capture a new photo with your device camera.',
        });
      }
    }

    // ==================== pHash DUPLICATE DETECTION ====================
    // Compute pHash for the uploaded image and check for duplicates
    let phash = null;
    if (req.file) {
      try {
        const uploadedPath =
          req.file.path ||
          path.join(__dirname, '../../uploads', req.file.filename);

        console.log('🔍 Computing pHash for:', req.file.filename);
        phash = await computePHash(uploadedPath);
        console.log('📊 pHash computed:', phash);

        // Fetch all existing pHashes from the database
        const existingIssues = await Issue.findAll({
          attributes: ['id', 'phash'],
          where: { phash: { [require('sequelize').Op.ne]: null } },
        });

        // Find similar images (>= 90% similarity)
        const SIMILARITY_THRESHOLD = 90;
        const similarImages = findSimilarImages(
          phash,
          existingIssues,
          SIMILARITY_THRESHOLD
        );

        if (similarImages.length > 0) {
          console.warn(
            '⚠️  DUPLICATE ALERT: Image is similar to',
            similarImages.length,
            'existing image(s):'
          );
          similarImages.forEach((img) => {
            console.warn(
              `   - Issue ${img.id}: ${img.similarity.toFixed(1)}% similarity`
            );
          });

          // Mark for manual review instead of blocking
          needs_review = true;
          console.log('🚩 Issue marked for review due to image similarity');
        }
      } catch (phashErr) {
        // If pHash computation fails, log but don't block the upload
        console.warn('⚠️  pHash computation failed:', phashErr.message);
        // We don't set needs_review here - let EXIF validation handle it
      }
    }
    // ====================================================================

    const tracking_code = await generateUniqueTrackingCode();

    const issue = await Issue.create({
      title,
      description,
      photo_url: photoUrl,
      latitude,
      longitude,
      address,
      status,
      needs_review,
      phash,
      category: null,
      classification_confidence: null,
      tracking_code,
    });
    console.log('✅ Issue created successfully:', issue.id, 'tracking code:', tracking_code);
    res.status(201).json(issue);

    // ==================== CNN IMAGE CLASSIFICATION ====================
    // Classify the uploaded photo via the ml-service microservice (see
    // ml-service/) — one of 7 categories (Pothole/Garbage/Streetlight/
    // Sidewalk/Flooding/Road Sign/Other). Runs after the response is sent —
    // the classification call is network-dependent and shouldn't leave the
    // submitter's browser hanging. The issue is updated in place once done.
    if (req.file) {
      const uploadedPath =
        req.file.path ||
        path.join(__dirname, '../../uploads', req.file.filename);
      classifyImage(uploadedPath)
        .then((result) =>
          issue.update({
            category: result.category,
            classification_confidence: result.confidence,
          })
        )
        .then(() => {
          console.log(`🧠 Classified issue ${issue.id} as "${issue.category}"`);
        })
        .catch((classifyErr) => {
          console.warn('⚠️  Classification failed:', classifyErr.message);
        });
    }
    // =====================================================================
    return;
  } catch (error) {
    console.error('❌ CREATE ISSUE ERROR:', error.message);
    console.error('Stack:', error.stack);
    return next(error);
  }
};

const getIssues = async (req, res, next) => {
  try {
    const issues = await Issue.findAll({ order: [['created_at', 'DESC']] });
    return res.json(issues);
  } catch (error) {
    return next(error);
  }
};

const getIssueById = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const issue = await Issue.findByPk(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    return res.json(issue);
  } catch (error) {
    return next(error);
  }
};

const updateIssue = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    // Only enforce validation errors if there's no file upload.
    // When uploading a file, we skip strict field validation since
    // multipart form fields may not serialize the same way as JSON.
    if (!errors.isEmpty() && !req.file) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const issue = await Issue.findByPk(id);

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    // req.body may be undefined when the request is multipart/form-data
    // (for example when uploading a file only). Safely default to an
    // empty object so destructuring doesn't throw.
    const body = req.body || {};
    let { title, description, photo_url, latitude, longitude, status, department } = body;

    // When status is sent as a multipart form field, it may be a string.
    // Ensure we're comparing against the correct value.
    if (typeof status === 'string') {
      status = status.trim();
    }

    // Build updates from provided fields
    const updates = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(photo_url !== undefined && { photo_url }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
      ...(status !== undefined && { status }),
      ...(department !== undefined && { department }),
    };

    // If a file was uploaded (multipart request), construct the public URL
    // and include it in the updates. This keeps the update logic compatible
    // with both JSON and multipart/form-data requests.
    if (req.file) {
      let host = req.get('host');
      if (process.env.API_HOST) {
        host = process.env.API_HOST;
      }
      const protocol =
        process.env.API_PROTOCOL ||
        req.protocol ||
        req.headers['x-forwarded-proto'] ||
        'http';
      const uploadedUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

      // Determine if this should be stored as a resolved photo.
      // Check: (1) if status is being set to Resolved in this request,
      // or (2) if the issue is already Resolved in the database.
      const statusToCheck = status || issue.status;
      const willBeResolved = statusToCheck === 'Resolved';

      if (willBeResolved) {
        updates.resolved_photo_url = uploadedUrl;
      } else {
        updates.photo_url = uploadedUrl;

        // Re-classify only when the *original* issue photo is replaced —
        // a resolved/after photo shows the fix, not the original issue
        // type, so classifying it would produce a misleading category.
        try {
          const uploadedPath =
            req.file.path ||
            path.join(__dirname, '../../uploads', req.file.filename);
          const result = await classifyImage(uploadedPath);
          updates.category = result.category;
          updates.classification_confidence = result.confidence;
        } catch (classifyErr) {
          console.warn('⚠️  Classification failed:', classifyErr.message);
        }
      }
    }

    // Stamp resolved_at the first time an issue transitions into 'Resolved' —
    // powers the resolution-time metric on the analytics dashboard. Only set
    // once; re-resolving (or resolving via the "after" photo upload branch
    // above) never overwrites an existing timestamp.
    const finalStatus = updates.status || issue.status;
    if (finalStatus === 'Resolved' && issue.status !== 'Resolved' && !issue.resolved_at) {
      updates.resolved_at = new Date();
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: 'No updates provided' });
    }

    if (updates.status && !statuses.includes(updates.status)) {
      return res.status(400).json({ message: 'Invalid status provided' });
    }

    await issue.update(updates);
    return res.json(issue);
  } catch (error) {
    return next(error);
  }
};

// Re-runs CNN classification on an issue's existing photo on demand (e.g.
// for legacy issues predating this feature, or after a classification
// failure at upload time). Powers the "re-classify" action in the admin UI.
const reclassifyIssue = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const issue = await Issue.findByPk(id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    if (!issue.photo_url) {
      return res.status(400).json({ message: 'Issue has no photo to classify' });
    }

    let localPath;
    try {
      const { pathname } = new URL(issue.photo_url);
      if (!pathname.startsWith('/uploads/')) {
        throw new Error('Not a local upload');
      }
      localPath = path.join(
        __dirname,
        '../../uploads',
        path.basename(pathname)
      );
    } catch (parseErr) {
      return res.status(400).json({
        message: 'Photo is not a local upload and cannot be re-classified',
      });
    }

    if (!fs.existsSync(localPath)) {
      return res.status(400).json({ message: 'Photo file not found on server' });
    }

    const result = await classifyImage(localPath);
    await issue.update({
      category: result.category,
      classification_confidence: result.confidence,
    });

    // `scores` (the full per-category softmax distribution) isn't persisted
    // as a DB column — it's included here only so the admin UI's pipeline
    // visualizer can show the real output distribution, not just the winner.
    return res.json({ ...issue.toJSON(), scores: result.scores });
  } catch (error) {
    return next(error);
  }
};

// Public, no-login lookup by tracking code — powers the citizen-facing
// /track page. Returns a deliberately limited subset of fields (no exact
// lat/lng, no phash/needs_review internals) since anyone with the code can
// call this without authenticating.
const trackIssue = async (req, res, next) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ message: 'Tracking code is required' });
    }

    const issue = await Issue.findOne({
      where: { tracking_code: code.trim().toUpperCase() },
    });

    if (!issue) {
      return res.status(404).json({
        message: "We couldn't find a report with that tracking code. Double-check it and try again.",
      });
    }

    return res.json({
      tracking_code: issue.tracking_code,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      department: issue.department,
      status: issue.status,
      address: issue.address,
      photo_url: issue.photo_url,
      resolved_photo_url: issue.resolved_photo_url,
      created_at: issue.created_at,
      resolved_at: issue.resolved_at,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteIssue = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const deleted = await Issue.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
  reclassifyIssue,
  trackIssue,
  deleteIssue,
};
