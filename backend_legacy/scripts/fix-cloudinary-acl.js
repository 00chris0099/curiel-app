/**
 * Delete old PDFs from Cloudinary that have restrictive ACL.
 * Run once: node scripts/fix-cloudinary-acl.js
 */
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const config = require('../src/config');

cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});

async function main() {
    console.log('Cloudinary:', config.cloudinary.cloudName);

    let nextCursor = undefined;
    let total = 0;
    let deleted = 0;

    do {
        const result = await cloudinary.api.resources({
            type: 'upload',
            resource_type: 'raw',
            prefix: 'curiel/reports/',
            max_results: 100,
            next_cursor: nextCursor,
        });

        for (const resource of result.resources) {
            total++;
            try {
                await cloudinary.uploader.destroy(resource.public_id, {
                    resource_type: 'raw',
                    type: 'upload',
                });
                deleted++;
                console.log(`  deleted: ${resource.public_id}`);
            } catch (err) {
                console.error(`  FAILED: ${resource.public_id} - ${err.message}`);
            }
        }

        nextCursor = result.next_cursor;
    } while (nextCursor);

    console.log(`\nDone. ${deleted}/${total} files deleted.`);
}

main().catch((err) => {
    console.error('Script failed:', err.message);
    process.exit(1);
});
