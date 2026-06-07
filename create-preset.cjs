const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dtfmjwofq',
  api_key: '593663758738956',
  api_secret: 'v-zGzIJq-Nbc6Q1N5ylRw8NdNVA'
});

async function createPreset() {
  try {
    const result = await cloudinary.api.create_upload_preset({
      name: 'dashboard_uploads',
      unsigned: true,
      folder: 'dashboard_attachments'
    });
    console.log('Preset created successfully!', result.name);
  } catch (err) {
    // If it already exists, just update it to be sure
    if (err.error && err.error.message.includes('already exists')) {
      await cloudinary.api.update_upload_preset('dashboard_uploads', {
        unsigned: true,
        folder: 'dashboard_attachments'
      });
      console.log('Preset updated successfully! dashboard_uploads');
    } else {
      console.error('Failed to create preset:', err);
    }
  }
}

createPreset();
